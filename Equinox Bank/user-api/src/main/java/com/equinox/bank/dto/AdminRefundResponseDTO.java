package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminRefundResponseDTO(
    Long refundId,
    Long originalTransactionId,
    BigDecimal refundAmount,
    String reason,
    String comment,
    String status,
    String remarks,
    String customerName,
    String email,
    LocalDateTime processedAt,
    LocalDateTime reviewedAt) {}
