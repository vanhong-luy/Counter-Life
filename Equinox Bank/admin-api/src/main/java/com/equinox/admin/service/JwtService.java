package com.equinox.admin.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiration:86400000}") long expirationMs) {
        byte[] keyBytes = io.jsonwebtoken.io.Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    public String generateToken(String email, Long adminId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(email)
                .claim("adminId", adminId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String email) {
        Date now = new Date();
        return Jwts.builder()
                .subject(email)
                .claim("type", "refresh")
                // jti makes every token unique even if issued in the same second
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 1000L * 60 * 60 * 24 * 30)) // 30 days
                .signWith(key)
                .compact();
    }

    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public Long extractAdminId(String token) {
        return parseClaims(token).get("adminId", Long.class);
    }

    /**
     * Returns the remaining time until the token expires (in milliseconds).
     * Used by logout to set the TTL on the blacklist entry.
     *
     * @param token the JWT
     * @return remaining duration in ms, or negative if already expired
     */
    public long getRemainingTtlMillis(String token) {
        Date expiration = parseClaims(token).getExpiration();
        return expiration.getTime() - System.currentTimeMillis();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
