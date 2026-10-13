package com.equinox.admin.dto;

import java.math.BigDecimal;

public class LoanTypeSettingsRequest {

    private String typeName;
    private BigDecimal baseInterestRate;
    private BigDecimal lateFee;

    public LoanTypeSettingsRequest() {}

    public LoanTypeSettingsRequest(String typeName, BigDecimal baseInterestRate, BigDecimal lateFee) {
        this.typeName = typeName;
        this.baseInterestRate = baseInterestRate;
        this.lateFee = lateFee;
    }

    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }

    public BigDecimal getBaseInterestRate() { return baseInterestRate; }
    public void setBaseInterestRate(BigDecimal baseInterestRate) { this.baseInterestRate = baseInterestRate; }

    public BigDecimal getLateFee() { return lateFee; }
    public void setLateFee(BigDecimal lateFee) { this.lateFee = lateFee; }
}
