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
@Table(name = "loans")
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "loan_id")
    private Long loanId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_type_id", nullable = false)
    private LoanType loanType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private AdminUser approvedBy;

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal principalAmount;

    @Column(name = "outstanding_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "loan_term_months", nullable = false)
    private Integer loanTermMonths;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt = LocalDateTime.now();

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "monthly_payment_amount", precision = 19, scale = 4)
    private BigDecimal monthlyPaymentAmount;

    @Column(name = "next_payment_due_date")
    private LocalDate nextPaymentDueDate;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "last_late_fee_charged")
    private LocalDate lastLateFeeCharged;

    @Column(name = "last_interest_date")
    private LocalDate lastInterestDate;

    @Column(name = "late_fees_owed", precision = 19, scale = 4)
    private BigDecimal lateFeesOwed = BigDecimal.ZERO;

    public Loan() {}

    public Long getLoanId() { return loanId; }
    public void setLoanId(Long loanId) { this.loanId = loanId; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public LoanType getLoanType() { return loanType; }
    public void setLoanType(LoanType loanType) { this.loanType = loanType; }

    public AdminUser getApprovedBy() { return approvedBy; }
    public void setApprovedBy(AdminUser approvedBy) { this.approvedBy = approvedBy; }

    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }

    public BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public Integer getLoanTermMonths() { return loanTermMonths; }
    public void setLoanTermMonths(Integer loanTermMonths) { this.loanTermMonths = loanTermMonths; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public BigDecimal getMonthlyPaymentAmount() { return monthlyPaymentAmount; }
    public void setMonthlyPaymentAmount(BigDecimal monthlyPaymentAmount) { this.monthlyPaymentAmount = monthlyPaymentAmount; }

    public LocalDate getNextPaymentDueDate() { return nextPaymentDueDate; }
    public void setNextPaymentDueDate(LocalDate nextPaymentDueDate) { this.nextPaymentDueDate = nextPaymentDueDate; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public LocalDate getLastLateFeeCharged() { return lastLateFeeCharged; }
    public void setLastLateFeeCharged(LocalDate lastLateFeeCharged) { this.lastLateFeeCharged = lastLateFeeCharged; }

    public LocalDate getLastInterestDate() { return lastInterestDate; }
    public void setLastInterestDate(LocalDate lastInterestDate) { this.lastInterestDate = lastInterestDate; }

    public BigDecimal getLateFeesOwed() { return lateFeesOwed; }
    public void setLateFeesOwed(BigDecimal lateFeesOwed) { this.lateFeesOwed = lateFeesOwed; }
}
