package com.equinox.admin.filter;

import com.equinox.admin.entity.AdminUser;
import com.equinox.admin.repository.AdminUserRepository;
import com.equinox.admin.service.JwtService;
import com.equinox.admin.service.TokenBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TokenBlacklistService blacklistService;
    private final AdminUserRepository adminUserRepository;

    public JwtAuthFilter(JwtService jwtService, TokenBlacklistService blacklistService,
                         AdminUserRepository adminUserRepository) {
        this.jwtService = jwtService;
        this.blacklistService = blacklistService;
        this.adminUserRepository = adminUserRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (blacklistService.isBlacklisted(token)) {
                filterChain.doFilter(request, response);
                return;
            }

            if (jwtService.isTokenValid(token)) {
                String email = jwtService.extractEmail(token);
                Long adminId = jwtService.extractAdminId(token);

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                adminUserRepository.findByEmail(email).ifPresent(admin -> {
                    if (admin.getRole() != null) {
                        List<String> perms = admin.getRole().getPermissionList();
                        for (String p : perms) {
                            authorities.add(new SimpleGrantedAuthority("ROLE_PERM_" + p));
                        }
                    }
                });

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(email, adminId, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
