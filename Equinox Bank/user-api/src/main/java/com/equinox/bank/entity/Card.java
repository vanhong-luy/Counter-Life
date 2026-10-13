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
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "card_id")
    private Long cardId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_type_id", nullable = false)
    private CardType cardType;

    @Column(name = "card_number", nullable = false, unique = true, length = 16, columnDefinition = "CHAR(16)")
    private String cardNumber;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "cvv_hash", nullable = false, length = 255)
    private String cvvHash;

    @Column(name = "credit_limit", precision = 19, scale = 4)
    private BigDecimal creditLimit;

    @Column(name = "outstanding_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @Column(name = "apr", precision = 5, scale = 4)
    private BigDecimal apr;

    @Column(name = "statement_date")
    private LocalDate statementDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "is_frozen", nullable = false)
    private Boolean isFrozen = false;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt = LocalDateTime.now();

    public Card() {}

    public Long getCardId() { return cardId; }
    public void setCardId(Long cardId) { this.cardId = cardId; }
    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }
    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }
    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
    public String getCvvHash() { return cvvHash; }
    public void setCvvHash(String cvvHash) { this.cvvHash = cvvHash; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    public BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }
    public BigDecimal getApr() { return apr; }
    public void setApr(BigDecimal apr) { this.apr = apr; }
    public LocalDate getStatementDate() { return statementDate; }
    public void setStatementDate(LocalDate statementDate) { this.statementDate = statementDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public Boolean getIsFrozen() { return isFrozen; }
    public void setIsFrozen(Boolean isFrozen) { this.isFrozen = isFrozen; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
}
