package com.equinox.bank.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Provides the {@link PasswordEncoder} bean used across the application.
 * Uses BCrypt, which is the recommended hashing algorithm for passwords.
 * BCrypt automatically generates and embeds a random salt into each hash,
 * so no separate salting logic is needed.
 */
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
