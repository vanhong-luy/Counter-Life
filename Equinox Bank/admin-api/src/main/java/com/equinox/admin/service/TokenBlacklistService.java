package com.equinox.admin.service;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Manages refresh token whitelisting and access token blacklisting
 * for the admin-api using Redis.
 *
 * Redis key prefixes:
 *   {@code admin:blacklist:<token>}      — stores "1" with TTL = remaining token lifetime
 *   {@code admin:refresh:<refreshToken>} — stores admin email with TTL = 30 days (whitelist)
 *
 * Prefixed with "admin:" to avoid collisions with user-api keys on the shared Redis instance.
 */
@Service
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "admin:blacklist:";
    private static final String REFRESH_PREFIX   = "admin:refresh:";

    /** Must match JwtService.generateRefreshToken TTL (30 days). */
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // -------------------------------------------------------------------------
    // Access token blacklist
    // -------------------------------------------------------------------------

    /**
     * Blacklists an admin JWT access token after logout.
     * TTL = remaining lifetime of the token so Redis auto-cleans it.
     */
    public void blacklistToken(String token, Duration remaining) {
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "1", remaining);
    }

    /** Returns true if the access token has been blacklisted (admin logged out). */
    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    // -------------------------------------------------------------------------
    // Refresh token whitelist
    // -------------------------------------------------------------------------

    /**
     * Registers a newly-issued refresh token in Redis.
     * Called immediately after admin login. TTL mirrors the JWT's own expiry.
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
     * Revokes a specific refresh token (called on logout).
     * After this the token is dead even if the JWT is still cryptographically valid.
     */
    public void revokeRefreshToken(String refreshToken) {
        redisTemplate.delete(REFRESH_PREFIX + refreshToken);
    }
}
