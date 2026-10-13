package com.equinox.admin.controller;

import com.equinox.admin.dto.CustomerResponse;
import com.equinox.admin.dto.CustomerUpdateRequest;
import com.equinox.admin.service.CustomerService;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin/users")
public class UserController {

    private final CustomerService customerService;
    private final AuditLogService auditLogService;
    private final PermissionService permissionService;

    public UserController(CustomerService customerService, AuditLogService auditLogService,
                          PermissionService permissionService) {
        this.customerService = customerService;
        this.auditLogService = auditLogService;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<CustomerResponse>> getAll(Authentication auth) {
        permissionService.require(auth, "users");
        return ResponseEntity.ok(customerService.getAllCustomers());
    }

    @GetMapping("/filtered")
    public ResponseEntity<Map<String, Object>> getFiltered(Authentication auth,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        permissionService.require(auth, "users");
        return ResponseEntity.ok(customerService.getFilteredCustomers(search, limit, offset));
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> getOne(Authentication auth, @PathVariable Long customerId) {
        permissionService.require(auth, "users");
        return ResponseEntity.ok(customerService.getCustomer(customerId));
    }

    @PutMapping("/{customerId}")
    public ResponseEntity<CustomerResponse> update(@PathVariable Long customerId,
                                                    @RequestBody CustomerUpdateRequest request,
                                                    org.springframework.security.core.Authentication authentication) {
        permissionService.require(authentication, "users");
        CustomerResponse updated = customerService.updateCustomer(customerId, request);
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        auditLogService.log(adminId, adminEmail, "UPDATE_USER", "customers", customerId,
                "Updated customer details for " + updated.getFirstName() + " " + updated.getLastName(),
                java.util.Map.of("kycStatus", request.getKycStatus() != null ? request.getKycStatus() : ""));
        return ResponseEntity.ok(updated);
    }
}
