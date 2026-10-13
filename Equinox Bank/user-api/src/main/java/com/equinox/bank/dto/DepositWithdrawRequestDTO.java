package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record DepositWithdrawRequestDTO(
    @NotNull Long accountId,
    @NotNull BigDecimal amount,
    Integer categoryId,
    String description,
    Long cardId) {}
