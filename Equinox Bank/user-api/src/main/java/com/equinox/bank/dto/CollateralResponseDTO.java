package com.equinox.bank.dto;

import java.math.BigDecimal;

public record CollateralResponseDTO(
    Long collateralId, Long loanId, String assetType,
    BigDecimal estimatedValue, String proofDocumentUrl, String status) {}
