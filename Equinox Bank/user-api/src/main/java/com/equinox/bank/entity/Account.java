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
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_id")
    private Long accountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_type_id", nullable = false)
    private AccountType accountType;

    @Column(name = "account_number", nullable = false, unique = true, length = 20)
    private String accountNumber;

    @Column(name = "balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "USD";

    @Column(name = "status", nullable = false, length = 20)
    private String status = "active";

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_account_id")
    private Account sourceAccount;

    @Column(name = "term_months")
    private Integer termMonths;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "principal_disposition", length = 30)
    private String principalDisposition;

    @Column(name = "matured", nullable = false)
    private Boolean matured = false;

    @Column(name = "last_interest_date")
    private LocalDateTime lastInterestDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Account() {}

    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsPrimary() { return isPrimary; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }

    public Account getSourceAccount() { return sourceAccount; }
    public void setSourceAccount(Account sourceAccount) { this.sourceAccount = sourceAccount; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public LocalDate getMaturityDate() { return maturityDate; }
    public void setMaturityDate(LocalDate maturityDate) { this.maturityDate = maturityDate; }

    public String getPrincipalDisposition() { return principalDisposition; }
    public void setPrincipalDisposition(String principalDisposition) { this.principalDisposition = principalDisposition; }

    public Boolean getMatured() { return matured; }
    public void setMatured(Boolean matured) { this.matured = matured; }

    public LocalDateTime getLastInterestDate() { return lastInterestDate; }
    public void setLastInterestDate(LocalDateTime lastInterestDate) { this.lastInterestDate = lastInterestDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Account other)) return false;
        return accountId != null && accountId.equals(other.accountId);
    }

    @Override
    public int hashCode() {
        return accountId != null ? accountId.hashCode() : getClass().hashCode();
    }
}
