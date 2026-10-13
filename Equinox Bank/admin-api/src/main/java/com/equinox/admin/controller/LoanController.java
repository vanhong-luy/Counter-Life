package com.equinox.admin.controller;

import com.equinox.admin.dto.LoanBatchReviewRequest;
import com.equinox.admin.dto.LoanResponse;
import com.equinox.admin.dto.LoanReviewRequest;
import com.equinox.admin.service.LoanService;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import com.equinox.admin.service.R2StorageService;
import com.equinox.admin.entity.Collateral;
import com.equinox.admin.repository.CollateralRepository;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin/loans")
public class LoanController {

    private final LoanService loanService;
    private final AuditLogService auditLogService;
    private final PermissionService permissionService;
    private final R2StorageService r2StorageService;
    private final CollateralRepository collateralRepository;

    public LoanController(LoanService loanService, AuditLogService auditLogService,
                          PermissionService permissionService,
                          R2StorageService r2StorageService, CollateralRepository collateralRepository) {
        this.loanService = loanService;
        this.auditLogService = auditLogService;
        this.permissionService = permissionService;
        this.r2StorageService = r2StorageService;
        this.collateralRepository = collateralRepository;
    }

    @GetMapping
    public ResponseEntity<List<LoanResponse>> getAll(Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String loanType,
            @RequestParam(defaultValue = "appliedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        permissionService.require(auth, "loans");
        return ResponseEntity.ok(loanService.getAllLoans(status, loanType, sortBy, sortDir));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<LoanResponse>> getPending(Authentication auth) {
        permissionService.require(auth, "loans");
        return ResponseEntity.ok(loanService.getPendingLoans());
    }

    @GetMapping("/filtered")
    public ResponseEntity<Map<String, Object>> getFiltered(Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String loanType,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "appliedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        permissionService.require(auth, "loans");
        return ResponseEntity.ok(loanService.getFilteredLoans(status, loanType, search, limit, offset, sortBy, sortDir));
    }

    @PutMapping("/{loanId}/review")
    public ResponseEntity<Void> review(@PathVariable Long loanId,
                                       @Valid @RequestBody LoanReviewRequest request,
                                       Authentication authentication) {
        permissionService.require(authentication, "loans");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        loanService.reviewLoan(loanId, request, adminId);
        auditLogService.log(adminId, adminEmail, "REVIEW_LOAN", "loans", loanId,
                "Reviewed loan application status to " + request.getStatus(),
                java.util.Map.of("status", request.getStatus(), "remarks", request.getRemarks() != null ? request.getRemarks() : ""));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/batch-review")
    public ResponseEntity<Map<String, Object>> batchReview(@Valid @RequestBody List<LoanBatchReviewRequest> items,
                                                            Authentication authentication) {
        permissionService.require(authentication, "loans");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        List<Long> reviewed = loanService.batchReviewLoans(items, adminId);
        for (Long id : reviewed) {
            auditLogService.log(adminId, adminEmail, "REVIEW_LOAN", "loans", id, "Batch reviewed", Map.of());
        }
        return ResponseEntity.ok(Map.of("reviewed", reviewed.size(), "ids", reviewed));
    }

    @GetMapping("/{loanId}")
    public ResponseEntity<LoanResponse> getById(Authentication auth, @PathVariable Long loanId) {
        permissionService.require(auth, "loans");
        return ResponseEntity.ok(loanService.getLoanById(loanId));
    }

    @GetMapping("/{loanId}/collateral")
    public ResponseEntity<List<com.equinox.admin.dto.CollateralResponse>> getCollaterals(Authentication auth, @PathVariable Long loanId) {
        permissionService.require(auth, "loans");
        return ResponseEntity.ok(loanService.getLoanCollaterals(loanId));
    }

    @GetMapping("/{loanId}/collateral/{collateralId}/file")
    public ResponseEntity<InputStreamResource> getCollateralFile(Authentication auth, @PathVariable Long loanId,
                                                                    @PathVariable Long collateralId) {
        permissionService.require(auth, "loans");
        Collateral collateral = collateralRepository.findById(collateralId)
                .orElseThrow(() -> new com.equinox.admin.exception.ResourceNotFoundException("Collateral not found"));
        if (!collateral.getLoan().getLoanId().equals(loanId)) {
            return ResponseEntity.badRequest().build();
        }
        if (collateral.getProofDocumentUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        ResponseInputStream<GetObjectResponse> s3Stream = r2StorageService.getFile(collateral.getProofDocumentUrl());
        String contentType = s3Stream.response().contentType();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                .body(new InputStreamResource(s3Stream));
    }
}
