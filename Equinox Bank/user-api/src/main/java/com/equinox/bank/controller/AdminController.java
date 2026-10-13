package com.equinox.bank.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.AdminCustomerResponseDTO;
import com.equinox.bank.dto.AdminRefundResponseDTO;
import com.equinox.bank.dto.CustomerStatusUpdateRequestDTO;
import com.equinox.bank.dto.DashboardResponseDTO;
import com.equinox.bank.dto.KycDocumentAdminResponseDTO;
import com.equinox.bank.dto.KycReviewRequestDTO;
import com.equinox.bank.dto.KycReviewResponseDTO;
import com.equinox.bank.dto.LoanApprovalRequestDTO;
import com.equinox.bank.dto.LoanResponseDTO;
import com.equinox.bank.dto.TransactionResponseDTO;
import com.equinox.bank.service.AdminService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/admin")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponseDTO> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboard());
    }

    @GetMapping("/kyc")
    public ResponseEntity<List<KycDocumentAdminResponseDTO>> getKycQueue() {
        return ResponseEntity.ok(adminService.getKycQueue());
    }

    @PutMapping("/kyc/{documentId}/review")
    public ResponseEntity<KycReviewResponseDTO> reviewKyc(
            @PathVariable Long documentId,
            Authentication authentication,
            @Valid @RequestBody KycReviewRequestDTO dto) {
        return ResponseEntity.ok(adminService.reviewKyc(documentId, authentication.getName(), dto));
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminCustomerResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminCustomerResponseDTO> getUserDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserDetail(id));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<AdminCustomerResponseDTO> updateCustomerStatus(
            @PathVariable Long id,
            @RequestBody CustomerStatusUpdateRequestDTO dto) {
        return ResponseEntity.ok(adminService.updateCustomerStatus(id, dto));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponseDTO>> getAllTransactions() {
        return ResponseEntity.ok(adminService.getAllTransactions());
    }

    @GetMapping("/loans/pending")
    public ResponseEntity<List<LoanResponseDTO>> getPendingLoans() {
        return ResponseEntity.ok(adminService.getPendingLoans());
    }

    @PutMapping("/loans/{id}/review")
    public ResponseEntity<LoanResponseDTO> approveRejectLoan(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody LoanApprovalRequestDTO dto) {
        return ResponseEntity.ok(adminService.approveRejectLoan(id, authentication.getName(), dto));
    }

    @GetMapping("/refunds")
    public ResponseEntity<Map<String, Object>> getRefunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllRefunds(page, size));
    }

    @GetMapping("/refunds/{status}")
    public ResponseEntity<Map<String, Object>> getRefundsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getRefundsByStatus(status, page, size));
    }

    @PutMapping("/refunds/{id}/review")
    public ResponseEntity<AdminRefundResponseDTO> reviewRefund(
            @PathVariable Long id,
            Authentication authentication,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String remarks = body.get("remarks");
        return ResponseEntity.ok(adminService.reviewRefund(id, authentication.getName(), status, remarks));
    }
}
