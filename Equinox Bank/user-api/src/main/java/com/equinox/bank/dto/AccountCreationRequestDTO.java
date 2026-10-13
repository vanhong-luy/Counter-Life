package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record AccountCreationRequestDTO(
    @NotNull Integer accountTypeId,
    String name,
    BigDecimal amount,
    Long sourceAccountId,
    String principalDisposition,
    Integer termMonths,
    String idempotencyKey) {}
