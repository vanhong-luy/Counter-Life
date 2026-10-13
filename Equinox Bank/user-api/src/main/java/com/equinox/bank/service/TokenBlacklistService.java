package com.equinox.bank.service;

import java.time.Duration;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Manages JWT token blacklisting (for logout) and password reset tokens
 * using Redis as the backing store.
 *
 * Redis key prefixes:
 *   {@code blacklist:<token>}        — stores "1" with TTL = remaining token lifetime
 *   {@code reset:<resetToken>}       — stores the user's email with TTL = 15 minutes
 *   {@code refresh:<refreshToken>}   — stores the user's email with TTL = 7 days (whitelist)
 *
 * All token types are automatically cleaned up by Redis when the TTL expires,
 * so no scheduled cleanup job is needed.
 */
@Service
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "blacklist:";
    private static final String RESET_PREFIX     = "reset:";
    private static final String REFRESH_PREFIX   = "refresh:";

    private static final long     RESET_TOKEN_TTL_MINUTES = 15;
    /** Must match JwtService.generateRefreshToken TTL (7 days). */
    private static final Duration REFRESH_TOKEN_TTL       = Duration.ofDays(7);

    private final StringRedisTemplate redisTemplate;

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // -------------------------------------------------------------------------
    // Access token blacklist
    // -------------------------------------------------------------------------

    /**
     * Blacklists a JWT access token so it can no longer be used after logout.
     * TTL = remaining lifetime of the token, so Redis auto-cleans it.
     */
    public void blacklistToken(String token, Duration remaining) {
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "1", remaining);
    }

    /** Returns true if the access token has been blacklisted (user logged out). */
    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    // -------------------------------------------------------------------------
    // Refresh token whitelist
    // -------------------------------------------------------------------------

    /**
     * Registers a newly-issued refresh token in Redis (whitelist approach).
     * Called immediately after login or register. TTL mirrors the JWT's own expiry.
     *
     * @param email        the user the token was issued to
     * @param refreshToken the raw JWT refresh token string
     */
    public void storeRefreshToken(String email, String refreshToken) {
        redisTemplate.opsForValue().set(REFRESH_PREFIX + refreshToken, email, REFRESH_TOKEN_TTL);
    }

    /**
     * Returns true if the refresh token is on the whitelist —
     * i.e., it was issued by us and has NOT been revoked by a logout.
     */
    public boolean isRefreshTokenValid(String refreshToken) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(REFRESH_PREFIX + refreshToken));
    }

    /**
     * Revokes a refresh token on logout. Even if the JWT is still
     * cryptographically valid within its 7-day window, it will be rejected.
     */
    public void revokeRefreshToken(String refreshToken) {
        redisTemplate.delete(REFRESH_PREFIX + refreshToken);
    }

    // -------------------------------------------------------------------------
    // Password reset tokens
    // -------------------------------------------------------------------------

    /**
     * Generates a unique password reset token, stores it mapped to the user's email,
     * and returns the token. One-time use, 15-minute TTL.
     */
    public String createResetToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
            RESET_PREFIX + token,
            email,
            Duration.ofMinutes(RESET_TOKEN_TTL_MINUTES)
        );
        return token;
    }

    /**
     * Consumes a reset token (one-time use). Returns the associated email,
     * or null if the token is invalid or expired.
     */
    public String consumeResetToken(String resetToken) {
        String key = RESET_PREFIX + resetToken;
        String email = redisTemplate.opsForValue().get(key);
        if (email != null) {
            redisTemplate.delete(key);
        }
        return email;
    }
}
