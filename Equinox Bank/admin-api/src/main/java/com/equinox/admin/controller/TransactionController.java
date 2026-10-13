package com.equinox.admin.controller;

import com.equinox.admin.service.PermissionService;
import com.equinox.admin.service.TransactionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin")
public class TransactionController {

    private final TransactionService transactionService;
    private final PermissionService permissionService;

    public TransactionController(TransactionService transactionService, PermissionService permissionService) {
        this.transactionService = transactionService;
        this.permissionService = permissionService;
    }

    @GetMapping("/transactions")
    public ResponseEntity<Map<String, Object>> getAll(Authentication auth,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "transactionDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        permissionService.require(auth, "transactions");
        return ResponseEntity.ok(transactionService.getAllTransactions(type, status, startDate, endDate, search, limit, offset, sortBy, sortDir));
    }
}
