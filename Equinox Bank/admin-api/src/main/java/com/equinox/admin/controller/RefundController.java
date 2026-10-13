package com.equinox.admin.controller;

import com.equinox.admin.dto.RefundBatchReviewRequest;
import com.equinox.admin.dto.RefundResponse;
import com.equinox.admin.dto.RefundReviewRequest;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import com.equinox.admin.service.RefundService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin/refunds")
public class RefundController {

    private final RefundService refundService;
    private final AuditLogService auditLogService;
    private final PermissionService permissionService;

    public RefundController(RefundService refundService, AuditLogService auditLogService,
                            PermissionService permissionService) {
        this.refundService = refundService;
        this.auditLogService = auditLogService;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<?> getAll(Authentication authentication,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        permissionService.require(authentication, "transactions");
        if (page >= 0 && size > 0) {
            return ResponseEntity.ok(refundService.getRefundsPage(null, page, size));
        }
        return ResponseEntity.ok(refundService.getAllRefunds());
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPending(Authentication authentication,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        permissionService.require(authentication, "transactions");
        if (page >= 0 && size > 0) {
            return ResponseEntity.ok(refundService.getRefundsPage("pending", page, size));
        }
        return ResponseEntity.ok(refundService.getPendingRefunds());
    }

    @PutMapping("/{refundId}/review")
    public ResponseEntity<Void> review(@PathVariable Long refundId,
                                       @Valid @RequestBody RefundReviewRequest request,
                                       Authentication authentication) {
        permissionService.require(authentication, "transactions");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        refundService.reviewRefund(refundId, request, adminId);
        auditLogService.log(adminId, adminEmail, "REVIEW_REFUND", "refunds", refundId,
                "Reviewed refund request status to " + request.getStatus(),
                Map.of("status", request.getStatus(), "remarks", request.getRemarks() != null ? request.getRemarks() : ""));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/batch-review")
    public ResponseEntity<Map<String, Object>> batchReview(@Valid @RequestBody List<RefundBatchReviewRequest> items,
                                                            Authentication authentication) {
        permissionService.require(authentication, "transactions");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        List<Long> reviewed = refundService.batchReviewRefunds(items, adminId);
        for (Long id : reviewed) {
            auditLogService.log(adminId, adminEmail, "REVIEW_REFUND", "refunds", id, "Batch reviewed", Map.of());
        }
        return ResponseEntity.ok(Map.of("reviewed", reviewed.size(), "ids", reviewed));
    }
}
