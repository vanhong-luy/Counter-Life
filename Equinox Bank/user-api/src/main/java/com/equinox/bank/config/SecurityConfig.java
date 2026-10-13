package com.equinox.bank.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.equinox.bank.filter.JwtAuthFilter;

import java.util.List;

/**
 * Central Spring Security configuration.
 *
 * Key design decisions:
 * - Stateless session management (no server-side session — JWT handles auth)
 * - CSRF is disabled (typical for REST APIs that use token-based auth)
 * - Public endpoints: welcome, register, login, forgot-password, reset-password
 * - Role-based access: customer/user/admin paths require respective roles
 * - All other endpoints (including /auth/logout) require a valid JWT
 * - The JwtAuthFilter runs before every request to extract and validate JWTs
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints — no authentication required
                        .requestMatchers("/auth/welcome", "/auth/register", "/auth/login",
                                "/auth/forgot-password", "/auth/reset-password",
                                "/auth/refresh", "/error")
                        .permitAll()
                        // Unverified customer access — can upload KYC, view profile, see doc status
                        .requestMatchers("/auth/kyc/upload", "/auth/kyc/profile-photo",
                                "/auth/kyc/documents", "/auth/kyc/reviews",
                                "/auth/profile", "/auth/profile-photo")
                        .hasAnyAuthority("ROLE_CUSTOMER", "ROLE_UNVERIFIED")
                        // Customer endpoints (ROLE_CUSTOMER)
                        .requestMatchers(
                                "/auth/customer/**",
                                "/auth/categories",
                                "/auth/accounts/**",
                                "/auth/transactions/**",
                                "/auth/loans/**",
                                "/auth/cards/**",
                                "/auth/analytics/**",
                                "/auth/sim/**")
                        .hasAuthority("ROLE_CUSTOMER")
                        // File endpoints — admin sees any, customer/unverified see own (checked in
                        // controller)
                        .requestMatchers("/auth/kyc/documents/**",
                                "/auth/profile-photo/*/file")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_CUSTOMER", "ROLE_UNVERIFIED")
                        // Admin endpoints
                        .requestMatchers("/auth/admin/**", "/auth/getAllUser")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPER_ADMIN")
                        // All other requests require authentication (e.g. /auth/logout)
                        .anyRequest().authenticated())
                .sessionManagement(
                        sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Configures the DAO-based authentication provider.
     * Uses our custom UserDetailsService to load users from the database
     * and BCryptPasswordEncoder to verify passwords.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    /**
     * Exposes the AuthenticationManager as a bean so it can be injected
     * into controllers for programmatic authentication (e.g., login endpoint).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        String allowedOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        } else {
            config.setAllowedOrigins(List.of("http://localhost:3000"));
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
