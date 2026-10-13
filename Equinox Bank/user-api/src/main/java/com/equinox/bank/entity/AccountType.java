package com.equinox.bank.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "account_types")
public class AccountType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_type_id")
    private Integer accountTypeId;

    @Column(name = "type_name", nullable = false, unique = true, length = 50)
    private String typeName;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal interestRate = BigDecimal.ZERO;

    @Column(name = "maintenance_fee", nullable = false, precision = 19, scale = 4)
    private BigDecimal maintenanceFee = BigDecimal.ZERO;

    public AccountType() {}

    public Integer getAccountTypeId() { return accountTypeId; }
    public void setAccountTypeId(Integer accountTypeId) { this.accountTypeId = accountTypeId; }

    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public BigDecimal getMaintenanceFee() { return maintenanceFee; }
    public void setMaintenanceFee(BigDecimal maintenanceFee) { this.maintenanceFee = maintenanceFee; }
}
