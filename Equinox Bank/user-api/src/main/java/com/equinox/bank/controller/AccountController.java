package com.equinox.bank.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.AccountCreationRequestDTO;
import com.equinox.bank.dto.AccountNameUpdateRequestDTO;
import com.equinox.bank.dto.AccountResponseDTO;
import com.equinox.bank.entity.FixedDepositRate;
import com.equinox.bank.repository.AccountTypeRepository;
import com.equinox.bank.repository.FixedDepositRateRepository;
import com.equinox.bank.service.AccountService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/accounts")
public class AccountController {

    private final AccountService accountService;
    private final FixedDepositRateRepository fixedDepositRateRepository;
    private final AccountTypeRepository accountTypeRepository;

    public AccountController(AccountService accountService,
                             FixedDepositRateRepository fixedDepositRateRepository,
                             AccountTypeRepository accountTypeRepository) {
        this.accountService = accountService;
        this.fixedDepositRateRepository = fixedDepositRateRepository;
        this.accountTypeRepository = accountTypeRepository;
    }

    @GetMapping("/types")
    public ResponseEntity<List<java.util.Map<String, Object>>> getAccountTypes() {
        return ResponseEntity.ok(accountTypeRepository.findAll().stream()
                .map(at -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("accountTypeId", at.getAccountTypeId());
                    m.put("typeName", at.getTypeName());
                    m.put("interestRate", at.getInterestRate());
                    m.put("maintenanceFee", at.getMaintenanceFee());
                    return m;
                })
                .toList());
    }

    @PostMapping
    public ResponseEntity<AccountResponseDTO> createAccount(
            @Valid @RequestBody AccountCreationRequestDTO dto,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(accountService.createAccount(email, dto));
    }

    @GetMapping
    public ResponseEntity<List<AccountResponseDTO>> getAccounts(
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(accountService.getAccounts(email));
    }

    @GetMapping("/lookup")
    public ResponseEntity<AccountResponseDTO> lookupAccount(
            @RequestParam String accountNumber,
            Authentication authentication) {
        try {
            return ResponseEntity.ok(accountService.lookupByAccountNumber(accountNumber));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/fd-rates")
    public ResponseEntity<List<FixedDepositRate>> getFdRates(Authentication authentication) {
        return ResponseEntity.ok(fixedDepositRateRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponseDTO> getAccount(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(accountService.getAccount(email, id));
    }

    @PutMapping("/{id}/primary")
    public ResponseEntity<AccountResponseDTO> setPrimaryAccount(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(accountService.setPrimaryAccount(email, id));
    }

    @PutMapping("/{id}/name")
    public ResponseEntity<AccountResponseDTO> updateAccountName(
            @PathVariable Long id,
            @Valid @RequestBody AccountNameUpdateRequestDTO dto,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(accountService.updateAccountName(email, id, dto.name()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        accountService.deleteAccount(email, id);
        return ResponseEntity.noContent().build();
    }
}
