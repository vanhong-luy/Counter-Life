package com.equinox.bank.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "card_transactions")
public class CardTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cxn_id")
    private Long cxnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(length = 255)
    private String merchant;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "transaction_date", nullable = false)
    private LocalDateTime transactionDate = LocalDateTime.now();

    @Column(name = "statement_id")
    private Long statementId;

    @Column(name = "transaction_id")
    private Long transactionId;

    public CardTransaction() {}

    public Long getCxnId() { return cxnId; }
    public void setCxnId(Long cxnId) { this.cxnId = cxnId; }
    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }
    public Long getStatementId() { return statementId; }
    public void setStatementId(Long statementId) { this.statementId = statementId; }
    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }
}
