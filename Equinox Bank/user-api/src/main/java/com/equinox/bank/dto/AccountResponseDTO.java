package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AccountResponseDTO(
    Long accountId, String name, Long customerId, String accountTypeName,
    String accountNumber, BigDecimal balance, String currency,
    String status, Boolean isPrimary, LocalDateTime createdAt,
    Long sourceAccountId, String sourceAccountNumber, String sourceAccountName,
    Integer termMonths, LocalDate maturityDate, String principalDisposition,
    Boolean matured, BigDecimal interestAmount, BigDecimal totalToReceive,
    BigDecimal interestRate) {}
