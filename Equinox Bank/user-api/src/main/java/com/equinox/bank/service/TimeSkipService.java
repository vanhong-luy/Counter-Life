package com.equinox.bank.service;

import com.equinox.bank.entity.*;
import com.equinox.bank.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.*;

@Service
public class TimeSkipService {

    private static final Logger log = LoggerFactory.getLogger(TimeSkipService.class);

    private static final String[] MERCHANTS = {
        "Amazon", "Walmart", "Target", "Costco", "Starbucks", "Uber", "Netflix",
        "Spotify", "Apple Store", "Best Buy", "Kroger", "Shell Gas", "Exxon",
        "McDonald's", "DoorDash", "CVS Pharmacy", "Walgreens", "Home Depot",
        "Lowes", "Macy's", "Nike Online", "Whole Foods", "Trader Joe's", "Safeway"
    };

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final AccountTypeRepository accountTypeRepository;
    private final CardRepository cardRepository;
    private final CardTransactionRepository cardTransactionRepository;
    private final CardLimitRepository cardLimitRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final LoanRepository loanRepository;
    private final TransactionRepository transactionRepository;

    private TransactionCategory cardCat;
    private TransactionCategory interestCat;
    private TransactionCategory incomeCat;
    private final TransactionTypeRepository transactionTypeRepository;
    private final CreditCardService creditCardService;
    private final CreditScoreService creditScoreService;
    private final CustomerBillRepository billRepository;

    private static final Map<String, String> BILL_TYPE_TO_CATEGORY = Map.ofEntries(
        Map.entry("Utilities", "Utilities"),
        Map.entry("Internet", "Utilities"),
        Map.entry("Subscription", "Entertainment"),
        Map.entry("Membership", "Others"),
        Map.entry("Rent", "Rent"),
        Map.entry("Insurance", "Insurance"),
        Map.entry("Loan Payment", "Others"),
        Map.entry("Credit Card", "Others"),
        Map.entry("Other", "Others")
    );

