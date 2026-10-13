package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record TransferRequestDTO(
    @NotNull Long sourceAccountId,
    Long targetAccountId,
    @NotNull BigDecimal amount,
    Integer categoryId,
    String description,
    Boolean isInternational,
    String recipientName,
    String swiftCode) {}
