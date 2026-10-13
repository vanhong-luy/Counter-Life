package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsGoalRequestDTO(
    String goalName,
    String category,
    BigDecimal targetAmount,
    LocalDate targetDate,
    Long accountId,
    Boolean autoRelease
) {}
