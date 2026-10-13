package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;

public record CreateBillRequestDTO(
    @NotBlank String billerName,
    @NotBlank String billType,
    BigDecimal amount,
    String dueDate,
    String frequency,
    Boolean autoPay,
    Long sourceAccountId,
    Long targetAccountId) {}
