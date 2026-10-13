package com.equinox.admin.controller;

import com.equinox.admin.dto.SystemAnalyticsDTO;
import com.equinox.admin.service.PermissionService;
import com.equinox.admin.service.SystemAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/admin")
public class SystemAnalyticsController {

    private final SystemAnalyticsService systemAnalyticsService;
    private final PermissionService permissionService;

    public SystemAnalyticsController(SystemAnalyticsService systemAnalyticsService,
                                      PermissionService permissionService) {
        this.systemAnalyticsService = systemAnalyticsService;
        this.permissionService = permissionService;
    }

    @GetMapping("/system-analytics")
    public ResponseEntity<SystemAnalyticsDTO> getSystemAnalytics(Authentication auth) {
        permissionService.require(auth, "dashboard");
        return ResponseEntity.ok(systemAnalyticsService.getAnalytics());
    }
}
