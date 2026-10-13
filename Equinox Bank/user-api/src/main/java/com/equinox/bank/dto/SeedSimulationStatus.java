package com.equinox.bank.dto;

import java.util.UUID;

public class SeedSimulationStatus {

    private UUID jobId;
    private String status;
    private String currentStep;
    private int currentItem;
    private int totalItems;
    private SeedSimulationResult result;
    private String errorMessage;

    public UUID getJobId() { return jobId; }
    public void setJobId(UUID jobId) { this.jobId = jobId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrentStep() { return currentStep; }
    public void setCurrentStep(String currentStep) { this.currentStep = currentStep; }

    public int getCurrentItem() { return currentItem; }
    public void setCurrentItem(int currentItem) { this.currentItem = currentItem; }

    public int getTotalItems() { return totalItems; }
    public void setTotalItems(int totalItems) { this.totalItems = totalItems; }

    public SeedSimulationResult getResult() { return result; }
    public void setResult(SeedSimulationResult result) { this.result = result; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
