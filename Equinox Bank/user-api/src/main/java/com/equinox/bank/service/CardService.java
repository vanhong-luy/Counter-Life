package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.CardIssueRequestDTO;
import com.equinox.bank.dto.CardLimitResponseDTO;
import com.equinox.bank.dto.CardLimitUpdateRequestDTO;
import com.equinox.bank.dto.CardPurchaseRequestDTO;
import com.equinox.bank.dto.CardResponseDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.CardLimit;
import com.equinox.bank.entity.CardStatusHistory;
import com.equinox.bank.entity.CardTransaction;
import com.equinox.bank.entity.CardType;
import com.equinox.bank.entity.CreditScoreTier;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.CardLimitRepository;
import com.equinox.bank.repository.CardRepository;
import com.equinox.bank.repository.CardStatusHistoryRepository;
import com.equinox.bank.repository.CardTransactionRepository;
import com.equinox.bank.repository.CardTypeRepository;
import com.equinox.bank.repository.CreditScoreTierRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;
import com.equinox.bank.repository.TransactionCategoryRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
@Transactional(readOnly = true)
public class CardService {

    private final CardRepository cardRepository;
    private final CardTypeRepository cardTypeRepository;
    private final CardLimitRepository cardLimitRepository;
    private final CardStatusHistoryRepository cardStatusHistoryRepository;
    private final CardTransactionRepository cardTransactionRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final CreditScoreTierRepository creditScoreTierRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;

    @PersistenceContext
    private EntityManager em;

    @Autowired
    public CardService(CardRepository cardRepository, CardTypeRepository cardTypeRepository,
                       CardLimitRepository cardLimitRepository, CardStatusHistoryRepository cardStatusHistoryRepository,
                       CardTransactionRepository cardTransactionRepository,
                       AccountRepository accountRepository, CustomerRepository customerRepository,
                       TransactionRepository transactionRepository, TransactionTypeRepository transactionTypeRepository,
                       CreditScoreTierRepository creditScoreTierRepository,
                       TransactionCategoryRepository transactionCategoryRepository) {
        this.cardRepository = cardRepository;
        this.cardTypeRepository = cardTypeRepository;
        this.cardLimitRepository = cardLimitRepository;
        this.cardStatusHistoryRepository = cardStatusHistoryRepository;
        this.cardTransactionRepository = cardTransactionRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.creditScoreTierRepository = creditScoreTierRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
    }

