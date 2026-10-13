package com.equinox.bank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "credit_limit_requests")
public class CreditLimitRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @Column(name = "current_limit", nullable = false, precision = 19, scale = 4)
    private BigDecimal currentLimit;

    @Column(name = "requested_limit", nullable = false, precision = 19, scale = 4)
    private BigDecimal requestedLimit;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private AdminUser admin;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public CreditLimitRequest() {}

    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }
    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }
    public BigDecimal getCurrentLimit() { return currentLimit; }
    public void setCurrentLimit(BigDecimal currentLimit) { this.currentLimit = currentLimit; }
    public BigDecimal getRequestedLimit() { return requestedLimit; }
    public void setRequestedLimit(BigDecimal requestedLimit) { this.requestedLimit = requestedLimit; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public AdminUser getAdmin() { return admin; }
    public void setAdmin(AdminUser admin) { this.admin = admin; }
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
