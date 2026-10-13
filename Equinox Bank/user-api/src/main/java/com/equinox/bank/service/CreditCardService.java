package com.equinox.bank.service;

import com.equinox.bank.entity.*;
import com.equinox.bank.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
@Transactional(readOnly = true)
public class CreditCardService {

    private static final Logger log = LoggerFactory.getLogger(CreditCardService.class);

    private final CardRepository cardRepository;
    private final CardStatementRepository cardStatementRepository;
    private final CardTransactionRepository cardTransactionRepository;
    private final CardLimitRepository cardLimitRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final CreditLimitRequestRepository creditLimitRequestRepository;
    private final CardTypeRepository cardTypeRepository;

    @PersistenceContext
    private EntityManager em;

    public CreditCardService(CardRepository cardRepository,
                             CardStatementRepository cardStatementRepository,
                             CardTransactionRepository cardTransactionRepository,
                             CardLimitRepository cardLimitRepository,
                             AccountRepository accountRepository,
                             TransactionRepository transactionRepository,
                             TransactionTypeRepository transactionTypeRepository,
                             TransactionCategoryRepository transactionCategoryRepository,
                             CreditLimitRequestRepository creditLimitRequestRepository,
                             CardTypeRepository cardTypeRepository) {
        this.cardRepository = cardRepository;
        this.cardStatementRepository = cardStatementRepository;
        this.cardTransactionRepository = cardTransactionRepository;
        this.cardLimitRepository = cardLimitRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.creditLimitRequestRepository = creditLimitRequestRepository;
        this.cardTypeRepository = cardTypeRepository;
    }

    public Map<String, Object> getCreditCardInfo(Long cardId, String email) {
        Card card = getOwnedCard(cardId, email);
        BigDecimal available = BigDecimal.ZERO;
        if (card.getCreditLimit() != null) {
            available = card.getCreditLimit().subtract(card.getOutstandingBalance());
        }
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("cardId", card.getCardId());
        info.put("creditLimit", card.getCreditLimit());
        info.put("outstandingBalance", card.getOutstandingBalance());
        info.put("availableCredit", available);
        info.put("apr", card.getApr());
        info.put("statementDate", card.getStatementDate());
        info.put("dueDate", card.getDueDate());

        cardStatementRepository.findByCard_CardIdOrderByPeriodEndDesc(cardId); // warmup/touch if needed
        List<CreditLimitRequest> reqs = creditLimitRequestRepository.findByCard_CardIdOrderByCreatedAtDesc(cardId);
        if (!reqs.isEmpty()) {
            CreditLimitRequest latest = reqs.get(0);
            Map<String, Object> reqMap = new LinkedHashMap<>();
            reqMap.put("requestId", latest.getRequestId());
            reqMap.put("currentLimit", latest.getCurrentLimit());
            reqMap.put("requestedLimit", latest.getRequestedLimit());
            reqMap.put("reason", latest.getReason());
            reqMap.put("status", latest.getStatus());
            reqMap.put("createdAt", latest.getCreatedAt());
            info.put("activeRequest", reqMap);
        } else {
            info.put("activeRequest", null);
        }

        return info;
    }

    @Transactional
    @CacheEvict(value = "customer_transactions", key = "#email")
    public Map<String, Object> purchase(Long cardId, String email, BigDecimal amount, String merchant, String description) {
        Card card = getOwnedCard(cardId, email);
        if (card.getIsFrozen()) throw new RuntimeException("Card is frozen");
        if (card.getCreditLimit() == null) throw new RuntimeException("Not a credit card");

        BigDecimal available = card.getCreditLimit().subtract(card.getOutstandingBalance());
        if (available.compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient credit available");
        }

        // Enforce CardLimit spending caps
        CardLimit cardLimit = cardLimitRepository.findByCard(card)
                .orElse(null);
        if (cardLimit != null) {
            if (!cardLimit.getAllowOnline()) {
                throw new RuntimeException("Online purchases not allowed on this card");
            }
            LocalDateTime dayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
            LocalDateTime monthStart = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIDNIGHT);
            BigDecimal todaySpent = cardTransactionRepository.sumAmountSince(cardId, dayStart);
            BigDecimal monthSpent = cardTransactionRepository.sumAmountSince(cardId, monthStart);
            if (todaySpent.add(amount).compareTo(cardLimit.getDailyLimit()) > 0) {
                throw new RuntimeException("Daily spending limit exceeded");
            }
            if (monthSpent.add(amount).compareTo(cardLimit.getMonthlyLimit()) > 0) {
                throw new RuntimeException("Monthly spending limit exceeded");
            }
        }

