package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "customer_bills")
public class CustomerBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bill_id")
    private Long billId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "biller_name", nullable = false)
    private String billerName;

    @Column(name = "bill_type", nullable = false, length = 50)
    private String billType;

    @Column(precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(length = 20)
    private String frequency;

    @Column(name = "auto_pay", nullable = false)
    private Boolean autoPay = false;

    @Column(name = "source_account_id")
    private Long sourceAccountId;

    @Column(name = "target_account_id")
    private Long targetAccountId;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "last_paid_at")
    private OffsetDateTime lastPaidAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getBillId() { return billId; }
    public void setBillId(Long billId) { this.billId = billId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public String getBillerName() { return billerName; }
    public void setBillerName(String billerName) { this.billerName = billerName; }
    public String getBillType() { return billType; }
    public void setBillType(String billType) { this.billType = billType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public Boolean getAutoPay() { return autoPay; }
    public void setAutoPay(Boolean autoPay) { this.autoPay = autoPay; }
    public Long getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(Long sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public Long getTargetAccountId() { return targetAccountId; }
    public void setTargetAccountId(Long targetAccountId) { this.targetAccountId = targetAccountId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getLastPaidAt() { return lastPaidAt; }
    public void setLastPaidAt(OffsetDateTime lastPaidAt) { this.lastPaidAt = lastPaidAt; }
}
