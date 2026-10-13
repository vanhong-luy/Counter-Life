package com.equinox.admin.dto;

import java.math.BigDecimal;

public class AccountTypeSettingsRequest {

    private String typeName;
    private BigDecimal interestRate;
    private BigDecimal maintenanceFee;

    public AccountTypeSettingsRequest() {}

    public AccountTypeSettingsRequest(String typeName, BigDecimal interestRate, BigDecimal maintenanceFee) {
        this.typeName = typeName;
        this.interestRate = interestRate;
        this.maintenanceFee = maintenanceFee;
    }

    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public BigDecimal getMaintenanceFee() { return maintenanceFee; }
    public void setMaintenanceFee(BigDecimal maintenanceFee) { this.maintenanceFee = maintenanceFee; }
}
