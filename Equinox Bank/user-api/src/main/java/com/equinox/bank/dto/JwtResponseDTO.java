package com.equinox.bank.dto;

/**
 * Returned on successful login. Contains the access token
 * and an optional refresh token for obtaining new access tokens.
 */
public record JwtResponseDTO(String token, String refreshToken) {

    /**
     * Constructor for backwards compatibility — sets refreshToken to null.
     */
    public JwtResponseDTO(String token) {
        this(token, null);
    }
}
