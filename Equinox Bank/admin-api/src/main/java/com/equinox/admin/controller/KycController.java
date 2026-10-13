package com.equinox.admin.controller;

import com.equinox.admin.dto.KycBatchReviewRequest;
import com.equinox.admin.dto.KycDocumentResponse;
import com.equinox.admin.dto.KycReviewRequest;
import com.equinox.admin.service.KycService;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin/kyc")
public class KycController {

    private final KycService kycService;
    private final AuditLogService auditLogService;
    private final PermissionService permissionService;

    public KycController(KycService kycService, AuditLogService auditLogService,
                         PermissionService permissionService) {
        this.kycService = kycService;
        this.auditLogService = auditLogService;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<KycDocumentResponse>> getAll(Authentication auth) {
        permissionService.require(auth, "kyc");
        return ResponseEntity.ok(kycService.getAllDocuments());
    }

    @GetMapping("/filtered")
    public ResponseEntity<Map<String, Object>> getFiltered(Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        permissionService.require(auth, "kyc");
        return ResponseEntity.ok(kycService.getFilteredDocuments(status, search, limit, offset));
    }

    @PutMapping("/{docId}/review")
    public ResponseEntity<Void> review(@PathVariable Long docId,
                                       @Valid @RequestBody KycReviewRequest request,
                                       Authentication authentication) {
        permissionService.require(authentication, "kyc");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        kycService.reviewDocument(docId, request, adminId);
        auditLogService.log(adminId, adminEmail, "REVIEW_KYC", "kyc_documents", docId,
                "Reviewed KYC document status to " + request.getStatus(),
                java.util.Map.of("status", request.getStatus(), "remarks", request.getRemarks() != null ? request.getRemarks() : ""));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/batch-review")
    public ResponseEntity<Map<String, Object>> batchReview(@Valid @RequestBody List<KycBatchReviewRequest> items,
                                                            Authentication authentication) {
        permissionService.require(authentication, "kyc");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        List<Long> reviewed = kycService.batchReviewDocuments(items, adminId);
        for (Long id : reviewed) {
            auditLogService.log(adminId, adminEmail, "REVIEW_KYC", "kyc_documents", id, "Batch reviewed", Map.of());
        }
        return ResponseEntity.ok(Map.of("reviewed", reviewed.size(), "ids", reviewed));
    }
}
