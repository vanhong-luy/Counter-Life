package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class LoanResponse {

    private Long loanId;
    private String customerName;
    private BigDecimal principalAmount;
    private String loanTypeName;
    private BigDecimal interestRate;
    private Integer loanTermMonths;
    private String status;
    private String remarks;
    private String purpose;
    private OffsetDateTime appliedAt;

    // Added fields for underwriter risk metrics
    private Integer creditScore;
    private BigDecimal dti;
    private BigDecimal ltv;
    private BigDecimal totalCollateralValue;
    private CreditScoreBreakdownResponse scoreBreakdown;

    public LoanResponse(Long loanId, String customerName, BigDecimal principalAmount, String loanTypeName,
                        BigDecimal interestRate, Integer loanTermMonths, String status, String remarks,
                        OffsetDateTime appliedAt) {
        this.loanId = loanId;
        this.customerName = customerName;
        this.principalAmount = principalAmount;
        this.loanTypeName = loanTypeName;
        this.interestRate = interestRate;
        this.loanTermMonths = loanTermMonths;
        this.status = status;
        this.remarks = remarks;
        this.purpose = null;
        this.appliedAt = appliedAt;
    }

    public LoanResponse(Long loanId, String customerName, BigDecimal principalAmount, String loanTypeName,
                        BigDecimal interestRate, Integer loanTermMonths, String status, String remarks,
                        String purpose, OffsetDateTime appliedAt, Integer creditScore, BigDecimal dti, BigDecimal ltv, BigDecimal totalCollateralValue) {
        this.loanId = loanId;
        this.customerName = customerName;
        this.principalAmount = principalAmount;
        this.loanTypeName = loanTypeName;
        this.interestRate = interestRate;
        this.loanTermMonths = loanTermMonths;
        this.status = status;
        this.remarks = remarks;
        this.purpose = purpose;
        this.appliedAt = appliedAt;
        this.creditScore = creditScore;
        this.dti = dti;
        this.ltv = ltv;
        this.totalCollateralValue = totalCollateralValue;
    }

    public LoanResponse(Long loanId, String customerName, BigDecimal principalAmount, String loanTypeName,
                        BigDecimal interestRate, Integer loanTermMonths, String status, String remarks,
                        String purpose, OffsetDateTime appliedAt, Integer creditScore, BigDecimal dti, BigDecimal ltv, BigDecimal totalCollateralValue,
                        CreditScoreBreakdownResponse scoreBreakdown) {
        this(loanId, customerName, principalAmount, loanTypeName, interestRate, loanTermMonths, status, remarks, purpose, appliedAt, creditScore, dti, ltv, totalCollateralValue);
        this.scoreBreakdown = scoreBreakdown;
    }

    public Long getLoanId() { return loanId; }
    public void setLoanId(Long loanId) { this.loanId = loanId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }
    public String getLoanTypeName() { return loanTypeName; }
    public void setLoanTypeName(String loanTypeName) { this.loanTypeName = loanTypeName; }
    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
    public Integer getLoanTermMonths() { return loanTermMonths; }
    public void setLoanTermMonths(Integer loanTermMonths) { this.loanTermMonths = loanTermMonths; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public OffsetDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(OffsetDateTime appliedAt) { this.appliedAt = appliedAt; }

    public Integer getCreditScore() { return creditScore; }
    public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
    public BigDecimal getDti() { return dti; }
    public void setDti(BigDecimal dti) { this.dti = dti; }
    public BigDecimal getLtv() { return ltv; }
    public void setLtv(BigDecimal ltv) { this.ltv = ltv; }
    public BigDecimal getTotalCollateralValue() { return totalCollateralValue; }
    public void setTotalCollateralValue(BigDecimal totalCollateralValue) { this.totalCollateralValue = totalCollateralValue; }

    public CreditScoreBreakdownResponse getScoreBreakdown() { return scoreBreakdown; }
    public void setScoreBreakdown(CreditScoreBreakdownResponse scoreBreakdown) { this.scoreBreakdown = scoreBreakdown; }
}
