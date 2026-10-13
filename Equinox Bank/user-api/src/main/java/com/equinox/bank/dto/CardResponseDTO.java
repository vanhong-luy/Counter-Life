package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CardResponseDTO(
    Long cardId, Long accountId, String accountName, String cardTypeNetwork, String cardTypeName,
    String cardNumber, String fullCardNumber, String cardholderName, String cvv,
    LocalDate expiryDate, Boolean isFrozen, LocalDateTime issuedAt,
    BigDecimal creditLimit, BigDecimal outstandingBalance, BigDecimal apr,
    LocalDate statementDate, LocalDate dueDate) {}

