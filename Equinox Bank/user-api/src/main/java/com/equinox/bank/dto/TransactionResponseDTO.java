package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TransactionResponseDTO(
    Long transactionId, String referenceNumber, String typeName,
    String categoryName, String iconType, Long sourceAccountId, Long targetAccountId,
    BigDecimal amount, String currency, String status,
    String description, OffsetDateTime transactionDate) {}
