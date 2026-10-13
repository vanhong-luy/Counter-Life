package com.equinox.bank.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for the forgot-password endpoint.
 * The user submits their registered email address to receive a password reset token.
 */
public record ForgotPasswordRequestDTO(
    @Email(message = "Invalid email format")
    @NotBlank(message = "Email cannot be blank")
    String email
) {}
