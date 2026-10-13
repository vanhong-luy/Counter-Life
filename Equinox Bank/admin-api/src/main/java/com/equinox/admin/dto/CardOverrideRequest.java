package com.equinox.admin.dto;

import java.math.BigDecimal;

public class CardOverrideRequest {

    private BigDecimal apr;
    private BigDecimal creditLimit;

    public BigDecimal getApr() { return apr; }
    public void setApr(BigDecimal apr) { this.apr = apr; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
}
