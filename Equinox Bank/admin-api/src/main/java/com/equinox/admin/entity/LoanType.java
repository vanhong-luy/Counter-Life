package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "loan_types")
public class LoanType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "loan_type_id")
    private Integer loanTypeId;

    @Column(name = "type_name", nullable = false, unique = true, length = 50)
    private String typeName;

    @Column(name = "base_interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal baseInterestRate = BigDecimal.ZERO;

    @Column(name = "late_fee", nullable = false, precision = 19, scale = 4)
    private BigDecimal lateFee = new BigDecimal("25.00");

    public Integer getLoanTypeId() { return loanTypeId; }
    public void setLoanTypeId(Integer loanTypeId) { this.loanTypeId = loanTypeId; }
    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }
    public BigDecimal getBaseInterestRate() { return baseInterestRate; }
    public void setBaseInterestRate(BigDecimal baseInterestRate) { this.baseInterestRate = baseInterestRate; }
    public BigDecimal getLateFee() { return lateFee; }
    public void setLateFee(BigDecimal lateFee) { this.lateFee = lateFee; }
}