    public TimeSkipService(CustomerRepository customerRepository,
                           AccountRepository accountRepository,
                           AccountTypeRepository accountTypeRepository,
                           CardRepository cardRepository,
                           CardTransactionRepository cardTransactionRepository,
                           CardLimitRepository cardLimitRepository,
                           TransactionCategoryRepository transactionCategoryRepository,
                           LoanRepository loanRepository,
                           TransactionRepository transactionRepository,
                           TransactionTypeRepository transactionTypeRepository,
                            CreditCardService creditCardService,
                           CreditScoreService creditScoreService,
                           CustomerBillRepository billRepository) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.accountTypeRepository = accountTypeRepository;
        this.cardRepository = cardRepository;
        this.cardTransactionRepository = cardTransactionRepository;
        this.cardLimitRepository = cardLimitRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.loanRepository = loanRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.creditCardService = creditCardService;
        this.creditScoreService = creditScoreService;
        this.billRepository = billRepository;
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, allEntries = true)
    public SimulationResult simulate(String email, int months) {
        if (months <= 0 || months > 60) {
            throw new IllegalArgumentException("Months must be between 1 and 60");
        }

        long svcStart = System.nanoTime();
        log.info("Time skip START: {} months for {}", months, email);

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Pre-cache types & categories to avoid database round-trips inside monthly loops
        TransactionType interestType = getOrCreateType("interest");
        TransactionType loanInterestType = getOrCreateType("loan_interest");
        TransactionType incomeType = getOrCreateType("deposit");
        TransactionType creditPurchaseType = getOrCreateType("credit_purchase");
        TransactionType debitPurchaseType = getOrCreateType("debit_purchase");
        TransactionType transferType = getOrCreateType("transfer");
        cardCat = transactionCategoryRepository.findByCategoryName("Card Payment").orElse(null);
        interestCat = transactionCategoryRepository.findByCategoryName("Interest Payment").orElse(null);
        incomeCat = transactionCategoryRepository.findByCategoryName("Income").orElse(null);

        List<Account> accounts = accountRepository.findByCustomer(customer);
        List<Loan> loans = loanRepository.findByCustomer(customer);
        List<Card> cards = cardRepository.findByAccountIn(accounts);

        // Pre-estimate monthly income once before simulation
        BigDecimal avgIncome = estimateMonthlyIncome(customer, accounts, incomeType);

        // Pre-cache card limits to avoid DB lookups inside monthly loop
        Map<Long, CardLimit> cardLimitCache = new HashMap<>();
        for (Card card : cards) {
            cardLimitRepository.findByCard(card).ifPresent(limit -> cardLimitCache.put(card.getCardId(), limit));
        }

        // Pre-cache bill categories
        Set<String> neededCategories = new HashSet<>(BILL_TYPE_TO_CATEGORY.values());
        Map<String, TransactionCategory> categoryCache = new HashMap<>();
        for (String catName : neededCategories) {
            transactionCategoryRepository.findByCategoryName(catName).ifPresent(cat -> categoryCache.put(catName, cat));
        }

        YearMonth startMonth = YearMonth.now().plusMonths(1);
        int totalTx = 0;
        BigDecimal totalInterestEarned = BigDecimal.ZERO;
        BigDecimal totalFeesCharged = BigDecimal.ZERO;
        BigDecimal totalLoanInterest = BigDecimal.ZERO;
        BigDecimal totalIncomeGen = BigDecimal.ZERO;

        List<Transaction> txBatch = new ArrayList<>();
        List<CardTransaction> cardTxBatch = new ArrayList<>();

        for (int m = 0; m < months; m++) {
            YearMonth ym = startMonth.plusMonths(m);
            LocalDate midMonth = ym.atDay(15);
            int daysInMonth = ym.lengthOfMonth();
            LocalDate simulatedNow = ym.atEndOfMonth();
            log.info("  Month {}/{}: interest=${}, loans=${}, income=${}, txns={}",
                m + 1, months, totalInterestEarned, totalLoanInterest, totalIncomeGen, totalTx);

            for (Account account : accounts) {
                AccountType acctType = account.getAccountType();
                if ("Fixed Deposit".equals(acctType.getTypeName())) continue;

                if (acctType.getInterestRate().compareTo(BigDecimal.ZERO) > 0
                        && account.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal monthlyRate = acctType.getInterestRate()
                            .divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
                    BigDecimal interest = account.getBalance()
                            .multiply(monthlyRate)
                            .setScale(2, RoundingMode.HALF_UP);
                    if (interest.compareTo(BigDecimal.ZERO) > 0) {
                        Transaction tx = buildTx(null, account, interest, interestType,
                                "Interest Payment", midMonth.atTime(9, 0).atOffset(ZoneOffset.UTC));
                        txBatch.add(tx);
                        account.setBalance(account.getBalance().add(interest));
                        totalInterestEarned = totalInterestEarned.add(interest);
                        totalTx++;
                    }
                }
            }
            accountRepository.saveAll(accounts);

            for (Loan loan : loans) {
                String status = loan.getStatus() != null ? loan.getStatus().toLowerCase() : "";
                if (!status.equals("approved") && !status.equals("active")) continue;
                if (loan.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0) continue;

                BigDecimal monthlyRate = loan.getInterestRate()
                        .divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
                BigDecimal interest = loan.getOutstandingBalance()
                        .multiply(monthlyRate)
                        .setScale(2, RoundingMode.HALF_UP);
                if (interest.compareTo(BigDecimal.ZERO) > 0) {
                    String ref = "SIM-LNINT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    Transaction tx = new Transaction();
                    tx.setReferenceNumber(ref);
                    tx.setType(loanInterestType);
                    tx.setCategory(interestCat);
                    tx.setSourceAccount(null);
                    tx.setTargetAccount(null);
                    tx.setAmount(interest);
                    tx.setCurrency("USD");
                    tx.setStatus("completed");
                    tx.setDescription("Loan Interest Charge — " + loan.getLoanType().getTypeName());
                    tx.setTransactionDate(midMonth.atTime(12, 0).atOffset(ZoneOffset.UTC));
                    txBatch.add(tx);
                    loan.setOutstandingBalance(loan.getOutstandingBalance().add(interest));
                    totalLoanInterest = totalLoanInterest.add(interest);
                    totalTx++;
                }
            }
            if (!loans.isEmpty()) {
                loanRepository.saveAll(loans);
            }

            if (!accounts.isEmpty() && avgIncome.compareTo(BigDecimal.ZERO) > 0) {
                int payDays = 1 + new Random().nextInt(2);
                for (int p = 0; p < payDays; p++) {
                    int day = 1 + new Random().nextInt(Math.min(daysInMonth, 28));
                    BigDecimal amount = avgIncome.divide(BigDecimal.valueOf(payDays), 2, RoundingMode.HALF_UP);
                    Account target = accounts.get(p % accounts.size());
                    Transaction tx = buildTx(null, target, amount,
                            incomeType, "Direct Deposit — Payroll", ym.atDay(day).atTime(9, 0).atOffset(ZoneOffset.UTC));
                    txBatch.add(tx);
                    target.setBalance(target.getBalance().add(amount));
                    totalIncomeGen = totalIncomeGen.add(amount);
                    totalTx++;
                }
                accountRepository.saveAll(accounts);
            }

            for (Card card : cards) {
                boolean isCredit = card.getCreditLimit() != null;
                if (isCredit && card.getOutstandingBalance().compareTo(card.getCreditLimit()) >= 0) continue;
                Account acct = card.getAccount();
                if (!isCredit && acct.getBalance().compareTo(BigDecimal.valueOf(10)) < 0) continue;

                CardLimit limit = cardLimitCache.get(card.getCardId());
                if (limit == null) continue;

                int purchaseCount = 1 + new Random().nextInt(3);
                for (int p = 0; p < purchaseCount; p++) {
                    int day = 1 + new Random().nextInt(Math.min(daysInMonth, 28));
                    BigDecimal maxAmt = isCredit
                        ? card.getCreditLimit().subtract(card.getOutstandingBalance())
                        : acct.getBalance().subtract(BigDecimal.valueOf(5));
                    if (maxAmt.compareTo(BigDecimal.ONE) < 0) break;

                    BigDecimal amt = BigDecimal.valueOf(5 + new Random().nextDouble() * Math.min(maxAmt.doubleValue(), 200))
                        .setScale(2, RoundingMode.HALF_UP);
                    if (amt.compareTo(maxAmt) > 0) amt = maxAmt;
                    if (amt.compareTo(BigDecimal.ZERO) <= 0) continue;

                    String merchant = MERCHANTS[new Random().nextInt(MERCHANTS.length)];
                    boolean isOnline = new Random().nextBoolean();

                    if (isCredit) {
                        card.setOutstandingBalance(card.getOutstandingBalance().add(amt));
                    } else {
                        acct.setBalance(acct.getBalance().subtract(amt));
                    }

                    LocalDateTime txnDate = ym.atDay(day).atTime(8 + new Random().nextInt(14), new Random().nextInt(60));
                    CardTransaction cxn = new CardTransaction();
                    cxn.setCard(card);
                    cxn.setAmount(amt);
                    cxn.setMerchant(merchant);
                    cxn.setDescription("Purchase" + (isOnline ? " [Online]" : ""));
                    cxn.setTransactionDate(txnDate);
                    cardTxBatch.add(cxn);

                    Transaction txn = new Transaction();
                    txn.setType(isCredit ? creditPurchaseType : debitPurchaseType);
                    txn.setSourceAccount(acct);
                    txn.setAmount(amt);
                    txn.setCurrency("USD");
                    txn.setStatus("completed");
                    txn.setDescription("Card purchase at " + merchant);
                    txn.setReferenceNumber((isCredit ? "CRD-" : "DBT-") + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    txn.setTransactionDate(txnDate.atOffset(ZoneOffset.UTC));
                    txn.setCategory(cardCat);
                    txBatch.add(txn);
                    totalTx++;
                }
            }
            if (!cards.isEmpty()) {
                cardRepository.saveAll(cards);
                accountRepository.saveAll(accounts);
            }

            List<CustomerBill> autoPayBills = billRepository
                    .findByCustomerCustomerIdOrderByCreatedAtDesc(customer.getCustomerId()).stream()
                    .filter(b -> "ACTIVE".equals(b.getStatus()) && Boolean.TRUE.equals(b.getAutoPay()))
                    .toList();
            for (CustomerBill bill : autoPayBills) {
                if (bill.getSourceAccount() == null) continue;

                boolean shouldPay = false;
                LocalDate billDue = bill.getDueDate();
                if ("MONTHLY".equals(bill.getFrequency())) {
                    if (billDue == null) continue;
                    LocalDate thisMonthDue = billDue.withDayOfMonth(Math.min(billDue.getDayOfMonth(), simulatedNow.lengthOfMonth()));
                    if (simulatedNow.isBefore(thisMonthDue)) { shouldPay = false; }
                    else if (bill.getLastPaidAt() == null) { shouldPay = true; }
                    else { shouldPay = !YearMonth.from(bill.getLastPaidAt()).equals(ym); }
                } else if (bill.getFrequency() == null || "ONE_TIME".equalsIgnoreCase(bill.getFrequency())) {
                    if (billDue != null && simulatedNow.isBefore(billDue)) { shouldPay = false; }
                    else { shouldPay = bill.getLastPaidAt() == null; }
                } else if ("YEARLY".equals(bill.getFrequency())) {
                    if (billDue == null) continue;
                    if (bill.getLastPaidAt() == null) {
                        shouldPay = !simulatedNow.isBefore(billDue);
                    } else {
                        YearMonth lastPaidYearMonth = YearMonth.from(bill.getLastPaidAt());
                        shouldPay = lastPaidYearMonth.getYear() != ym.getYear() && !simulatedNow.isBefore(billDue);
                    }
                } else if ("WEEKLY".equals(bill.getFrequency())) {
                    if (billDue == null) continue;
                    if (bill.getLastPaidAt() == null) {
                        shouldPay = !simulatedNow.isBefore(billDue);
                    } else {
                        shouldPay = bill.getLastPaidAt().toLocalDate().plusWeeks(1).isBefore(simulatedNow) && !simulatedNow.isBefore(billDue);
                    }
                }

                if (!shouldPay) continue;

                BigDecimal amount = bill.getAmount();
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) continue;

                Account sourceAccount = bill.getSourceAccount();
                if ("Fixed Deposit".equals(sourceAccount.getAccountType().getTypeName())) continue;
                if (sourceAccount.getBalance().compareTo(amount) < 0) {
                    log.warn("Insufficient funds for auto-pay bill {} '{}': need {}, balance {}",
                            bill.getBillId(), bill.getBillerName(), amount, sourceAccount.getBalance());
                    continue;
                }

                Account targetAccount = bill.getTargetAccount();
                if (targetAccount != null) {
                    targetAccount.setBalance(targetAccount.getBalance().add(amount));
                    accountRepository.save(targetAccount);
                }

                sourceAccount.setBalance(sourceAccount.getBalance().subtract(amount));
                accountRepository.save(sourceAccount);

                String catName = BILL_TYPE_TO_CATEGORY.getOrDefault(bill.getBillType(), "Others");
                TransactionCategory category = categoryCache.get(catName);

                String desc = "Auto Pay — " + bill.getBillerName();

                Transaction tx = new Transaction();
                tx.setReferenceNumber("AUTO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                tx.setType(transferType);
                tx.setSourceAccount(sourceAccount);
                tx.setTargetAccount(targetAccount);
                tx.setAmount(amount);
                tx.setCurrency("USD");
                tx.setStatus("completed");
                tx.setDescription(desc);
                tx.setTransactionDate(simulatedNow.atTime(9, 0).atOffset(ZoneOffset.UTC));
                tx.setCategory(category);
                txBatch.add(tx);

                bill.setLastPaidAt(simulatedNow.atStartOfDay());
                billRepository.save(bill);
                totalTx++;
            }

            List<Card> customerCreditCards = cards.stream()
                    .filter(c -> c.getCreditLimit() != null)
                    .toList();
            if (!customerCreditCards.isEmpty()) {
                creditCardService.generateStatementsForCards(customerCreditCards, simulatedNow);
                creditCardService.assessLateFeesForCards(customerCreditCards, simulatedNow);
            }
        }

        // Batch save accumulated transactions & card transactions
        if (!txBatch.isEmpty()) {
            transactionRepository.saveAll(txBatch);
        }
        if (!cardTxBatch.isEmpty()) {
            cardTransactionRepository.saveAll(cardTxBatch);
        }

        // Recalculate credit score ONLY for this customer ONCE at the end
        creditScoreService.recalculateScore(customer);

        log.info("Time skip DONE for {}: {} months, {} txns, {}s",
            email, months, totalTx, (System.nanoTime() - svcStart) / 1_000_000_000);

        return new SimulationResult(months, totalInterestEarned, totalFeesCharged,
                totalLoanInterest, totalIncomeGen, totalTx);
    }

    private TransactionType getOrCreateType(String name) {
        return transactionTypeRepository.findByTypeName(name)
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName(name);
                    return transactionTypeRepository.save(tt);
                });
    }

    private Transaction buildTx(Account source, Account target, BigDecimal amount,
                                 TransactionType type, String description, OffsetDateTime date) {
        Transaction tx = new Transaction();
        tx.setReferenceNumber("SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        tx.setType(type);
        tx.setCategory(categoryForType(type));
        tx.setSourceAccount(source);
        tx.setTargetAccount(target);
        tx.setAmount(amount);
        tx.setCurrency("USD");
        tx.setStatus("completed");
        tx.setDescription(description);
        tx.setTransactionDate(date);
        return tx;
    }

    private TransactionCategory categoryForType(TransactionType type) {
        if (type == null) return null;
        return switch (type.getTypeName()) {
            case "interest", "loan_interest", "interest_charge" -> interestCat;
            case "deposit" -> incomeCat;
            default -> null;
        };
    }

    private BigDecimal estimateMonthlyIncome(Customer customer, List<Account> accounts, TransactionType depositType) {
        if (customer == null || accounts.isEmpty() || depositType == null) return BigDecimal.ZERO;

        LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        for (Account acct : accounts) {
            List<Transaction> txns = transactionRepository.findBySourceAccountOrTargetAccount(acct, acct);
            for (Transaction t : txns) {
                if (t.getType() != null && t.getType().getTypeId().equals(depositType.getTypeId())
                        && t.getTargetAccount() != null
                        && t.getTargetAccount().getAccountId().equals(acct.getAccountId())
                        && t.getTransactionDate() != null
                        && t.getTransactionDate().toLocalDate().isAfter(threeMonthsAgo)) {
                    total = total.add(t.getAmount());
                    count++;
                }
            }
        }
        if (count == 0) return BigDecimal.ZERO;
        return total.divide(BigDecimal.valueOf(Math.min(count, 6)), 2, RoundingMode.HALF_UP);
    }

    public record SimulationResult(int monthsSkipped, BigDecimal interestEarned,
                                    BigDecimal feesCharged, BigDecimal loanInterestAccrued,
                                    BigDecimal incomeGenerated, int transactionsCreated) {}
}
