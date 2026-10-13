package com.equinox.bank.dto;

import jakarta.validation.constraints.NotBlank;

public record AccountNameUpdateRequestDTO(@NotBlank String name) {}
