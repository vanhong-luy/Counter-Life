package com.equinox.bank.filter;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.equinox.bank.service.JwtService;
import com.equinox.bank.service.TokenBlacklistService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Intercepts every incoming HTTP request once and checks for a valid JWT
 * in the Authorization header. If a valid token is found, the user is
 * authenticated and their security context is set for the request.
 *
 * Also checks the Redis-backed token blacklist so that logged-out tokens
 * are rejected even if they haven't expired yet.
 *
 * This filter runs before Spring Security's own {@code UsernamePasswordAuthenticationFilter}.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final TokenBlacklistService blacklistService;

    @Autowired
    public JwtAuthFilter(UserDetailsService userDetailsService,
                         JwtService jwtService,
                         TokenBlacklistService blacklistService) {
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.blacklistService = blacklistService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        String token = null;
        String username = null;

        // Extract the JWT token from the Authorization header (format: "Bearer <token>")
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);

            // Reject tokens that have been blacklisted (logged out)
            if (blacklistService.isBlacklisted(token)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Guard against expired/malformed tokens — if parsing throws, treat the
            // request as unauthenticated (Spring Security returns 401 for protected
            // routes) instead of a 500.
            try {
                username = jwtService.extractUsername(token);
            } catch (Exception e) {
                username = null;
            }
        }

        // If we have a username and no existing authentication, validate the token
        // and set the security context
        if (username != null &&
            SecurityContextHolder.getContext().getAuthentication() == null
        ) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (jwtService.validateToken(token, userDetails)) {
                // Create an authentication token with the user's authorities
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                // Attach request details (IP, session ID, etc.)
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Set the authentication in the security context
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // Continue the filter chain regardless (even if unauthenticated —
        // subsequent filters or the security config will deny access if needed)
        filterChain.doFilter(request, response);
    }

}
