package com.equinox.admin.controller;

import com.equinox.admin.dto.AdminProfileResponse;
import com.equinox.admin.dto.LoginRequest;
import com.equinox.admin.dto.LoginResponse;
import com.equinox.admin.service.AdminAuthService;
import com.equinox.admin.service.JwtService;
import com.equinox.admin.service.TokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AdminAuthService authService;
    private final JwtService jwtService;
    private final TokenBlacklistService blacklistService;

    public AuthController(AdminAuthService authService,
                          JwtService jwtService,
                          TokenBlacklistService blacklistService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.blacklistService = blacklistService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/admin/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        try {
            LoginResponse response = authService.refreshToken(request.get("refreshToken"));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/admin/me")
    public ResponseEntity<AdminProfileResponse> me(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(authService.getProfile(email));
    }

    @PostMapping("/admin/logout")
    public ResponseEntity<Void> adminLogout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                long remainingMs = jwtService.getRemainingTtlMillis(token);
                if (remainingMs > 0) {
                    blacklistService.blacklistToken(token, Duration.ofMillis(remainingMs));
                }
            } catch (Exception ignored) {}
        }
        String refreshToken = request.getHeader("X-Refresh-Token");
        authService.logout(refreshToken);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        // Blacklist the access token for its remaining lifetime
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Date expiry = jwtService.extractEmail(token) != null
                        ? new Date(System.currentTimeMillis()) : null;
                // Calculate remaining TTL using expiry from the JWT
                long remainingMs = jwtService.getRemainingTtlMillis(token);
                if (remainingMs > 0) {
                    blacklistService.blacklistToken(token, Duration.ofMillis(remainingMs));
                }
            } catch (Exception ignored) {
                // Token may already be expired — just revoke the refresh token below
            }
        }
        // Revoke the refresh token if the client sends it
        String refreshToken = request.getHeader("X-Refresh-Token");
        authService.logout(refreshToken);

        return ResponseEntity.ok().build();
    }
}