    private Customer findCustomerByEmail(String email) {
        return customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    @Transactional
    @CacheEvict(value = "customer_cards", key = "#email")
    public CardResponseDTO issueCard(String email, CardIssueRequestDTO dto) {
        Customer customer = findCustomerByEmail(email);

        Account account = accountRepository.findById(dto.accountId())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        if (!account.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Account does not belong to customer");
        }

        CardType cardType = cardTypeRepository.findById(dto.cardTypeId())
                .orElseThrow(() -> new RuntimeException("Card type not found"));

        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            sb.append(random.nextInt(10));
        }
        String cardNumber = sb.toString();
        String cvvHash = String.format("%03d", random.nextInt(1000));

        Card card = new Card();
        card.setAccount(account);
        card.setCardType(cardType);
        card.setCardNumber(cardNumber);
        card.setExpiryDate(LocalDate.now().plusYears(4));
        card.setCvvHash(cvvHash);
        card.setIsFrozen(false);
        card.setIssuedAt(LocalDateTime.now());

        if ("credit".equalsIgnoreCase(cardType.getTypeName())) {
            BigDecimal limit = BigDecimal.valueOf(1000);
            BigDecimal apr = BigDecimal.valueOf(0.2299);
            Integer score = customer.getCreditScore();
            if (score != null) {
                CreditScoreTier tier = creditScoreTierRepository
                        .findByMinScoreLessThanEqualAndMaxScoreGreaterThanEqual(score, score)
                        .orElse(null);
                if (tier != null) {
                    limit = tier.getCreditLimit();
                    apr = tier.getApr();
                }
            }
            card.setCreditLimit(limit);
            card.setOutstandingBalance(BigDecimal.ZERO);
            card.setApr(apr);
            card.setStatementDate(LocalDate.now().plusMonths(1));
            card.setDueDate(LocalDate.now().plusMonths(1).plusDays(21));
        }

        Card savedCard = cardRepository.save(card);

        CardLimit cardLimit = new CardLimit();
        cardLimit.setCard(savedCard);
        cardLimit.setDailyLimit(BigDecimal.valueOf(1000));
        cardLimit.setMonthlyLimit(BigDecimal.valueOf(10000));
        cardLimit.setAllowInternational(false);
        cardLimit.setAllowOnline(true);
        cardLimitRepository.save(cardLimit);

        return mapToListDTO(savedCard);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_transactions", key = "#email"),
        @CacheEvict(value = "customer_accounts", key = "#email")
    })
    public Map<String, Object> debitPurchase(String email, Long cardId, BigDecimal amount, String merchant, String description) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }
        if (card.getIsFrozen()) throw new RuntimeException("Card is frozen");
        if (card.getCreditLimit() != null) throw new RuntimeException("Use credit purchase for credit cards");

        Account account = card.getAccount();
        if (account.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient funds");
        }

        // Enforce CardLimit spending caps
        CardLimit cardLimit = cardLimitRepository.findByCard(card).orElse(null);
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

        // Deduct from account
        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        // Record account Transaction first to get generated transactionId
        TransactionType tType = transactionTypeRepository.findByTypeName("debit_purchase")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName("debit_purchase");
                    return transactionTypeRepository.save(tt);
                });
        TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Card Payment")
                .orElse(null);
        Transaction txn = new Transaction();
        txn.setType(tType);
        txn.setSourceAccount(account);
        txn.setAmount(amount);
        txn.setCurrency(account.getCurrency());
        txn.setStatus("completed");
        txn.setDescription(description != null ? description : "Debit card purchase" + (merchant != null ? " at " + merchant : ""));
        String refNum = "DBT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        txn.setReferenceNumber(refNum);
        txn.setTransactionDate(OffsetDateTime.now());
        txn.setCategory(cat);
        Transaction savedTxn = transactionRepository.saveAndFlush(txn);

        // Record CardTransaction with link to savedTxn
        CardTransaction cxn = new CardTransaction();
        cxn.setCard(card);
        cxn.setAmount(amount);
        cxn.setMerchant(merchant);
        cxn.setDescription(description);
        cxn.setTransactionDate(LocalDateTime.now());
        cxn.setTransactionId(savedTxn.getTransactionId());
        cardTransactionRepository.save(cxn);

        Map<String, Object> result = new HashMap<>();
        result.put("cxnId", cxn.getCxnId());
        result.put("amount", amount);
        result.put("merchant", merchant != null ? merchant : "");
        result.put("balance", account.getBalance());
        result.put("approved", true);
        return result;
    }

    @Cacheable(value = "customer_cards", key = "#email")
    public List<CardResponseDTO> getCustomerCards(String email) {
        Customer customer = findCustomerByEmail(email);
        List<Account> accounts = accountRepository.findByCustomer(customer);
        if (accounts.isEmpty()) return List.of();
        return cardRepository.findByAccountIn(accounts).stream()
                .map(this::mapToListDTO)
                .toList();
    }

    @Cacheable(value = "customer_cards", key = "#email + ':' + #cardId")
    public CardResponseDTO getCard(String email, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }
        return mapToDetailDTO(card);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_cards", key = "#email"),
        @CacheEvict(value = "customer_cards", key = "#email + ':' + #cardId")
    })
    public CardResponseDTO freezeCard(String email, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }

        card.setIsFrozen(true);
        cardRepository.save(card);

        CardStatusHistory history = new CardStatusHistory();
        history.setCard(card);
        history.setOldStatus("active");
        history.setNewStatus("frozen");
        history.setChangedAt(LocalDateTime.now());
        cardStatusHistoryRepository.save(history);

        return mapToListDTO(card);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_cards", key = "#email"),
        @CacheEvict(value = "customer_cards", key = "#email + ':' + #cardId")
    })
    public CardResponseDTO unfreezeCard(String email, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }

        card.setIsFrozen(false);
        cardRepository.save(card);

        CardStatusHistory history = new CardStatusHistory();
        history.setCard(card);
        history.setOldStatus("frozen");
        history.setNewStatus("active");
        history.setChangedAt(LocalDateTime.now());
        cardStatusHistoryRepository.save(history);

        return mapToListDTO(card);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_cards", key = "#email"),
        @CacheEvict(value = "customer_cards", key = "#email + ':' + #cardId")
    })
    public CardResponseDTO deactivateCard(String email, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }

        card.setIsFrozen(true);
        cardRepository.save(card);

        CardStatusHistory history = new CardStatusHistory();
        history.setCard(card);
        history.setOldStatus("active");
        history.setNewStatus("deactivated");
        history.setChangedAt(LocalDateTime.now());
        cardStatusHistoryRepository.save(history);

        return mapToListDTO(card);
    }

    @Transactional
    public CardLimitResponseDTO updateCardLimits(String email, Long cardId, CardLimitUpdateRequestDTO dto) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }

        CardLimit cardLimit = cardLimitRepository.findByCard(card)
                .orElseThrow(() -> new RuntimeException("Card limit not found"));

        if (dto.dailyLimit() != null) {
            cardLimit.setDailyLimit(dto.dailyLimit());
        }
        if (dto.monthlyLimit() != null) {
            cardLimit.setMonthlyLimit(dto.monthlyLimit());
        }
        if (dto.allowInternational() != null) {
            cardLimit.setAllowInternational(dto.allowInternational());
        }
        if (dto.allowOnline() != null) {
            cardLimit.setAllowOnline(dto.allowOnline());
        }

        CardLimit saved = cardLimitRepository.save(cardLimit);
        return mapToLimitResponseDTO(saved);
    }

    public CardLimitResponseDTO getCardLimits(String email, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }

        CardLimit cardLimit = cardLimitRepository.findByCard(card)
                .orElseThrow(() -> new RuntimeException("Card limit not found"));
        return mapToLimitResponseDTO(cardLimit);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_cards", key = "#email"),
        @CacheEvict(value = "customer_cards", key = "#email + ':' + #cardId"),
        @CacheEvict(value = "customer_transactions", key = "#email"),
        @CacheEvict(value = "customer_accounts", key = "#email")
    })
    public Map<String, Object> simulatePurchase(String email, Long cardId, CardPurchaseRequestDTO dto) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }
        if (card.getIsFrozen()) {
            throw new RuntimeException("Card is frozen");
        }

        CardLimit limit = cardLimitRepository.findByCard(card)
                .orElseThrow(() -> new RuntimeException("Card limit not configured"));

        boolean isOnline = Boolean.TRUE.equals(dto.isOnline());
        boolean isInternational = Boolean.TRUE.equals(dto.isInternational());

        if (isOnline && !Boolean.TRUE.equals(limit.getAllowOnline())) {
            throw new RuntimeException("Online purchases are not allowed on this card");
        }
        if (isInternational && !Boolean.TRUE.equals(limit.getAllowInternational())) {
            throw new RuntimeException("International purchases are not allowed on this card");
        }

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        BigDecimal spentToday = cardTransactionRepository
                .findByCard_CardIdAndTransactionDateGreaterThanEqual(cardId, startOfDay)
                .stream().map(CardTransaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal spentThisMonth = cardTransactionRepository
                .findByCard_CardIdAndTransactionDateGreaterThanEqual(cardId, startOfMonth)
                .stream().map(CardTransaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (limit.getDailyLimit().compareTo(BigDecimal.ZERO) > 0
                && spentToday.add(dto.amount()).compareTo(limit.getDailyLimit()) > 0) {
            throw new RuntimeException("Daily spending limit of $" + limit.getDailyLimit() + " exceeded");
        }
        if (limit.getMonthlyLimit().compareTo(BigDecimal.ZERO) > 0
                && spentThisMonth.add(dto.amount()).compareTo(limit.getMonthlyLimit()) > 0) {
            throw new RuntimeException("Monthly spending limit of $" + limit.getMonthlyLimit() + " exceeded");
        }

        boolean isCredit = card.getCreditLimit() != null;
        if (isCredit) {
            BigDecimal available = card.getCreditLimit().subtract(card.getOutstandingBalance());
            if (available.compareTo(dto.amount()) < 0) {
                throw new RuntimeException("Insufficient credit available");
            }
            card.setOutstandingBalance(card.getOutstandingBalance().add(dto.amount()));
            cardRepository.save(card);
        } else {
            Account account = card.getAccount();
            if (account.getBalance().compareTo(dto.amount()) < 0) {
                throw new RuntimeException("Insufficient account balance");
            }
            account.setBalance(account.getBalance().subtract(dto.amount()));
            accountRepository.save(account);
        }

        StringBuilder tag = new StringBuilder();
        if (isOnline) tag.append(" [Online]");
        if (isInternational) tag.append(" [International]");

        TransactionType tType = transactionTypeRepository.findByTypeName(isCredit ? "credit_purchase" : "debit_purchase")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName(isCredit ? "credit_purchase" : "debit_purchase");
                    return transactionTypeRepository.save(tt);
                });
        TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Card Payment")
                .orElse(null);
        Transaction txn = new Transaction();
        txn.setType(tType);
        txn.setSourceAccount(card.getAccount());
        txn.setAmount(dto.amount());
        txn.setCurrency(card.getAccount().getCurrency());
        txn.setStatus("completed");
        txn.setDescription(dto.description() != null ? dto.description() : "Card purchase" + (dto.merchant() != null ? " at " + dto.merchant() : ""));
        txn.setReferenceNumber((isCredit ? "CRD-" : "DBT-") + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        txn.setTransactionDate(OffsetDateTime.now());
        txn.setCategory(cat);
        Transaction savedTxn = transactionRepository.saveAndFlush(txn);

        CardTransaction cxn = new CardTransaction();
        cxn.setCard(card);
        cxn.setAmount(dto.amount());
        cxn.setMerchant(dto.merchant());
        cxn.setDescription((dto.description() != null && !dto.description().isBlank() ? dto.description() : "Purchase") + tag);
        cxn.setTransactionDate(LocalDateTime.now());
        cxn.setTransactionId(savedTxn.getTransactionId());
        cardTransactionRepository.save(cxn);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("approved", true);
        result.put("cxnId", cxn.getCxnId());
        result.put("amount", dto.amount());
        result.put("merchant", dto.merchant() != null ? dto.merchant() : "");
        result.put("cardType", isCredit ? "credit" : "debit");
        result.put("remainingDailyLimit", limit.getDailyLimit().compareTo(BigDecimal.ZERO) > 0
                ? limit.getDailyLimit().subtract(spentToday).subtract(dto.amount()) : null);
        result.put("remainingMonthlyLimit", limit.getMonthlyLimit().compareTo(BigDecimal.ZERO) > 0
                ? limit.getMonthlyLimit().subtract(spentThisMonth).subtract(dto.amount()) : null);
        return result;
    }

    public List<Object> getCardTransactions(String email, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }
        List<CardTransaction> cxnList = cardTransactionRepository.findByCard_CardIdOrderByTransactionDateDesc(cardId);
        return mapCardTransactions(card, cxnList);
    }

    public Map<String, Object> getCardTransactionsPaginated(String email, Long cardId, int page, int size) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getAccount().getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to card");
        }
        var pageResult = cardTransactionRepository.findByCard_CardIdOrderByTransactionDateDesc(cardId, PageRequest.of(page, size));
        List<Object> items = mapCardTransactions(card, pageResult.getContent());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("totalItems", pageResult.getTotalElements());
        result.put("totalPages", pageResult.getTotalPages());
        result.put("currentPage", pageResult.getNumber());
        return result;
    }

    private List<Object> mapCardTransactions(Card card, List<CardTransaction> cxnList) {
        return cxnList.stream()
                .map(cxn -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("cxnId", cxn.getCxnId());
                    m.put("cardId", card.getCardId());
                    m.put("merchant", cxn.getMerchant() != null ? cxn.getMerchant() : "");
                    m.put("description", cxn.getDescription() != null ? cxn.getDescription() : "Card Purchase");
                    m.put("amount", cxn.getAmount());
                    m.put("status", "completed");
                    String desc = cxn.getDescription();
                    String tName;
                    if (desc != null && desc.contains("Refund")) {
                        tName = "refund";
                    } else if (desc != null && desc.contains("Late Fee")) {
                        tName = "late_fee";
                    } else if (desc != null && desc.contains("Interest Charge")) {
                        tName = "interest";
                    } else {
                        tName = card.getCreditLimit() != null ? "credit_purchase" : "debit_purchase";
                    }
                    m.put("typeName", tName);
                    m.put("transactionDate", cxn.getTransactionDate());
                    m.put("statementId", cxn.getStatementId());
                    m.put("transactionId", cxn.getTransactionId());
                    return (Object) m;
                })
                .toList();
    }

    private CardResponseDTO mapToListDTO(Card card) {
        String maskedNumber = "************" + card.getCardNumber().substring(12);
        String cardholderName = card.getAccount().getCustomer().getFirstName()
                + " " + card.getAccount().getCustomer().getLastName();
        String accountName = card.getAccount().getName() != null
                ? card.getAccount().getName()
                : card.getAccount().getAccountType().getTypeName();
        return new CardResponseDTO(
                card.getCardId(), card.getAccount().getAccountId(), accountName,
                card.getCardType().getNetwork(), card.getCardType().getTypeName(),
                maskedNumber, null, cardholderName, null,
                card.getExpiryDate(), card.getIsFrozen(), card.getIssuedAt(),
                card.getCreditLimit(), card.getOutstandingBalance(), card.getApr(),
                card.getStatementDate(), card.getDueDate());
    }

    private CardResponseDTO mapToDetailDTO(Card card) {
        String maskedNumber = "************" + card.getCardNumber().substring(12);
        String cardholderName = card.getAccount().getCustomer().getFirstName()
                + " " + card.getAccount().getCustomer().getLastName();
        String accountName = card.getAccount().getName() != null
                ? card.getAccount().getName()
                : card.getAccount().getAccountType().getTypeName();
        return new CardResponseDTO(
                card.getCardId(), card.getAccount().getAccountId(), accountName,
                card.getCardType().getNetwork(), card.getCardType().getTypeName(),
                maskedNumber, card.getCardNumber(), cardholderName, card.getCvvHash(),
                card.getExpiryDate(), card.getIsFrozen(), card.getIssuedAt(),
                card.getCreditLimit(), card.getOutstandingBalance(), card.getApr(),
                card.getStatementDate(), card.getDueDate());
    }

    private CardLimitResponseDTO mapToLimitResponseDTO(CardLimit cardLimit) {
        return new CardLimitResponseDTO(
                cardLimit.getLimitId(), cardLimit.getCard().getCardId(),
                cardLimit.getDailyLimit(), cardLimit.getMonthlyLimit(),
                cardLimit.getAllowInternational(), cardLimit.getAllowOnline());
    }
}
