package com.equinox.admin.controller;

import com.equinox.admin.document.AuditLogDocument;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin/audit-logs")
public class AuditLogController {

    private final AuditLogService service;
    private final PermissionService permissionService;

    public AuditLogController(AuditLogService service, PermissionService permissionService) {
        this.service = service;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogDocument>> getLogs(Authentication authentication,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String table,
            @RequestParam(required = false) Long recordId) {
        permissionService.require(authentication, "settings");

        if (table != null && recordId != null) {
            return ResponseEntity.ok(service.getLogsByTableAndRecordId(table, recordId));
        }
        if (email != null) {
            return ResponseEntity.ok(service.getLogsByEmail(email));
        }
        if (action != null) {
            return ResponseEntity.ok(service.getLogsByAction(action));
        }
        if (table != null) {
            return ResponseEntity.ok(service.getLogsByTable(table));
        }
        return ResponseEntity.ok(service.getAllLogs());
    }

    @GetMapping("/filtered")
    public ResponseEntity<Map<String, Object>> getFiltered(Authentication authentication,
            @RequestParam(required = false) String table,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        permissionService.require(authentication, "settings");
        return ResponseEntity.ok(service.getFilteredLogs(table, search, limit, offset));
    }
}
