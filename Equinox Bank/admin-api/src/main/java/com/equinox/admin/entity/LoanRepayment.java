package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loan_repayments")
public class LoanRepayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "repayment_id") private Long repaymentId;
    @Column(name = "loan_id", nullable = false) private Long loanId;
    @Column(name = "transaction_id", nullable = false) private Long transactionId;
    @Column(name = "amount_paid", nullable = false, precision = 19, scale = 4) private BigDecimal amountPaid;
    @Column(name = "payment_date", nullable = false) private LocalDateTime paymentDate = LocalDateTime.now();
    @Column(name = "interest_paid", precision = 19, scale = 4) private BigDecimal interestPaid = BigDecimal.ZERO;
    @Column(name = "principal_paid", precision = 19, scale = 4) private BigDecimal principalPaid = BigDecimal.ZERO;

    public Long getRepaymentId() { return repaymentId; }
    public void setRepaymentId(Long v) { repaymentId = v; }
    public Long getLoanId() { return loanId; }
    public void setLoanId(Long v) { loanId = v; }
    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long v) { transactionId = v; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal v) { amountPaid = v; }
    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime v) { paymentDate = v; }
    public BigDecimal getInterestPaid() { return interestPaid; }
    public void setInterestPaid(BigDecimal v) { interestPaid = v; }
    public BigDecimal getPrincipalPaid() { return principalPaid; }
    public void setPrincipalPaid(BigDecimal v) { principalPaid = v; }
}
