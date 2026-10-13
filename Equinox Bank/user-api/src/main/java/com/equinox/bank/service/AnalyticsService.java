package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.document.MonthlyAnalyticsDocument;
import com.equinox.bank.document.MonthlyAnalyticsDocument.CategoryItem;
import com.equinox.bank.document.MonthlyAnalyticsDocument.TransactionItem;
import com.equinox.bank.dto.CategorySpendingDTO;
import com.equinox.bank.dto.SpendingSummaryDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.MonthlyAnalyticsRepository;
import com.equinox.bank.repository.TransactionRepository;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final MonthlyAnalyticsRepository analyticsRepository;

    public AnalyticsService(TransactionRepository transactionRepository,
                            AccountRepository accountRepository,
                            CustomerRepository customerRepository,
                            MonthlyAnalyticsRepository analyticsRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.analyticsRepository = analyticsRepository;
    }

    public SpendingSummaryDTO getMonthlySpendingSummary(String email,
                                                         LocalDate startDate, LocalDate endDate, Long accountId) {
        List<String> months = getMonthsInRange(startDate, endDate);
        if (months.isEmpty()) {
            return new SpendingSummaryDTO("none", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;

        // If filtering by a specific account, skip cache and go straight to PostgreSQL
        if (accountId != null) {
            Customer customer = customerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            List<Account> accounts = accountRepository.findByCustomer(customer).stream()
                    .filter(a -> a.getAccountId().equals(accountId)).collect(Collectors.toList());
            if (!accounts.isEmpty()) {
                Set<Long> ids = Set.of(accountId);
                String firstM = months.get(0);
                String lastM = months.get(months.size() - 1);
                OffsetDateTime start = YearMonth.parse(firstM).atDay(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
                OffsetDateTime end = YearMonth.parse(lastM).atEndOfMonth().atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC);
                List<Transaction> allTxns = transactionRepository.findByAccountsAndDateRange(ids, start, end);
                for (Transaction t : allTxns) {
                    Long srcId = t.getSourceAccount() != null ? t.getSourceAccount().getAccountId() : null;
                    Long tgtId = t.getTargetAccount() != null ? t.getTargetAccount().getAccountId() : null;
                    if (srcId != null && ids.contains(srcId)) totalExpenses = totalExpenses.add(t.getAmount());
                    if (tgtId != null && ids.contains(tgtId)) totalIncome = totalIncome.add(t.getAmount());
                }
            }
            String label = months.size() == 1 ? months.get(0) : (months.get(0) + "_to_" + months.get(months.size() - 1));
            return new SpendingSummaryDTO(label, totalIncome, totalExpenses, totalIncome.subtract(totalExpenses));
        }

        // All accounts: use batch MongoDB cache
        List<MonthlyAnalyticsDocument> cachedDocs = analyticsRepository.findByEmail(email);
        Map<String, MonthlyAnalyticsDocument> cacheMap = new HashMap<>();
        for (MonthlyAnalyticsDocument d : cachedDocs) cacheMap.put(d.getPeriod(), d);

        List<String> missingMonths = new ArrayList<>();
        for (String month : months) {
            MonthlyAnalyticsDocument doc = cacheMap.get(month);
            if (doc != null) {
                totalIncome = totalIncome.add(doc.getTotalIncome());
                totalExpenses = totalExpenses.add(doc.getTotalExpenses());
            } else {
                missingMonths.add(month);
            }
        }

        if (!missingMonths.isEmpty()) {
            Customer customer = customerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            List<Account> accounts = accountRepository.findByCustomer(customer);
            if (!accounts.isEmpty()) {
                Set<Long> accountIds = accounts.stream().map(Account::getAccountId).collect(Collectors.toSet());
                String firstM = missingMonths.get(0);
                String lastM = missingMonths.get(missingMonths.size() - 1);
                OffsetDateTime start = YearMonth.parse(firstM).atDay(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
                OffsetDateTime end = YearMonth.parse(lastM).atEndOfMonth().atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC);
                List<Transaction> allTxns = transactionRepository.findByAccountsAndDateRange(accountIds, start, end);
                for (Transaction t : allTxns) {
                    Long srcId = t.getSourceAccount() != null ? t.getSourceAccount().getAccountId() : null;
                    Long tgtId = t.getTargetAccount() != null ? t.getTargetAccount().getAccountId() : null;
                    if (srcId != null && accountIds.contains(srcId)) totalExpenses = totalExpenses.add(t.getAmount());
                    if (tgtId != null && accountIds.contains(tgtId)) totalIncome = totalIncome.add(t.getAmount());
                }
            }
        }

        String label = months.size() == 1 ? months.get(0) : (months.get(0) + "_to_" + months.get(months.size() - 1));
        return new SpendingSummaryDTO(label, totalIncome, totalExpenses, totalIncome.subtract(totalExpenses));
    }

    public List<CategorySpendingDTO> getSpendingByCategories(String email,
                                                              LocalDate startDate, LocalDate endDate, Long accountId) {
        List<String> months = getMonthsInRange(startDate, endDate);
        if (months.isEmpty()) return List.of();

        Map<String, CategorySpendingDTO> aggregated = new LinkedHashMap<>();

        // If filtering by account, skip cache — direct to PostgreSQL
        if (accountId != null) {
            Customer customer = customerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            List<Account> accounts = accountRepository.findByCustomer(customer).stream()
                    .filter(a -> a.getAccountId().equals(accountId)).collect(Collectors.toList());
            if (!accounts.isEmpty()) {
                Set<Long> ids = Set.of(accountId);
                String firstM = months.get(0);
                String lastM = months.get(months.size() - 1);
                OffsetDateTime start = YearMonth.parse(firstM).atDay(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
                OffsetDateTime end = YearMonth.parse(lastM).atEndOfMonth().atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC);
                List<Transaction> allTxns = transactionRepository.findByAccountsAndDateRange(ids, start, end);
                Map<String, List<Transaction>> categoryTxns = new HashMap<>();
                for (Transaction t : allTxns) {
                    Long srcId = t.getSourceAccount() != null ? t.getSourceAccount().getAccountId() : null;
                    if (srcId == null || !ids.contains(srcId)) continue;
                    categoryTxns.computeIfAbsent(inferCategoryName(t), k -> new ArrayList<>()).add(t);
                }
                List<CategorySpendingDTO> result = new ArrayList<>();
                for (Map.Entry<String, List<Transaction>> e : categoryTxns.entrySet()) {
                    BigDecimal total = e.getValue().stream()
                            .map(Transaction::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    result.add(new CategorySpendingDTO(e.getKey(), total, e.getValue().size(), toTopTransactions(e.getValue())));
                }
                result.sort((a, b) -> b.totalAmount().compareTo(a.totalAmount()));
                return result;
            }
        }

        // All accounts: use batch MongoDB cache
        List<MonthlyAnalyticsDocument> cachedDocs = analyticsRepository.findByEmail(email);
        Map<String, MonthlyAnalyticsDocument> cacheMap = new HashMap<>();
        for (MonthlyAnalyticsDocument d : cachedDocs) cacheMap.put(d.getPeriod(), d);

        List<String> missingMonths = new ArrayList<>();
        for (String month : months) {
            MonthlyAnalyticsDocument doc = cacheMap.get(month);
            if (doc == null) { missingMonths.add(month); continue; }
            for (CategoryItem cat : doc.getCategories()) {
                List<CategorySpendingDTO.TransactionSummaryItem> txns = cat.getTopTransactions().stream()
                        .map(t -> new CategorySpendingDTO.TransactionSummaryItem(
                                t.getReferenceNumber(), t.getDescription(),
                                t.getAmount(), t.getDate() != null ? t.getDate().toString() : null))
                        .collect(Collectors.toList());
                aggregated.merge(cat.getCategoryName(),
                        new CategorySpendingDTO(cat.getCategoryName(), cat.getTotalAmount(), cat.getTransactionCount(), txns),
                        (a, b) -> new CategorySpendingDTO(
                                a.categoryName(),
                                a.totalAmount().add(b.totalAmount()),
                                a.transactionCount() + b.transactionCount(),
                                mergeTopTransactions(a.topTransactions(), b.topTransactions())));
            }
        }

        if (!missingMonths.isEmpty()) {
            Customer customer = customerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            List<Account> accounts = accountRepository.findByCustomer(customer);
            if (!accounts.isEmpty()) {
                Set<Long> accountIds = accounts.stream().map(Account::getAccountId).collect(Collectors.toSet());
                String firstM = missingMonths.get(0);
                String lastM = missingMonths.get(missingMonths.size() - 1);
                OffsetDateTime start = YearMonth.parse(firstM).atDay(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
                OffsetDateTime end = YearMonth.parse(lastM).atEndOfMonth().atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC);
                List<Transaction> allTxns = transactionRepository.findByAccountsAndDateRange(accountIds, start, end);
                Map<String, List<Transaction>> fallbackTxns = new HashMap<>();
                for (Transaction t : allTxns) {
                    Long srcId = t.getSourceAccount() != null ? t.getSourceAccount().getAccountId() : null;
                    if (srcId == null || !accountIds.contains(srcId)) continue;
                    String catName = inferCategoryName(t);
                    BigDecimal amt = t.getAmount();
                    fallbackTxns.computeIfAbsent(catName, k -> new ArrayList<>()).add(t);
                    aggregated.merge(catName,
                            new CategorySpendingDTO(catName, amt, 1L, List.of()),
                            (a, b) -> new CategorySpendingDTO(a.categoryName(),
                                    a.totalAmount().add(b.totalAmount()),
                                    a.transactionCount() + b.transactionCount(),
                                    a.topTransactions()));
                }
                for (Map.Entry<String, List<Transaction>> e : fallbackTxns.entrySet()) {
                    aggregated.computeIfPresent(e.getKey(), (name, dto) -> new CategorySpendingDTO(
                            name, dto.totalAmount(), dto.transactionCount(),
                            mergeTopTransactions(dto.topTransactions(), toTopTransactions(e.getValue()))));
                }
            }
        }

        List<CategorySpendingDTO> result = new ArrayList<>(aggregated.values());
        result.sort((a, b) -> b.totalAmount().compareTo(a.totalAmount()));
        return result;
    }

    private List<CategorySpendingDTO.TransactionSummaryItem> toTopTransactions(List<Transaction> txns) {
        return txns.stream()
                .sorted((a, b) -> b.getAmount().compareTo(a.getAmount()))
                .limit(5)
                .map(t -> new CategorySpendingDTO.TransactionSummaryItem(
                        t.getReferenceNumber(), t.getDescription(), t.getAmount(),
                        t.getTransactionDate() != null ? t.getTransactionDate().toString() : null))
                .collect(Collectors.toList());
    }

    private List<CategorySpendingDTO.TransactionSummaryItem> mergeTopTransactions(
            List<CategorySpendingDTO.TransactionSummaryItem> a,
            List<CategorySpendingDTO.TransactionSummaryItem> b) {
        List<CategorySpendingDTO.TransactionSummaryItem> merged = new ArrayList<>(a);
        merged.addAll(b);
        merged.sort((x, y) -> y.amount().compareTo(x.amount()));
        return merged.size() > 5 ? merged.subList(0, 5) : merged;
    }

    public List<SpendingSummaryDTO> getIncomeVsExpense(String email,
                                                        LocalDate startDate, LocalDate endDate, Long accountId) {
        SpendingSummaryDTO summary = getMonthlySpendingSummary(email, startDate, endDate, accountId);
        return List.of(summary);
    }

    private MonthlyAnalyticsDocument getOrComputeMonth(String email, String month, Long accountId) {
        Optional<MonthlyAnalyticsDocument> existing = analyticsRepository.findByEmailAndPeriod(email, month);
        if (existing.isPresent()) {
            return existing.get();
        }
        return computeAndSaveMonth(email, month, accountId);
    }

    private synchronized MonthlyAnalyticsDocument computeAndSaveMonth(String email, String month, Long accountId) {
        // Double-check after acquiring lock
        Optional<MonthlyAnalyticsDocument> existing = analyticsRepository.findByEmailAndPeriod(email, month);
        if (existing.isPresent()) {
            return existing.get();
        }

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        List<Account> accounts = accountRepository.findByCustomer(customer);
        if (accountId != null) {
            accounts = accounts.stream()
                    .filter(a -> a.getAccountId().equals(accountId))
                    .collect(Collectors.toList());
        }

        YearMonth ym = YearMonth.parse(month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();

        Set<Long> accountIds = accounts.stream().map(Account::getAccountId).collect(Collectors.toSet());

        List<Transaction> allTransactions = transactionRepository.findByAccountsAndDateRange(
                accountIds, monthStart.atStartOfDay().atOffset(java.time.ZoneOffset.UTC),
                monthEnd.atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC));

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;
        Map<String, List<Transaction>> categoryMap = new LinkedHashMap<>();

        for (Transaction t : allTransactions) {
            OffsetDateTime txDate = t.getTransactionDate();
            if (txDate == null) continue;
            LocalDate txLocal = txDate.toLocalDate();
            if (txLocal.isBefore(monthStart) || txLocal.isAfter(monthEnd)) continue;

            Long srcId = t.getSourceAccount() != null ? t.getSourceAccount().getAccountId() : null;
            Long tgtId = t.getTargetAccount() != null ? t.getTargetAccount().getAccountId() : null;

            boolean isExpense = srcId != null && accountIds.contains(srcId);
            boolean isIncome = tgtId != null && accountIds.contains(tgtId);

            if (isExpense) {
                totalExpenses = totalExpenses.add(t.getAmount());
                String catName = inferCategoryName(t);
                categoryMap.computeIfAbsent(catName, k -> new ArrayList<>()).add(t);
            }
            if (isIncome) {
                totalIncome = totalIncome.add(t.getAmount());
            }
        }

        List<CategoryItem> categories = new ArrayList<>();
        for (Map.Entry<String, List<Transaction>> entry : categoryMap.entrySet()) {
            List<Transaction> txns = entry.getValue();
            long count = txns.size();
            BigDecimal catTotal = txns.stream()
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<TransactionItem> topTxns = txns.stream()
                    .sorted((a, b) -> b.getAmount().compareTo(a.getAmount()))
                    .limit(5)
                    .map(t -> new TransactionItem(
                            t.getReferenceNumber(),
                            t.getDescription(),
                            t.getAmount(),
                            t.getTransactionDate().toLocalDateTime()))
                    .collect(Collectors.toList());

            categories.add(new CategoryItem(entry.getKey(), catTotal, count, topTxns));
        }

        MonthlyAnalyticsDocument doc = new MonthlyAnalyticsDocument(
                email, month, totalIncome, totalExpenses,
                totalIncome.subtract(totalExpenses), categories);

        try {
            analyticsRepository.save(doc);
            log.info("Computed and saved analytics for {} / {}", email, month);
        } catch (Exception e) {
            log.error("Failed to save analytics document: {}", e.getMessage());
        }

        return doc;
    }

    private List<String> getMonthsInRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null && endDate == null) {
            return List.of(YearMonth.now().toString());
        }
        LocalDate start = startDate != null ? startDate : LocalDate.of(2000, 1, 1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<String> months = new ArrayList<>();
        YearMonth current = YearMonth.from(start);
        YearMonth endYm = YearMonth.from(end);
        while (!current.isAfter(endYm)) {
            months.add(current.toString());
            current = current.plusMonths(1);
        }
        return months;
    }

    private String inferCategoryName(Transaction t) {
        if (t.getCategory() != null) return t.getCategory().getCategoryName();
        String typeName = t.getType() != null ? t.getType().getTypeName() : null;
        if (typeName == null) return "Others";
        return switch (typeName) {
            case "credit_purchase", "debit_purchase" -> "Card Payment";
            case "loan_interest", "interest_charge" -> "Interest Payment";
            case "interest" -> "Interest Payment";
            case "late_fee" -> "Card Payment";
            case "transfer" -> "Others";
            case "deposit" -> "Income";
            case "withdrawal" -> "Others";
            case "loan_repayment" -> "Others";
            case "savings_goal_deposit", "savings_goal_withdrawal" -> "Savings Goal";
            default -> "Others";
        };
    }
}