package com.equinox.bank.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

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
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "reference_number", nullable = false, unique = true, length = 100)
    private String referenceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_id", nullable = false)
    private TransactionType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private TransactionCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_account_id")
    private Account sourceAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_account_id")
    private Account targetAccount;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "USD";

    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "transaction_date", nullable = false)
    private OffsetDateTime transactionDate = OffsetDateTime.now();

    public Transaction() {}

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public TransactionCategory getCategory() { return category; }
    public void setCategory(TransactionCategory category) { this.category = category; }

    public Account getSourceAccount() { return sourceAccount; }
    public void setSourceAccount(Account sourceAccount) { this.sourceAccount = sourceAccount; }

    public Account getTargetAccount() { return targetAccount; }
    public void setTargetAccount(Account targetAccount) { this.targetAccount = targetAccount; }

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
