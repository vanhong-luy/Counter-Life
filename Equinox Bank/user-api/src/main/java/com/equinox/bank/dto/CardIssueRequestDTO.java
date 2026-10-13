package com.equinox.bank.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CardIssueRequestDTO(
    @NotNull Integer cardTypeId,
    @NotNull Long accountId,
    BigDecimal creditLimit,
    BigDecimal apr) {}
