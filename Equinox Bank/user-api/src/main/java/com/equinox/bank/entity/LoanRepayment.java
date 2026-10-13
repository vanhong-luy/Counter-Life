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
@Table(name = "loan_repayments")
public class LoanRepayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "repayment_id")
    private Long repaymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @Column(name = "amount_paid", nullable = false, precision = 19, scale = 4)
    private BigDecimal amountPaid;

    @Column(name = "payment_date", nullable = false)
    private LocalDateTime paymentDate = LocalDateTime.now();

    @Column(name = "interest_paid", precision = 19, scale = 4)
    private BigDecimal interestPaid = BigDecimal.ZERO;

    @Column(name = "principal_paid", precision = 19, scale = 4)
    private BigDecimal principalPaid = BigDecimal.ZERO;

    @Column(name = "late_fee_paid", precision = 19, scale = 4)
    private BigDecimal lateFeePaid = BigDecimal.ZERO;

    public LoanRepayment() {}

    public Long getRepaymentId() { return repaymentId; }
    public void setRepaymentId(Long repaymentId) { this.repaymentId = repaymentId; }

    public Loan getLoan() { return loan; }
    public void setLoan(Loan loan) { this.loan = loan; }

    public Transaction getTransaction() { return transaction; }
    public void setTransaction(Transaction transaction) { this.transaction = transaction; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }

    public BigDecimal getInterestPaid() { return interestPaid; }
    public void setInterestPaid(BigDecimal interestPaid) { this.interestPaid = interestPaid; }

    public BigDecimal getPrincipalPaid() { return principalPaid; }
    public void setPrincipalPaid(BigDecimal principalPaid) { this.principalPaid = principalPaid; }

    public BigDecimal getLateFeePaid() { return lateFeePaid; }
    public void setLateFeePaid(BigDecimal lateFeePaid) { this.lateFeePaid = lateFeePaid; }
}