        card.setOutstandingBalance(card.getOutstandingBalance().add(amount));
        cardRepository.save(card);

        TransactionType tType = transactionTypeRepository.findByTypeName("credit_purchase")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName("credit_purchase");
                    return transactionTypeRepository.save(tt);
                });
        TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Card Payment")
                .orElse(null);
        Transaction txn = new Transaction();
        txn.setType(tType);
        txn.setSourceAccount(card.getAccount());
        txn.setAmount(amount);
        txn.setCurrency(card.getAccount().getCurrency());
        txn.setStatus("completed");
        txn.setDescription(description != null ? description : "Credit card purchase" + (merchant != null ? " at " + merchant : ""));
        String refNum = "CRD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        txn.setReferenceNumber(refNum);
        txn.setTransactionDate(OffsetDateTime.now());
        txn.setCategory(cat);
        Transaction savedTxn = transactionRepository.saveAndFlush(txn);

        CardTransaction cxn = new CardTransaction();
        cxn.setCard(card);
        cxn.setAmount(amount);
        cxn.setMerchant(merchant);
        cxn.setDescription(description);
        cxn.setTransactionDate(LocalDateTime.now());
        cxn.setTransactionId(savedTxn.getTransactionId());
        cardTransactionRepository.save(cxn);

        return Map.of(
            "cxnId", cxn.getCxnId(),
            "amount", amount,
            "merchant", merchant != null ? merchant : "",
            "outstandingBalance", card.getOutstandingBalance(),
            "availableCredit", card.getCreditLimit().subtract(card.getOutstandingBalance()),
            "approved", true
        );
    }

    @Transactional
    public Map<String, Object> payCard(Long cardId, String email, Long fromAccountId, BigDecimal amount) {
        Card card = getOwnedCard(cardId, email);
        if (card.getCreditLimit() == null) throw new RuntimeException("Not a credit card");
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("Amount must be positive");
        if (amount.compareTo(card.getOutstandingBalance()) > 0) amount = card.getOutstandingBalance();

        Account fromAccount = accountRepository.findById(fromAccountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        if (!fromAccount.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Account does not belong to you");
        }
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient funds");
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        accountRepository.save(fromAccount);

        card.setOutstandingBalance(card.getOutstandingBalance().subtract(amount));
        cardRepository.save(card);

        TransactionType tType = transactionTypeRepository.findByTypeName("payment")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName("payment");
                    return transactionTypeRepository.save(tt);
                });

        TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Card Payment")
                .orElse(null);

        Transaction txn = new Transaction();
        txn.setType(tType);
        txn.setSourceAccount(fromAccount);
        txn.setTargetAccount(card.getAccount());
        txn.setAmount(amount);
        txn.setCurrency(fromAccount.getCurrency());
        txn.setStatus("completed");
        txn.setDescription("Credit card payment");
        txn.setReferenceNumber("CCP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        txn.setTransactionDate(OffsetDateTime.now());
        txn.setCategory(cat);
        transactionRepository.save(txn);

        cardStatementRepository.findByCard_CardIdOrderByPeriodEndDesc(cardId).stream()
                .filter(s -> !s.getPaid())
                .findFirst()
                .ifPresent(s -> {
                    s.setPaid(true);
                    s.setPaymentTransactionId(txn.getTransactionId());
                    cardStatementRepository.save(s);
                });

        return Map.of(
            "paid", amount,
            "remainingBalance", card.getOutstandingBalance(),
            "fromAccount", fromAccount.getAccountId()
        );
    }

    @Scheduled(cron = "0 0 3 1 * ?")
    @Transactional
    public void generateMonthlyStatements() {
        generateStatementsForDate(LocalDate.now());
    }

    @Transactional
    public void generateStatementsForDate(LocalDate now) {
        generateStatementsForCards(cardRepository.findByCreditLimitIsNotNull(), now);
    }

    @Transactional
    public void generateStatementsForCards(List<Card> creditCards, LocalDate now) {
        log.info("Generating monthly credit card statements for {} cards at {}", creditCards.size(), now);
        LocalDate periodStart = now.minusMonths(1).withDayOfMonth(1);
        LocalDate periodEnd = now.minusMonths(1).withDayOfMonth(periodStart.lengthOfMonth());

        List<CardStatement> stmts = new ArrayList<>();
        List<Card> updatedCards = new ArrayList<>();
        for (Card card : creditCards) {
            if (card.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0) continue;
            CardStatement stmt = new CardStatement();
            stmt.setCard(card);
            stmt.setPeriodStart(periodStart);
            stmt.setPeriodEnd(periodEnd);
            stmt.setDueDate(now.plusDays(21));
            stmt.setStartingBalance(card.getOutstandingBalance());
            if (card.getApr() != null && card.getApr().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal dailyRate = card.getApr().divide(BigDecimal.valueOf(365), 10, RoundingMode.HALF_UP);
                BigDecimal interest = card.getOutstandingBalance().multiply(dailyRate).multiply(BigDecimal.valueOf(30)).setScale(4, RoundingMode.HALF_UP);
                card.setOutstandingBalance(card.getOutstandingBalance().add(interest));
                updatedCards.add(card);

                CardTransaction interestCxn = new CardTransaction();
                interestCxn.setCard(card);
                interestCxn.setAmount(interest);
                interestCxn.setMerchant("Interest Charge");
                interestCxn.setDescription("Interest Charge");
                interestCxn.setTransactionDate(periodStart.atStartOfDay());
                cardTransactionRepository.save(interestCxn);

                TransactionType intType = transactionTypeRepository.findByTypeName("interest_charge")
                        .orElseGet(() -> {
                            TransactionType tt = new TransactionType();
                            tt.setTypeName("interest_charge");
                            return transactionTypeRepository.save(tt);
                        });
                TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Card Payment")
                        .orElse(null);
                Transaction intTxn = new Transaction();
                intTxn.setType(intType);
                intTxn.setSourceAccount(card.getAccount());
                intTxn.setAmount(interest);
                intTxn.setCurrency(card.getAccount().getCurrency());
                intTxn.setStatus("completed");
                intTxn.setDescription("Interest Charge on credit card");
                intTxn.setReferenceNumber("INT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                intTxn.setTransactionDate(OffsetDateTime.now());
                intTxn.setCategory(cat);
                transactionRepository.save(intTxn);
            }
            stmt.setEndingBalance(card.getOutstandingBalance());
            BigDecimal minPay = stmt.getEndingBalance().multiply(BigDecimal.valueOf(0.02)).setScale(4, RoundingMode.HALF_UP);
            if (minPay.compareTo(BigDecimal.valueOf(25)) < 0) minPay = stmt.getEndingBalance();
            stmt.setMinimumPayment(minPay);
            stmt.setPaid(false);
            
            stmt = cardStatementRepository.save(stmt);

            LocalDateTime startDt = periodStart.atStartOfDay();
            LocalDateTime endDt = periodEnd.atTime(LocalTime.MAX);
            List<CardTransaction> periodTxns = cardTransactionRepository.findByCardIdAndDateRange(card.getCardId(), startDt, endDt);
            for (CardTransaction tx : periodTxns) {
                tx.setStatementId(stmt.getStatementId());
            }
            if (!periodTxns.isEmpty()) {
                cardTransactionRepository.saveAll(periodTxns);
            }

            card.setStatementDate(now);
            card.setDueDate(stmt.getDueDate());
            if (!updatedCards.contains(card)) updatedCards.add(card);
        }
        cardRepository.saveAll(updatedCards);
        log.info("Credit card statements generated");
    }

    @Transactional
    public void assessLateFees(LocalDate now) {
        assessLateFeesForCards(cardRepository.findByCreditLimitIsNotNull(), now);
    }

    @Transactional
    public void assessLateFeesForCards(List<Card> cards, LocalDate now) {
        log.info("Assessing late fees for past-due statements on {} cards", cards.size());
        List<Long> cardIds = cards.stream().map(Card::getCardId).toList();
        List<CardStatement> pastDue = cardStatementRepository.findByPaidFalseAndDueDateBeforeAndCard_CardIdIn(now, cardIds);
        for (CardStatement stmt : pastDue) {
            Card card = stmt.getCard();
            BigDecimal lateFee = BigDecimal.ZERO;
            if (card.getCardType() != null) {
                CardType ct = cardTypeRepository.findById(card.getCardType().getCardTypeId()).orElse(null);
                if (ct != null && ct.getLateFee() != null) lateFee = ct.getLateFee();
            }
            if (lateFee.compareTo(BigDecimal.ZERO) > 0) {
                card.setOutstandingBalance(card.getOutstandingBalance().add(lateFee));
                cardRepository.save(card);

                CardTransaction feeCxn = new CardTransaction();
                feeCxn.setCard(card);
                feeCxn.setAmount(lateFee);
                feeCxn.setMerchant("Late Fee");
                feeCxn.setDescription("Late Fee");
                feeCxn.setTransactionDate(LocalDateTime.now());
                cardTransactionRepository.save(feeCxn);

                TransactionType feeType = transactionTypeRepository.findByTypeName("late_fee")
                        .orElseGet(() -> {
                            TransactionType tt = new TransactionType();
                            tt.setTypeName("late_fee");
                            return transactionTypeRepository.save(tt);
                        });
                TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Card Payment")
                        .orElse(null);
                Transaction feeTxn = new Transaction();
                feeTxn.setType(feeType);
                feeTxn.setSourceAccount(card.getAccount());
                feeTxn.setAmount(lateFee);
                feeTxn.setCurrency(card.getAccount().getCurrency());
                feeTxn.setStatus("completed");
                feeTxn.setDescription("Late Fee on credit card");
                feeTxn.setReferenceNumber("LFE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                feeTxn.setTransactionDate(OffsetDateTime.now());
                feeTxn.setCategory(cat);
                transactionRepository.save(feeTxn);

                log.info("Late fee ${} applied to card {}", lateFee, card.getCardId());
            }
        }
        log.info("Late fee assessment complete");
    }

    public List<Map<String, Object>> getStatements(Long cardId, String email) {
        Card card = getOwnedCard(cardId, email);
        return cardStatementRepository.findByCard_CardIdOrderByPeriodEndDesc(cardId).stream()
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("statementId", s.getStatementId());
                    m.put("periodStart", s.getPeriodStart());
                    m.put("periodEnd", s.getPeriodEnd());
                    m.put("dueDate", s.getDueDate());
                    m.put("startingBalance", s.getStartingBalance());
                    m.put("endingBalance", s.getEndingBalance());
                    m.put("minimumPayment", s.getMinimumPayment());
                    m.put("paid", s.getPaid());
                    
                    LocalDateTime startDt = s.getPeriodStart().atStartOfDay();
                    LocalDateTime endDt = s.getPeriodEnd().atTime(LocalTime.MAX);
                    List<CardTransaction> txns = cardTransactionRepository.findByCard_CardIdAndStatementIdOrderByTransactionDateDesc(cardId, s.getStatementId());
                    if (txns.isEmpty()) {
                        txns = cardTransactionRepository.findByCardIdAndDateRange(cardId, startDt, endDt);
                    }
                    List<Map<String, Object>> txnList = txns.stream().map(t -> {
                        Map<String, Object> tm = new LinkedHashMap<>();
                        tm.put("cxnId", t.getCxnId());
                        tm.put("amount", t.getAmount());
                        tm.put("merchant", t.getMerchant());
                        tm.put("description", t.getDescription());
                        tm.put("transactionDate", t.getTransactionDate());
                        return tm;
                    }).toList();
                    m.put("transactions", txnList);
                    return m;
                })
                .toList();
    }

    private Card getOwnedCard(Long cardId, String email) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized");
        }
        return card;
    }
}
