package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "card_transactions")
public class CardTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cxn_id") private Long cxnId;
    @Column(name = "card_id", nullable = false) private Long cardId;
    @Column(nullable = false, precision = 19, scale = 4) private BigDecimal amount;
    @Column(length = 255) private String merchant;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "transaction_date", nullable = false) private LocalDateTime transactionDate = LocalDateTime.now();
    @Column(name = "statement_id") private Long statementId;
    @Column(name = "transaction_id") private Long transactionId;

    public Long getCxnId() { return cxnId; }
    public void setCxnId(Long v) { cxnId = v; }
    public Long getCardId() { return cardId; }
    public void setCardId(Long v) { cardId = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { amount = v; }
    public String getMerchant() { return merchant; }
    public void setMerchant(String v) { merchant = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime v) { transactionDate = v; }
    public Long getStatementId() { return statementId; }
    public void setStatementId(Long v) { statementId = v; }
    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long v) { transactionId = v; }
}
