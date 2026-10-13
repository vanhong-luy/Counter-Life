package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class CreditLimitRequestResponse {

    private Long requestId;
    private Long cardId;
    private String cardNumber;
    private Long customerId;
    private String customerName;
    private BigDecimal currentLimit;
    private BigDecimal requestedLimit;
    private String reason;
    private String status;
    private Long adminId;
    private String adminEmail;
    private String adminNotes;
    private OffsetDateTime createdAt;
    private OffsetDateTime reviewedAt;

    public CreditLimitRequestResponse(Long requestId, Long cardId, String cardNumber,
                                       Long customerId, String customerName,
                                       BigDecimal currentLimit, BigDecimal requestedLimit,
                                       String reason, String status, Long adminId,
                                       String adminEmail, String adminNotes,
                                       OffsetDateTime createdAt, OffsetDateTime reviewedAt) {
        this.requestId = requestId;
        this.cardId = cardId;
        this.cardNumber = cardNumber;
        this.customerId = customerId;
        this.customerName = customerName;
        this.currentLimit = currentLimit;
        this.requestedLimit = requestedLimit;
        this.reason = reason;
        this.status = status;
        this.adminId = adminId;
        this.adminEmail = adminEmail;
        this.adminNotes = adminNotes;
        this.createdAt = createdAt;
        this.reviewedAt = reviewedAt;
    }

    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }
    public Long getCardId() { return cardId; }
    public void setCardId(Long cardId) { this.cardId = cardId; }
    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public BigDecimal getCurrentLimit() { return currentLimit; }
    public void setCurrentLimit(BigDecimal currentLimit) { this.currentLimit = currentLimit; }
    public BigDecimal getRequestedLimit() { return requestedLimit; }
    public void setRequestedLimit(BigDecimal requestedLimit) { this.requestedLimit = requestedLimit; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
