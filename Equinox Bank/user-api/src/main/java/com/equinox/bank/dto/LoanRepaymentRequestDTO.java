package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record LoanRepaymentRequestDTO(
    @NotNull BigDecimal amountPaid) {}
