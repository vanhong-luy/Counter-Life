package com.equinox.bank.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    @Column(name = "amount", precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "frequency", length = 20)
    private String frequency;

    @Column(name = "auto_pay", nullable = false)
    private Boolean autoPay = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_account_id")
    private Account sourceAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_account_id")
    private Account targetAccount;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_paid_at")
    private LocalDateTime lastPaidAt;

    public CustomerBill() {}

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

    public Account getSourceAccount() { return sourceAccount; }
    public void setSourceAccount(Account sourceAccount) { this.sourceAccount = sourceAccount; }

    public Account getTargetAccount() { return targetAccount; }
    public void setTargetAccount(Account targetAccount) { this.targetAccount = targetAccount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastPaidAt() { return lastPaidAt; }
    public void setLastPaidAt(LocalDateTime lastPaidAt) { this.lastPaidAt = lastPaidAt; }
}
