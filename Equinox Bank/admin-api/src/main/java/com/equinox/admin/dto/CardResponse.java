package com.equinox.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class CardResponse {

    private Long cardId;
    private Long accountId;
    private String accountName;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String network;
    private String cardTypeName;
    private String cardNumber;
    private String cardholderName;
    private LocalDate expiryDate;
    private Boolean isFrozen;
    private LocalDateTime issuedAt;
    private BigDecimal creditLimit;
    private BigDecimal outstandingBalance;
    private BigDecimal apr;
    private LocalDate statementDate;
    private LocalDate dueDate;

    public CardResponse(Long cardId, Long accountId, String accountName, Long customerId,
                        String customerName, String customerEmail, String network, String cardTypeName,
                        String cardNumber, String cardholderName, LocalDate expiryDate,
                        Boolean isFrozen, LocalDateTime issuedAt, BigDecimal creditLimit,
                        BigDecimal outstandingBalance, BigDecimal apr, LocalDate statementDate,
                        LocalDate dueDate) {
        this.cardId = cardId;
        this.accountId = accountId;
        this.accountName = accountName;
        this.customerId = customerId;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.network = network;
        this.cardTypeName = cardTypeName;
        this.cardNumber = cardNumber;
        this.cardholderName = cardholderName;
        this.expiryDate = expiryDate;
        this.isFrozen = isFrozen;
        this.issuedAt = issuedAt;
        this.creditLimit = creditLimit;
        this.outstandingBalance = outstandingBalance;
        this.apr = apr;
        this.statementDate = statementDate;
        this.dueDate = dueDate;
    }

    public Long getCardId() { return cardId; }
    public void setCardId(Long cardId) { this.cardId = cardId; }
    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }
    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getNetwork() { return network; }
    public void setNetwork(String network) { this.network = network; }
    public String getCardTypeName() { return cardTypeName; }
    public void setCardTypeName(String cardTypeName) { this.cardTypeName = cardTypeName; }
    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }
    public String getCardholderName() { return cardholderName; }
    public void setCardholderName(String cardholderName) { this.cardholderName = cardholderName; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
    public Boolean getIsFrozen() { return isFrozen; }
    public void setIsFrozen(Boolean isFrozen) { this.isFrozen = isFrozen; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    public BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }
    public BigDecimal getApr() { return apr; }
    public void setApr(BigDecimal apr) { this.apr = apr; }
    public LocalDate getStatementDate() { return statementDate; }
    public void setStatementDate(LocalDate statementDate) { this.statementDate = statementDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}
