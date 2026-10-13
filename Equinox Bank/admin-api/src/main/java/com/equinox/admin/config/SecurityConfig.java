package com.equinox.admin.config;

import com.equinox.admin.filter.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/login", "/auth/admin-login").permitAll()
                .requestMatchers("/auth/admin/settings/**").hasAuthority("ROLE_PERM_settings")
                .requestMatchers("/auth/admin/users/**").hasAuthority("ROLE_PERM_users")
                .requestMatchers("/auth/admin/kyc/**").hasAuthority("ROLE_PERM_kyc")
                .requestMatchers("/auth/admin/loans/**").hasAuthority("ROLE_PERM_loans")
                .requestMatchers("/auth/admin/cards/**").hasAuthority("ROLE_PERM_cards")
                .requestMatchers("/auth/admin/transactions/**").hasAuthority("ROLE_PERM_transactions")
                .requestMatchers("/auth/admin/refunds/**").hasAuthority("ROLE_PERM_transactions")
                .requestMatchers("/auth/admin/dashboard/**").hasAuthority("ROLE_PERM_dashboard")
                .requestMatchers("/auth/admin/system-analytics").hasAuthority("ROLE_PERM_dashboard")
                .requestMatchers("/auth/admin/telemetry/**").hasAuthority("ROLE_PERM_settings")
                .requestMatchers("/auth/admin/audit*/**").hasAuthority("ROLE_PERM_settings")
                .requestMatchers("/auth/admin/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

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
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
