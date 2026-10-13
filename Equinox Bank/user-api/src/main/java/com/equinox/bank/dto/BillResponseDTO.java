package com.equinox.bank.dto;

import java.math.BigDecimal;

public record BillResponseDTO(
    Long billId,
    String billerName,
    String billType,
    BigDecimal amount,
    String dueDate,
    String frequency,
    Boolean autoPay,
    Long sourceAccountId,
    Long targetAccountId,
    String targetAccountName,
    String status,
    String createdAt,
    String lastPaidAt,
    Boolean isPaid) {}
