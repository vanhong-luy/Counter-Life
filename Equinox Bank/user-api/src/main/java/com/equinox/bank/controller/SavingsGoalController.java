package com.equinox.bank.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.SavingsGoalActionRequestDTO;
import com.equinox.bank.dto.SavingsGoalRequestDTO;
import com.equinox.bank.dto.SavingsGoalResponseDTO;
import com.equinox.bank.service.SavingsGoalService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/savings-goals")
public class SavingsGoalController {

    private final SavingsGoalService savingsGoalService;

    @Autowired
    public SavingsGoalController(SavingsGoalService savingsGoalService) {
        this.savingsGoalService = savingsGoalService;
    }

    @GetMapping
    public ResponseEntity<List<SavingsGoalResponseDTO>> getGoals(Authentication authentication) {
        return ResponseEntity.ok(savingsGoalService.getGoals(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<SavingsGoalResponseDTO> createGoal(Authentication authentication,
                                                              @Valid @RequestBody SavingsGoalRequestDTO dto) {
        SavingsGoalResponseDTO response = savingsGoalService.createGoal(authentication.getName(), dto);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<SavingsGoalResponseDTO> deposit(Authentication authentication,
                                                           @PathVariable Long id,
                                                           @Valid @RequestBody SavingsGoalActionRequestDTO dto) {
        SavingsGoalResponseDTO response = savingsGoalService.deposit(authentication.getName(), id, dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<SavingsGoalResponseDTO> withdraw(Authentication authentication,
                                                            @PathVariable Long id,
                                                            @Valid @RequestBody SavingsGoalActionRequestDTO dto) {
        SavingsGoalResponseDTO response = savingsGoalService.withdraw(authentication.getName(), id, dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelGoal(Authentication authentication, @PathVariable Long id) {
        savingsGoalService.cancelGoal(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
