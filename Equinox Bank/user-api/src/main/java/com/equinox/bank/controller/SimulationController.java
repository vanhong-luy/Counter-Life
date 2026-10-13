package com.equinox.bank.controller;

import com.equinox.bank.service.TimeSkipService;
import com.equinox.bank.service.TimeSkipService.SimulationResult;
import com.equinox.bank.service.BillService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth/sim")
public class SimulationController {

    private final TimeSkipService timeSkipService;
    private final BillService billService;

    public SimulationController(TimeSkipService timeSkipService, BillService billService) {
        this.timeSkipService = timeSkipService;
        this.billService = billService;
    }

    @PostMapping("/time-skip")
    public ResponseEntity<?> timeSkip(Authentication authentication,
                                       @RequestParam(defaultValue = "1") int months) {
        try {
            SimulationResult result = timeSkipService.simulate(authentication.getName(), months);
            return ResponseEntity.ok(Map.of(
                    "monthsSkipped", result.monthsSkipped(),
                    "interestEarned", result.interestEarned(),
                    "feesCharged", result.feesCharged(),
                    "loanInterestAccrued", result.loanInterestAccrued(),
                    "incomeGenerated", result.incomeGenerated(),
                    "transactionsCreated", result.transactionsCreated()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/process-auto-pay")
    public ResponseEntity<?> processAutoPay(Authentication authentication) {
        try {
            int processed = billService.processAutoPayBills(authentication.getName());
            return ResponseEntity.ok(Map.of("autoPayProcessed", processed));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
