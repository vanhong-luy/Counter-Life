package com.equinox.admin.dto;

import java.math.BigDecimal;

public class DashboardResponse {

    private long totalCustomers;
    private BigDecimal totalDeposits;
    private long totalAccounts;
    private long pendingKycCount;
    private long pendingLoansCount;
    private long totalTransactions;

    public long getTotalCustomers() { return totalCustomers; }
    public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }
    public BigDecimal getTotalDeposits() { return totalDeposits; }
    public void setTotalDeposits(BigDecimal totalDeposits) { this.totalDeposits = totalDeposits; }
    public long getTotalAccounts() { return totalAccounts; }
    public void setTotalAccounts(long totalAccounts) { this.totalAccounts = totalAccounts; }
    public long getPendingKycCount() { return pendingKycCount; }
    public void setPendingKycCount(long pendingKycCount) { this.pendingKycCount = pendingKycCount; }
    public long getPendingLoansCount() { return pendingLoansCount; }
    public void setPendingLoansCount(long pendingLoansCount) { this.pendingLoansCount = pendingLoansCount; }
    public long getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; }
}
