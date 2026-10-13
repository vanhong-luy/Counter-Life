package com.equinox.bank.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CollateralRequestDTO(
    @NotBlank String assetType,
    @NotNull BigDecimal estimatedValue,
    String proofDocumentUrl) {}
