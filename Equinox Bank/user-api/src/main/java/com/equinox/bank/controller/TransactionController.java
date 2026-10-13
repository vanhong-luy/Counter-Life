package com.equinox.bank.controller;

import java.util.Collections;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.DepositWithdrawRequestDTO;
import com.equinox.bank.dto.RefundRequestDTO;
import com.equinox.bank.dto.RefundResponseDTO;
import com.equinox.bank.dto.TransactionResponseDTO;
import com.equinox.bank.dto.TransferRequestDTO;
import com.equinox.bank.service.TransactionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponseDTO> deposit(
            @Valid @RequestBody DepositWithdrawRequestDTO dto,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(transactionService.deposit(email, dto));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponseDTO> withdraw(
            @Valid @RequestBody DepositWithdrawRequestDTO dto,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(transactionService.withdraw(email, dto));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponseDTO> transfer(
            @Valid @RequestBody TransferRequestDTO dto,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(transactionService.transfer(email, dto));
    }

    @PostMapping("/{id}/refund")
    public ResponseEntity<RefundResponseDTO> refund(
            @PathVariable Long id,
            @Valid @RequestBody RefundRequestDTO dto,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(transactionService.refund(email, id, dto));
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponseDTO>> getTransactionHistory(
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(transactionService.getTransactionHistory(email));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponseDTO> getTransactionById(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(transactionService.getTransactionById(email, id));
    }

    @GetMapping("/{id}/refund")
    public ResponseEntity<RefundResponseDTO> getRefundForTransaction(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        RefundResponseDTO refund = transactionService.getRefundForTransaction(email, id);
        if (refund == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(refund);
    }
}
