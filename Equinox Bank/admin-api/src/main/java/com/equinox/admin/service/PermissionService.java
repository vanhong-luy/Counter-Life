package com.equinox.admin.service;

import com.equinox.admin.entity.AdminUser;
import com.equinox.admin.exception.ForbiddenException;
import com.equinox.admin.repository.AdminUserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PermissionService {

    private final AdminUserRepository adminUserRepository;

    public PermissionService(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    public void require(Authentication auth, String permission) {
        if (auth == null) throw new ForbiddenException("Authentication required");
        String email = auth.getName();
        AdminUser admin = adminUserRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenException("Admin not found"));
        List<String> perms = admin.getRole().getPermissionList();
        if (!perms.contains(permission)) {
            throw new ForbiddenException("Access denied: missing '" + permission + "' permission");
        }
    }
}
