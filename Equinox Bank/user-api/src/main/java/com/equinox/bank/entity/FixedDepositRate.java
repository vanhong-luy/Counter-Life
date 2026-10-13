package com.equinox.bank.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "fixed_deposit_rates")
public class FixedDepositRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rate_id")
    private Integer rateId;

    @Column(name = "term_months", nullable = false, unique = true)
    private Integer termMonths;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal interestRate;

    public FixedDepositRate() {}

    public FixedDepositRate(Integer termMonths, BigDecimal interestRate) {
        this.termMonths = termMonths;
        this.interestRate = interestRate;
    }

    public Integer getRateId() { return rateId; }
    public void setRateId(Integer rateId) { this.rateId = rateId; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
}
