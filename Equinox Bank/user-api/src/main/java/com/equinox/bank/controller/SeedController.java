package com.equinox.bank.controller;

import com.equinox.bank.dto.SeedSimulationRequest;
import com.equinox.bank.dto.SeedSimulationStatus;
import com.equinox.bank.service.SeedSimulatorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth/admin/seed")
public class SeedController {

    private final SeedSimulatorService seedSimulatorService;

    public SeedController(SeedSimulatorService seedSimulatorService) {
        this.seedSimulatorService = seedSimulatorService;
    }

    @PostMapping("/simulate")
    public ResponseEntity<Map<String, String>> startSimulation(@Valid @RequestBody SeedSimulationRequest request) {
        UUID jobId = seedSimulatorService.startSimulation(request);
        return ResponseEntity.accepted().body(Map.of("jobId", jobId.toString()));
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<SeedSimulationStatus> getStatus(@PathVariable UUID jobId) {
        return seedSimulatorService.getStatus(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
