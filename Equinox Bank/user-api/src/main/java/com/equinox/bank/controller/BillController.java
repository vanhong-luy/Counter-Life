package com.equinox.bank.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.BillResponseDTO;
import com.equinox.bank.dto.CreateBillRequestDTO;
import com.equinox.bank.dto.PayBillRequestDTO;
import com.equinox.bank.service.BillService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/bills")
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @GetMapping
    public ResponseEntity<List<BillResponseDTO>> getBills(Authentication authentication) {
        return ResponseEntity.ok(billService.getBills(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<BillResponseDTO> createBill(Authentication authentication,
                                                       @Valid @RequestBody CreateBillRequestDTO dto) {
        BillResponseDTO response = billService.createBill(authentication.getName(), dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBill(Authentication authentication,
                                            @PathVariable Long id) {
        billService.deleteBill(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<BillResponseDTO> payBill(Authentication authentication,
                                                     @PathVariable Long id,
                                                     @Valid @RequestBody PayBillRequestDTO dto) {
        BillResponseDTO response = billService.payBill(authentication.getName(), id, dto);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/payees/lookup")
    public ResponseEntity<?> lookupPayee(Authentication authentication,
                                           @RequestParam String accountNumber) {
        Map<String, Object> result = billService.lookupPayee(authentication.getName(), accountNumber);
        if (result == null) {
            return ResponseEntity.ok(Map.of("found", false));
        }
        return ResponseEntity.ok(result);
    }
}
