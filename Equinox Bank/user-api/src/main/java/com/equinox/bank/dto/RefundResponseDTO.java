package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RefundResponseDTO(
    Long refundId, Long originalTransactionId, BigDecimal refundAmount,
    String reason, String comment, String status,
    String remarks, LocalDateTime processedAt, LocalDateTime reviewedAt) {}
