package com.equinox.bank.dto;

import jakarta.validation.constraints.NotBlank;

public record KycReviewRequestDTO(
    @NotBlank String status,
    String remarks) {}
