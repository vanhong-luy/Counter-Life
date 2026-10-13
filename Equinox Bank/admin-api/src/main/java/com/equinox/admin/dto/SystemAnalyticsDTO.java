package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.util.List;

public record SystemAnalyticsDTO(
    SystemOverview overview,
    AccountAnalytics accounts,
    TransactionAnalytics transactions,
    SpendingAnalytics spending,
    LoanAnalytics loans,
    CreditCardAnalytics creditCards,
    SavingsGoalAnalytics savingsGoals,
    CustomerAnalytics customers,
    List<MonthlyTrend> monthlyTrends
) {
    public record SystemOverview(
        long totalCustomers, long totalAccounts, long totalTransactions,
        BigDecimal totalDeposits, BigDecimal totalWithdrawals,
        long activeLoans, BigDecimal totalLoanOutstanding,
        BigDecimal totalCreditCardDebt, BigDecimal totalSavingsGoalFunds
    ) {}

    public record AccountAnalytics(
        long totalAccounts, long activeAccounts, long frozenAccounts,
        BigDecimal totalBalance, BigDecimal averageBalance,
        List<TypeBreakdown> byType
    ) {
        public record TypeBreakdown(String typeName, long count, BigDecimal totalBalance) {}
    }

    public record TransactionAnalytics(
        long totalTransactions, BigDecimal totalVolume,
        BigDecimal averageTransaction, long todayCount, BigDecimal todayVolume,
        long thisMonthCount, BigDecimal thisMonthVolume,
        long pendingCount, long completedCount, long failedCount
    ) {}

    public record SpendingAnalytics(
        BigDecimal totalSpent, BigDecimal totalIncome, BigDecimal netBalance,
        List<CategoryBreakdown> byCategory
    ) {
        public record CategoryBreakdown(String categoryName, BigDecimal totalAmount, long transactionCount) {}
    }

    public record LoanAnalytics(
        long totalLoans, long activeLoans, long paidLoans,
        long overdueLoans, long pendingLoans, long rejectedLoans,
        BigDecimal totalDisbursed, BigDecimal totalOutstanding,
        BigDecimal totalLateFeesCollected, BigDecimal averageLoanAmount,
        double averageApr, List<TypeBreakdown> byType
    ) {
        public record TypeBreakdown(String loanType, long count, BigDecimal totalOutstanding) {}
    }

    public record CreditCardAnalytics(
        long totalCards, long creditCards, long debitCards,
        BigDecimal totalOutstanding, BigDecimal totalCreditLimit,
        double utilizationRate, long frozenCards, long cardsWithStatements
    ) {}

    public record SavingsGoalAnalytics(
        long totalGoals, long activeGoals, long completedGoals,
        long cancelledGoals, BigDecimal totalSaved, BigDecimal totalTargets,
        double completionRate, List<CategoryBreakdown> byCategory
    ) {
        public record CategoryBreakdown(String category, long count, BigDecimal totalSaved) {}
    }

    public record CustomerAnalytics(
        long totalCustomers, long kycPending, long kycApproved,
        long kycRejected, Double averageCreditScore,
        List<TierBreakdown> creditScoreDistribution
    ) {
        public record TierBreakdown(String tierName, long customerCount,
            BigDecimal minScore, BigDecimal maxScore) {}
    }

    public record MonthlyTrend(
        String period, BigDecimal income, BigDecimal expenses, BigDecimal netBalance, long transactionCount
    ) {}
}
