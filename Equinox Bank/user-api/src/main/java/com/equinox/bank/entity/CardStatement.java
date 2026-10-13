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
@Table(name = "card_statements")
public class CardStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "statement_id")
    private Long statementId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "starting_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal startingBalance;

    @Column(name = "ending_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal endingBalance;

    @Column(name = "minimum_payment", nullable = false, precision = 19, scale = 4)
    private BigDecimal minimumPayment;

    @Column(name = "paid", nullable = false)
    private Boolean paid = false;

    @Column(name = "payment_transaction_id")
    private Long paymentTransactionId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public CardStatement() {}

    public Long getStatementId() { return statementId; }
    public void setStatementId(Long statementId) { this.statementId = statementId; }
    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }
    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public BigDecimal getStartingBalance() { return startingBalance; }
    public void setStartingBalance(BigDecimal startingBalance) { this.startingBalance = startingBalance; }
    public BigDecimal getEndingBalance() { return endingBalance; }
    public void setEndingBalance(BigDecimal endingBalance) { this.endingBalance = endingBalance; }
    public BigDecimal getMinimumPayment() { return minimumPayment; }
    public void setMinimumPayment(BigDecimal minimumPayment) { this.minimumPayment = minimumPayment; }
    public Boolean getPaid() { return paid; }
    public void setPaid(Boolean paid) { this.paid = paid; }
    public Long getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(Long paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
