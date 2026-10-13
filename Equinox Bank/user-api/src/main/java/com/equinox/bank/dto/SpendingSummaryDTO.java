package com.equinox.bank.dto;

import java.math.BigDecimal;

public record SpendingSummaryDTO(
    String period, BigDecimal totalIncome, BigDecimal totalExpenses,
    BigDecimal netBalance) {}
