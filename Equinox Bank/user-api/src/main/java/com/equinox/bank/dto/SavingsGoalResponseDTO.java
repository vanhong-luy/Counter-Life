package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SavingsGoalResponseDTO(
    Long goalId,
    Long customerId,
    Long accountId,
    String goalName,
    String category,
    BigDecimal targetAmount,
    BigDecimal currentAmount,
    LocalDate targetDate,
    String status,
    Boolean autoRelease,
    LocalDateTime createdAt
) {}
