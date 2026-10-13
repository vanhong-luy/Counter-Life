package com.equinox.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class RefundReviewRequest {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "completed|rejected", message = "Status must be either completed or rejected")
    private String status;

    private String remarks;

    public RefundReviewRequest() {}

    public RefundReviewRequest(String status, String remarks) {
        this.status = status;
        this.remarks = remarks;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
