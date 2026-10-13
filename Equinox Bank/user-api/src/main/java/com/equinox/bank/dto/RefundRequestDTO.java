package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record RefundRequestDTO(
    @NotNull BigDecimal refundAmount,
    String reason,
    String comment) {}
