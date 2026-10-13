package com.equinox.bank.dto;

import java.math.BigDecimal;

public record DashboardResponseDTO(
    long totalCustomers, long totalAccounts, BigDecimal totalDeposits,
    long pendingKycCount, long pendingLoansCount,
    long totalTransactions) {}
