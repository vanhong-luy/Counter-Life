package com.equinox.admin.controller;

import com.equinox.admin.dto.TelemetryResponse;
import com.equinox.admin.service.PermissionService;
import com.equinox.admin.service.TelemetryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/admin")
public class TelemetryController {

    private final TelemetryService telemetryService;
    private final PermissionService permissionService;

    public TelemetryController(TelemetryService telemetryService, PermissionService permissionService) {
        this.telemetryService = telemetryService;
        this.permissionService = permissionService;
    }

    @GetMapping("/telemetry")
    public ResponseEntity<TelemetryResponse> telemetry(Authentication auth) {
        permissionService.require(auth, "settings");
        return ResponseEntity.ok(telemetryService.collect());
    }
}
