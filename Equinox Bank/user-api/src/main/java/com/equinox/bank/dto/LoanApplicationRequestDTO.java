package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record LoanApplicationRequestDTO(
    @NotNull Integer loanTypeId,
    @NotNull BigDecimal principalAmount,
    @NotNull BigDecimal interestRate,
    @NotNull Integer loanTermMonths,
    String purpose) {}
