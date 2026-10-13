package com.equinox.bank.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "refunds")
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_id")
    private Long refundId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_transaction_id", nullable = false)
    private Transaction originalTransaction;

    @Column(name = "refund_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal refundAmount;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "user_comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "admin_remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt = LocalDateTime.now();

    public Refund() {}

    public Long getRefundId() { return refundId; }
    public void setRefundId(Long refundId) { this.refundId = refundId; }

    public Transaction getOriginalTransaction() { return originalTransaction; }
    public void setOriginalTransaction(Transaction originalTransaction) { this.originalTransaction = originalTransaction; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }
}
