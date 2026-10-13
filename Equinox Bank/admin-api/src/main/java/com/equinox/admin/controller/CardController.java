package com.equinox.admin.controller;

import com.equinox.admin.dto.*;
import com.equinox.admin.service.AdminCardService;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/admin/cards")
public class CardController {

    private final AdminCardService adminCardService;
    private final AuditLogService auditLogService;
    private final PermissionService permissionService;

    public CardController(AdminCardService adminCardService, AuditLogService auditLogService,
                          PermissionService permissionService) {
        this.adminCardService = adminCardService;
        this.auditLogService = auditLogService;
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listCards(Authentication auth,
                                                          @RequestParam(required = false) String search,
                                                          @RequestParam(required = false) String filter,
                                                          @RequestParam(defaultValue = "15") int limit,
                                                          @RequestParam(defaultValue = "0") int offset) {
        permissionService.require(auth, "cards");
        return ResponseEntity.ok(adminCardService.getFilteredCards(search, filter, limit, offset));
    }

    @GetMapping("/{cardId}")
    public ResponseEntity<CardResponse> getCard(Authentication auth, @PathVariable Long cardId) {
        permissionService.require(auth, "cards");
        return ResponseEntity.ok(adminCardService.getCardById(cardId));
    }

    @GetMapping("/{cardId}/requests")
    public ResponseEntity<List<CreditLimitRequestResponse>> getCardRequests(Authentication auth,
                                                                             @PathVariable Long cardId) {
        permissionService.require(auth, "cards");
        return ResponseEntity.ok(adminCardService.getCreditRequestsByCard(cardId));
    }

    @GetMapping("/credit-requests")
    public ResponseEntity<List<CreditLimitRequestResponse>> listCreditRequests(Authentication auth,
                                                                                @RequestParam(required = false) String status) {
        permissionService.require(auth, "cards");
        return ResponseEntity.ok(adminCardService.getCreditRequests(status));
    }

    @PutMapping("/credit-requests/{requestId}/review")
    public ResponseEntity<CreditLimitRequestResponse> reviewRequest(Authentication auth,
                                                                     @PathVariable Long requestId,
                                                                     @Valid @RequestBody CreditLimitReviewRequest reviewReq) {
        permissionService.require(auth, "cards");
        Long adminId = (Long) auth.getCredentials();
        String adminEmail = auth.getName();
        CreditLimitRequestResponse resp = adminCardService.reviewCreditRequest(requestId, reviewReq, adminId);
        auditLogService.log(adminId, adminEmail, "REVIEW_CREDIT_REQUEST", "credit_limit_requests", requestId,
                "Reviewed credit limit request to " + reviewReq.getStatus(),
                Map.of("status", reviewReq.getStatus(), "adminNotes", reviewReq.getAdminNotes() != null ? reviewReq.getAdminNotes() : ""));
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{cardId}/override")
    public ResponseEntity<CardResponse> overrideCard(Authentication auth,
                                                      @PathVariable Long cardId,
                                                      @Valid @RequestBody CardOverrideRequest overrideReq) {
        permissionService.require(auth, "cards");
        Long adminId = (Long) auth.getCredentials();
        String adminEmail = auth.getName();
        CardResponse resp = adminCardService.overrideCard(cardId, overrideReq);
        auditLogService.log(adminId, adminEmail, "OVERRIDE_CARD", "cards", cardId,
                "Overrode card settings",
                Map.of("apr", overrideReq.getApr() != null ? overrideReq.getApr().toString() : "",
                       "creditLimit", overrideReq.getCreditLimit() != null ? overrideReq.getCreditLimit().toString() : ""));
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{cardId}/adjust-balance")
    public ResponseEntity<CardResponse> adjustBalance(Authentication auth,
                                                       @PathVariable Long cardId,
                                                       @Valid @RequestBody BalanceAdjustRequest adjustReq) {
        permissionService.require(auth, "cards");
        Long adminId = (Long) auth.getCredentials();
        String adminEmail = auth.getName();
        CardResponse resp = adminCardService.adjustBalance(cardId, adjustReq);
        auditLogService.log(adminId, adminEmail, "ADJUST_BALANCE", "cards", cardId,
                "Adjusted outstanding balance by " + adjustReq.getAmount(),
                Map.of("amount", adjustReq.getAmount().toString(), "reason", adjustReq.getReason()));
        return ResponseEntity.ok(resp);
    }
}
