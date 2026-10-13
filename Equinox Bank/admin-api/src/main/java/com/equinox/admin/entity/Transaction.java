package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "reference_number", nullable = false, unique = true, length = 100)
    private String referenceNumber;

    @Column(name = "type_id", nullable = false)
    private Integer typeId;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "source_account_id")
    private Long sourceAccountId;

    @Column(name = "target_account_id")
    private Long targetAccountId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency = "USD";

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "transaction_date", nullable = false)
    private OffsetDateTime transactionDate;

    @PrePersist
    protected void onCreate() {
        if (transactionDate == null) transactionDate = OffsetDateTime.now();
        if (referenceNumber == null) referenceNumber = "REF-" + System.currentTimeMillis();
    }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }
    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
    public Integer getTypeId() { return typeId; }
    public void setTypeId(Integer typeId) { this.typeId = typeId; }
    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }
    public Long getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(Long sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public Long getTargetAccountId() { return targetAccountId; }
    public void setTargetAccountId(Long targetAccountId) { this.targetAccountId = targetAccountId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(OffsetDateTime transactionDate) { this.transactionDate = transactionDate; }
}
