package com.equinox.admin.controller;

import com.equinox.admin.dto.DashboardResponse;
import com.equinox.admin.dto.TransactionVolumeResponse;
import com.equinox.admin.service.DashboardService;
import com.equinox.admin.service.PermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/admin")
public class DashboardController {

    private final DashboardService dashboardService;
    private final PermissionService permissionService;

    public DashboardController(DashboardService dashboardService, PermissionService permissionService) {
        this.dashboardService = dashboardService;
        this.permissionService = permissionService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> dashboard(Authentication auth) {
        permissionService.require(auth, "dashboard");
        return ResponseEntity.ok(dashboardService.getDashboard());
    }

    @GetMapping("/dashboard/transaction-volume")
    public ResponseEntity<TransactionVolumeResponse> transactionVolume(Authentication auth,
            @RequestParam(defaultValue = "weekly") String range) {
        permissionService.require(auth, "dashboard");
        return ResponseEntity.ok(dashboardService.getTransactionVolume(range));
    }
}
