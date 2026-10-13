package com.equinox.bank.dto;

import jakarta.validation.constraints.NotBlank;

public record LoanApprovalRequestDTO(
    @NotBlank String status,
    String remarks) {}
