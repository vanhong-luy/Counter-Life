package com.equinox.bank.dto;

import java.math.BigDecimal;

public record SavingsGoalActionRequestDTO(
    BigDecimal amount
) {}
