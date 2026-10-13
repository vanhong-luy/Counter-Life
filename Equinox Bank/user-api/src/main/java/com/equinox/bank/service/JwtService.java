package com.equinox.bank.service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Handles all JWT operations: token generation, extraction, and validation.
 *
 * The signing key is loaded from {@code application.properties} via
 * {@code jwt.secret} — never hardcode secrets in source code.
 *
 * Token structure:
 *   - subject: the user's email (username)
 *   - issuedAt: creation timestamp
 *   - expiration: valid for 60 minutes
 *   - signed with HMAC-SHA using the configured secret key
 */
@Component
public class JwtService {

    /**
     * Injected from application.properties: jwt.secret.
     * Must be a BASE64-encoded string of at least 256 bits (32 bytes).
     */
    @Value("${jwt.secret}")
    private String secret;

    /**
     * Generates a JWT for the given email (username).
     */
    public String generateToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, email, 1000 * 60 * 60); // 60 min
    }

    /**
     * Generates a refresh JWT with 7-day expiry.
     */
    public String generateRefreshToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "refresh");
        // jti makes every token unique even if issued in the same second,
        // which is essential for rotation (old != new token string).
        claims.put("jti", UUID.randomUUID().toString());
        return createToken(claims, email, 1000 * 60 * 60 * 24 * 7); // 7 days
    }

    /**
     * Builds and signs the JWT with the configured secret.
     */
    private String createToken(Map<String, Object> claims, String email, long ttlMs) {
        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + ttlMs))
                .signWith(getSignKey())
                .compact();
    }

    /**
     * Derives the HMAC signing key from the BASE64-encoded secret.
     */
    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Extracts the username (email) from a JWT's subject claim.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the expiration date from a JWT.
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Generic method to extract any claim from a token using the provided resolver function.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Parses the JWT, verifies its signature, and returns the claims body.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Checks whether the token has passed its expiration time.
     */
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Returns the remaining time until the token expires.
     * Used by the logout flow to set the TTL on the blacklist entry
     * so it auto-expires when the token would have expired anyway.
     *
     * @param token  the JWT
     * @return remaining duration, or zero/negative if already expired
     */
    public long getRemainingTtlMillis(String token) {
        Date expiration = extractExpiration(token);
        return expiration.getTime() - System.currentTimeMillis();
    }

    /**
     * Validates the token by checking:
     *   1. The username in the token matches the provided UserDetails
     *   2. The token has not expired
     */
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

}
