package com.equinox.bank.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for the reset-password endpoint.
 * Contains the reset token from the forgot-password flow and the new password.
 * The reset token is single-use and expires after 15 minutes.
 */
public record ResetPasswordRequestDTO(
    @NotBlank(message = "Reset token cannot be blank")
    String token,

    @Size(min = 6, message = "Password must be at least 6 characters")
    @NotBlank(message = "New password cannot be blank")
    String newPassword
) {}
