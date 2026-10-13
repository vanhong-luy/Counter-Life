package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CardPurchaseRequestDTO(
    @NotNull @Positive BigDecimal amount,
    String merchant,
    String description,
    Boolean isOnline,
    Boolean isInternational) {}
