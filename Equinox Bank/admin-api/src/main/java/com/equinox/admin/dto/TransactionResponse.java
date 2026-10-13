package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class TransactionResponse {

    private Long transactionId;
    private String referenceNumber;
    private String typeName;
    private String categoryName;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String description;
    private OffsetDateTime transactionDate;
    private Long sourceAccountId;
    private Long targetAccountId;
    private String sourceAccountNumber;
    private String targetAccountNumber;
    private String sourceAccountName;
    private String targetAccountName;

    public TransactionResponse(Long transactionId, String referenceNumber, String typeName,
                                String categoryName, BigDecimal amount, String currency, String status,
                                String description, OffsetDateTime transactionDate,
                                Long sourceAccountId, Long targetAccountId,
                                String sourceAccountNumber, String targetAccountNumber,
                                String sourceAccountName, String targetAccountName) {
        this.transactionId = transactionId;
        this.referenceNumber = referenceNumber;
        this.typeName = typeName;
        this.categoryName = categoryName;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.description = description;
        this.transactionDate = transactionDate;
        this.sourceAccountId = sourceAccountId;
        this.targetAccountId = targetAccountId;
        this.sourceAccountNumber = sourceAccountNumber;
        this.targetAccountNumber = targetAccountNumber;
        this.sourceAccountName = sourceAccountName;
        this.targetAccountName = targetAccountName;
    }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }
    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
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
    public Long getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(Long sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public Long getTargetAccountId() { return targetAccountId; }
    public void setTargetAccountId(Long targetAccountId) { this.targetAccountId = targetAccountId; }
    public String getSourceAccountNumber() { return sourceAccountNumber; }
    public void setSourceAccountNumber(String sourceAccountNumber) { this.sourceAccountNumber = sourceAccountNumber; }
    public String getTargetAccountNumber() { return targetAccountNumber; }
    public void setTargetAccountNumber(String targetAccountNumber) { this.targetAccountNumber = targetAccountNumber; }
    public String getSourceAccountName() { return sourceAccountName; }
    public void setSourceAccountName(String sourceAccountName) { this.sourceAccountName = sourceAccountName; }
    public String getTargetAccountName() { return targetAccountName; }
    public void setTargetAccountName(String targetAccountName) { this.targetAccountName = targetAccountName; }
}
