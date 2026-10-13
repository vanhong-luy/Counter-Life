package com.equinox.bank.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.dto.CategorySpendingDTO;
import com.equinox.bank.dto.SpendingSummaryDTO;
import com.equinox.bank.service.AnalyticsService;

@RestController
@RequestMapping("/auth/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/spending")
    public ResponseEntity<SpendingSummaryDTO> getMonthlySpendingSummary(
            Authentication authentication,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) Long accountId) {
        return ResponseEntity.ok(analyticsService.getMonthlySpendingSummary(
                authentication.getName(), startDate, endDate, accountId));
    }

    @GetMapping("/spending/categories")
    public ResponseEntity<List<CategorySpendingDTO>> getSpendingByCategories(
            Authentication authentication,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) Long accountId) {
        return ResponseEntity.ok(analyticsService.getSpendingByCategories(
                authentication.getName(), startDate, endDate, accountId));
    }

    @GetMapping("/income-vs-expense")
    public ResponseEntity<List<SpendingSummaryDTO>> getIncomeVsExpense(
            Authentication authentication,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) Long accountId) {
        return ResponseEntity.ok(analyticsService.getIncomeVsExpense(
                authentication.getName(), startDate, endDate, accountId));
    }
}
