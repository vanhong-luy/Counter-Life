package com.equinox.admin.service;

import com.equinox.admin.dto.SystemAnalyticsDTO;
import com.equinox.admin.dto.SystemAnalyticsDTO.*;
import com.equinox.admin.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SystemAnalyticsService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final LoanRepository loanRepository;
    private final CardRepository cardRepository;
    private final CardStatementRepository cardStatementRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final CreditScoreTierRepository creditScoreTierRepository;

    @PersistenceContext
    private EntityManager em;

    public SystemAnalyticsService(AccountRepository accountRepository,
                                   CustomerRepository customerRepository,
                                   TransactionRepository transactionRepository,
                                   LoanRepository loanRepository,
                                   CardRepository cardRepository,
                                   CardStatementRepository cardStatementRepository,
                                   SavingsGoalRepository savingsGoalRepository,
                                   CreditScoreTierRepository creditScoreTierRepository) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.loanRepository = loanRepository;
        this.cardRepository = cardRepository;
        this.cardStatementRepository = cardStatementRepository;
        this.savingsGoalRepository = savingsGoalRepository;
        this.creditScoreTierRepository = creditScoreTierRepository;
    }

    @Cacheable("cache:system_analytics")
    public SystemAnalyticsDTO getAnalytics() {
        LocalDate now = LocalDate.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        LocalDateTime todayStart = now.atStartOfDay();

        SystemOverview overview = buildOverview();
        AccountAnalytics accounts = buildAccountAnalytics();
        TransactionAnalytics transactions = buildTransactionAnalytics(todayStart, monthStart);
        SpendingAnalytics spending = buildSpendingAnalytics(monthStart);
        LoanAnalytics loans = buildLoanAnalytics();
        CreditCardAnalytics creditCards = buildCreditCardAnalytics();
        SavingsGoalAnalytics savingsGoals = buildSavingsGoalAnalytics();
        CustomerAnalytics customers = buildCustomerAnalytics();
        List<MonthlyTrend> trends = buildMonthlyTrends();

        return new SystemAnalyticsDTO(overview, accounts, transactions, spending, loans, creditCards, savingsGoals, customers, trends);
    }

    private SystemOverview buildOverview() {
        long totalCustomers = customerRepository.count();
        long totalAccounts = accountRepository.count();
        long totalTransactions = transactionRepository.count();
        BigDecimal totalDeposits = transactionRepository.sumCompletedDeposits();
        BigDecimal totalWithdrawals = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery(
                        "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t JOIN transaction_types tt ON t.type_id = tt.type_id WHERE tt.type_name = 'withdrawal' AND t.status = 'completed'")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        long activeLoans = loanRepository.countByStatus("active");
        BigDecimal totalLoanOutstanding = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(outstanding_balance), 0) FROM loans WHERE status = 'active'")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal totalCreditCardDebt = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(outstanding_balance), 0) FROM cards WHERE credit_limit IS NOT NULL")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal totalSavingsGoalFunds = savingsGoalRepository.sumCurrentAmount();

        return new SystemOverview(totalCustomers, totalAccounts, totalTransactions,
                totalDeposits, totalWithdrawals, activeLoans, totalLoanOutstanding,
                totalCreditCardDebt, totalSavingsGoalFunds);
    }

    private AccountAnalytics buildAccountAnalytics() {
        long totalAccounts = accountRepository.count();
        long activeAccounts = accountRepository.countByStatus("active");
        long frozenAccounts = 0;
        BigDecimal totalBalance = accountRepository.sumActiveBalances();
        BigDecimal avgBalance = activeAccounts > 0 ? totalBalance.divide(BigDecimal.valueOf(activeAccounts), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        List<AccountAnalytics.TypeBreakdown> byType = accountRepository.aggregateByType().stream()
                .map(r -> new AccountAnalytics.TypeBreakdown((String) r[0], (Long) r[1], (BigDecimal) r[2]))
                .toList();
        return new AccountAnalytics(totalAccounts, activeAccounts, frozenAccounts, totalBalance, avgBalance, byType);
    }

    @SuppressWarnings("unchecked")
    private TransactionAnalytics buildTransactionAnalytics(LocalDateTime todayStart, LocalDateTime monthStart) {
        long totalTransactions = transactionRepository.count();
        BigDecimal totalVolume = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'completed'")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal avgTx = totalTransactions > 0 ? totalVolume.divide(BigDecimal.valueOf(totalTransactions), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        long todayCount = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM transactions WHERE transaction_date >= :since")
                .setParameter("since", todayStart).getSingleResult()).longValue();
        BigDecimal todayVolume = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'completed' AND transaction_date >= :since")
                        .setParameter("since", todayStart).getSingleResult()).orElse(BigDecimal.ZERO);
        long monthCount = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM transactions WHERE transaction_date >= :since")
                .setParameter("since", monthStart).getSingleResult()).longValue();
        BigDecimal monthVolume = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'completed' AND transaction_date >= :since")
                        .setParameter("since", monthStart).getSingleResult()).orElse(BigDecimal.ZERO);
        long pendingCount = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM transactions WHERE status = 'pending'").getSingleResult()).longValue();
        long completedCount = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM transactions WHERE status = 'completed'").getSingleResult()).longValue();
        long failedCount = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM transactions WHERE status = 'failed'").getSingleResult()).longValue();

        return new TransactionAnalytics(totalTransactions, totalVolume, avgTx,
                todayCount, todayVolume, monthCount, monthVolume,
                pendingCount, completedCount, failedCount);
    }

    @SuppressWarnings("unchecked")
    private SpendingAnalytics buildSpendingAnalytics(LocalDateTime since) {
        BigDecimal totalSpent = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery(
                        "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t JOIN transaction_types tt ON t.type_id = tt.type_id WHERE tt.type_name IN ('withdrawal', 'debit_purchase', 'credit_purchase') AND t.status = 'completed' AND t.transaction_date >= :since")
                        .setParameter("since", since).getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal totalIncome = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery(
                        "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t JOIN transaction_types tt ON t.type_id = tt.type_id WHERE tt.type_name IN ('deposit', 'refund') AND t.status = 'completed' AND t.transaction_date >= :since")
                        .setParameter("since", since).getSingleResult()).orElse(BigDecimal.ZERO);

        List<Object[]> rows = em.createNativeQuery(
                "SELECT COALESCE(tc.category_name, 'Uncategorized'), COALESCE(SUM(t.amount), 0), COUNT(t.transaction_id) " +
                "FROM transactions t " +
                "LEFT JOIN transaction_categories tc ON t.category_id = tc.category_id " +
                "JOIN transaction_types tt ON t.type_id = tt.type_id " +
                "WHERE tt.type_name IN ('withdrawal', 'debit_purchase', 'credit_purchase') " +
                "AND t.status = 'completed' AND t.transaction_date >= :since " +
                "GROUP BY tc.category_name ORDER BY SUM(t.amount) DESC")
                .setParameter("since", since).getResultList();

        List<SpendingAnalytics.CategoryBreakdown> byCat = rows.stream()
                .map(r -> new SpendingAnalytics.CategoryBreakdown(
                        (String) r[0], (BigDecimal) r[1], ((Number) r[2]).longValue()))
                .toList();

        return new SpendingAnalytics(totalSpent, totalIncome, totalIncome.subtract(totalSpent), byCat);
    }

    @SuppressWarnings("unchecked")
    private LoanAnalytics buildLoanAnalytics() {
        long totalLoans = loanRepository.count();
        long active = loanRepository.countByStatus("active");
        long paid = loanRepository.countByStatus("paid");
        long overdue = loanRepository.countByStatus("overdue");
        long pending = loanRepository.countByStatus("pending");
        long rejected = loanRepository.countByStatus("rejected");

        BigDecimal totalDisbursed = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(principal_amount), 0) FROM loans WHERE status IN ('active', 'paid')")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal totalOutstanding = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery("SELECT COALESCE(SUM(outstanding_balance), 0) FROM loans WHERE status = 'active'")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal totalLateFees = Optional.ofNullable(
                (BigDecimal) em.createNativeQuery(
                        "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t JOIN transaction_types tt ON t.type_id = tt.type_id WHERE tt.type_name = 'late_fee' AND t.status = 'completed'")
                        .getSingleResult()).orElse(BigDecimal.ZERO);
        BigDecimal avgAmount = totalLoans > 0 ? totalDisbursed.divide(BigDecimal.valueOf(totalLoans), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        BigDecimal avgAprBd = (BigDecimal) em.createNativeQuery("SELECT COALESCE(AVG(l.interest_rate), 0) FROM loans l WHERE l.status = 'active'")
                .getSingleResult();
        double avgApr = avgAprBd != null ? avgAprBd.doubleValue() : 0.0;

        List<Object[]> byTypeRows = em.createNativeQuery(
                "SELECT lt.type_name, COUNT(l.loan_id), COALESCE(SUM(l.outstanding_balance), 0) " +
                "FROM loans l JOIN loan_types lt ON l.loan_type_id = lt.loan_type_id " +
                "WHERE l.status = 'active' GROUP BY lt.type_name ORDER BY COUNT(l.loan_id) DESC")
                .getResultList();

        List<LoanAnalytics.TypeBreakdown> byType = byTypeRows.stream()
                .map(r -> new LoanAnalytics.TypeBreakdown((String) r[0], ((Number) r[1]).longValue(), (BigDecimal) r[2]))
                .toList();

        return new LoanAnalytics(totalLoans, active, paid, overdue, pending, rejected,
                totalDisbursed, totalOutstanding, totalLateFees, avgAmount, avgApr, byType);
    }

    private CreditCardAnalytics buildCreditCardAnalytics() {
        long totalCards = cardRepository.count();
        List<com.equinox.admin.entity.Card> creditCards = cardRepository.findByCreditLimitIsNotNull();
        long creditCardsCount = creditCards.size();
        long debitCardsCount = totalCards - creditCardsCount;
        BigDecimal totalOutstanding = creditCards.stream()
                .map(com.equinox.admin.entity.Card::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalLimit = creditCards.stream()
                .map(c -> c.getCreditLimit() != null ? c.getCreditLimit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        double utilization = totalLimit.compareTo(BigDecimal.ZERO) > 0
                ? totalOutstanding.multiply(BigDecimal.valueOf(100)).divide(totalLimit, 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;
        long frozen = cardRepository.countByIsFrozen(true);
        long withStatements = cardStatementRepository.count();
        return new CreditCardAnalytics(totalCards, creditCardsCount, debitCardsCount,
                totalOutstanding, totalLimit, utilization, frozen, withStatements);
    }

    private SavingsGoalAnalytics buildSavingsGoalAnalytics() {
        long total = savingsGoalRepository.count();
        long active = savingsGoalRepository.countByStatus("ACTIVE");
        long completed = savingsGoalRepository.countByStatus("COMPLETED");
        long cancelled = savingsGoalRepository.countByStatus("CANCELLED");
        BigDecimal totalSaved = savingsGoalRepository.sumCurrentAmount();
        BigDecimal totalTargets = savingsGoalRepository.sumTargetAmount();
        double rate = totalTargets.compareTo(BigDecimal.ZERO) > 0
                ? totalSaved.multiply(BigDecimal.valueOf(100)).divide(totalTargets, 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT category, COUNT(*), COALESCE(SUM(current_amount), 0) FROM savings_goals WHERE status = 'ACTIVE' GROUP BY category ORDER BY SUM(current_amount) DESC")
                .getResultList();
        List<SavingsGoalAnalytics.CategoryBreakdown> byCat = rows.stream()
                .map(r -> new SavingsGoalAnalytics.CategoryBreakdown((String) r[0], ((Number) r[1]).longValue(), (BigDecimal) r[2]))
                .toList();

        return new SavingsGoalAnalytics(total, active, completed, cancelled, totalSaved, totalTargets, rate, byCat);
    }

    @SuppressWarnings("unchecked")
    private CustomerAnalytics buildCustomerAnalytics() {
        long total = customerRepository.count();
        long kycPending = customerRepository.countByKycStatus("pending");
        long kycApproved = customerRepository.countByKycStatus("approved");
        long kycRejected = customerRepository.countByKycStatus("rejected");

        BigDecimal avgScoreBd = (BigDecimal) em.createNativeQuery("SELECT AVG(c.credit_score) FROM customers c WHERE c.credit_score IS NOT NULL")
                .getSingleResult();
        Double avgScore = avgScoreBd != null ? avgScoreBd.doubleValue() : null;

        List<CustomerAnalytics.TierBreakdown> tiers = new ArrayList<>();
        creditScoreTierRepository.findAll().forEach(tier -> {
            long count = ((Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM customers WHERE credit_score BETWEEN :min AND :max")
                    .setParameter("min", tier.getMinScore())
                    .setParameter("max", tier.getMaxScore())
                    .getSingleResult()).longValue();
            tiers.add(new CustomerAnalytics.TierBreakdown(tier.getTierName(), count,
                    BigDecimal.valueOf(tier.getMinScore()), BigDecimal.valueOf(tier.getMaxScore())));
        });

        return new CustomerAnalytics(total, kycPending, kycApproved, kycRejected, avgScore, tiers);
    }

    @SuppressWarnings("unchecked")
    private List<MonthlyTrend> buildMonthlyTrends() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') as period, " +
                "COALESCE(SUM(CASE WHEN tt.type_name IN ('deposit', 'refund') THEN t.amount ELSE 0 END), 0) as income, " +
                "COALESCE(SUM(CASE WHEN tt.type_name IN ('withdrawal', 'debit_purchase', 'credit_purchase') THEN t.amount ELSE 0 END), 0) as expenses, " +
                "COUNT(t.transaction_id) as tx_count " +
                "FROM transactions t " +
                "JOIN transaction_types tt ON t.type_id = tt.type_id " +
                "WHERE t.status = 'completed' " +
                "AND t.transaction_date >= :since " +
                "GROUP BY period ORDER BY period DESC")
                .setParameter("since", LocalDateTime.now().minusMonths(12))
                .getResultList();

        return rows.stream()
                .map(r -> {
                    String period = (String) r[0];
                    BigDecimal income = (BigDecimal) r[1];
                    BigDecimal expenses = (BigDecimal) r[2];
                    long count = ((Number) r[3]).longValue();
                    return new MonthlyTrend(period, income, expenses, income.subtract(expenses), count);
                })
                .toList();
    }
}
