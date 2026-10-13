package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class RefundResponse {

    private Long refundId;
    private Long originalTransactionId;
    private BigDecimal refundAmount;
    private String reason;
    private String comment;
    private String status;
    private String remarks;
    private String customerName;
    private String email;
    private OffsetDateTime processedAt;
    private OffsetDateTime reviewedAt;

    public RefundResponse(Long refundId, Long originalTransactionId, BigDecimal refundAmount,
                          String reason, String comment, String status,
                          String remarks, String customerName, String email,
                          OffsetDateTime processedAt, OffsetDateTime reviewedAt) {
        this.refundId = refundId;
        this.originalTransactionId = originalTransactionId;
        this.refundAmount = refundAmount;
        this.reason = reason;
        this.comment = comment;
        this.status = status;
        this.remarks = remarks;
        this.customerName = customerName;
        this.email = email;
        this.processedAt = processedAt;
        this.reviewedAt = reviewedAt;
    }

    public Long getRefundId() { return refundId; }
    public void setRefundId(Long refundId) { this.refundId = refundId; }
    public Long getOriginalTransactionId() { return originalTransactionId; }
    public void setOriginalTransactionId(Long originalTransactionId) { this.originalTransactionId = originalTransactionId; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime processedAt) { this.processedAt = processedAt; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
