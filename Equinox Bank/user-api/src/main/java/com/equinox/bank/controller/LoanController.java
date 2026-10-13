package com.equinox.bank.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.CollateralRequestDTO;
import com.equinox.bank.dto.CollateralResponseDTO;
import com.equinox.bank.dto.LoanApplicationRequestDTO;
import com.equinox.bank.dto.LoanRepaymentRequestDTO;
import com.equinox.bank.dto.LoanRepaymentResponseDTO;
import com.equinox.bank.dto.LoanResponseDTO;
import com.equinox.bank.service.LoanService;
import com.equinox.bank.service.R2StorageService;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.LoanTypeRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/loans")
public class LoanController {

    private final LoanService loanService;
    private final R2StorageService r2StorageService;
    private final CustomerRepository customerRepository;
    private final LoanTypeRepository loanTypeRepository;

    @Autowired
    public LoanController(LoanService loanService, R2StorageService r2StorageService,
                          CustomerRepository customerRepository, LoanTypeRepository loanTypeRepository) {
        this.loanService = loanService;
        this.r2StorageService = r2StorageService;
        this.customerRepository = customerRepository;
        this.loanTypeRepository = loanTypeRepository;
    }

    @GetMapping("/types")
    public ResponseEntity<List<java.util.Map<String, Object>>> getLoanTypes() {
        return ResponseEntity.ok(loanTypeRepository.findAll().stream()
                .map(lt -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("loanTypeId", lt.getLoanTypeId());
                    m.put("typeName", lt.getTypeName());
                    m.put("baseInterestRate", lt.getBaseInterestRate());
                    m.put("lateFee", lt.getLateFee());
                    return m;
                })
                .toList());
    }

    @PostMapping
    public ResponseEntity<LoanResponseDTO> applyForLoan(Authentication authentication,
                                                        @Valid @RequestBody LoanApplicationRequestDTO dto) {
        LoanResponseDTO response = loanService.applyForLoan(authentication.getName(), dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LoanResponseDTO> updateLoan(Authentication authentication,
                                                      @PathVariable Long id,
                                                      @Valid @RequestBody LoanApplicationRequestDTO dto) {
        LoanResponseDTO response = loanService.updateLoan(authentication.getName(), id, dto);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<LoanResponseDTO>> getCustomerLoans(Authentication authentication) {
        return ResponseEntity.ok(loanService.getCustomerLoans(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LoanResponseDTO> getLoan(Authentication authentication,
                                                   @PathVariable Long id) {
        return ResponseEntity.ok(loanService.getLoan(authentication.getName(), id));
    }

    @PostMapping("/{id}/repay")
    public ResponseEntity<LoanRepaymentResponseDTO> repayLoan(Authentication authentication,
                                                               @PathVariable Long id,
                                                               @Valid @RequestBody LoanRepaymentRequestDTO dto,
                                                               @RequestParam Long fromAccountId) {
        LoanRepaymentResponseDTO response = loanService.repayLoan(authentication.getName(), id, dto, fromAccountId);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/collateral/upload")
    public ResponseEntity<java.util.Map<String, String>> uploadCollateralDoc(Authentication authentication,
                                                                              @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        String email = authentication.getName();
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        String fileKey = r2StorageService.uploadFile(file, customer.getCustomerId().intValue());
        return ResponseEntity.ok(java.util.Map.of("fileKey", fileKey));
    }

    @PostMapping("/{id}/collateral")
    public ResponseEntity<CollateralResponseDTO> addCollateral(Authentication authentication,
                                                                @PathVariable Long id,
                                                                @Valid @RequestBody CollateralRequestDTO dto) {
        CollateralResponseDTO response = loanService.addCollateral(authentication.getName(), id, dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}/collateral")
    public ResponseEntity<List<CollateralResponseDTO>> getLoanCollateral(Authentication authentication,
                                                                           @PathVariable Long id) {
        return ResponseEntity.ok(loanService.getLoanCollateral(authentication.getName(), id));
    }

    @GetMapping("/{id}/repayments")
    public ResponseEntity<List<com.equinox.bank.dto.RepaymentHistoryDTO>> getLoanRepayments(
            Authentication authentication, @PathVariable Long id) {
        return ResponseEntity.ok(loanService.getLoanRepayments(authentication.getName(), id));
    }
}
