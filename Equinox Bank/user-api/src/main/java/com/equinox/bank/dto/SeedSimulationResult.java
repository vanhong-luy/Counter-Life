package com.equinox.bank.dto;

public class SeedSimulationResult {

    private int customers;
    private int kycDocuments;
    private int accounts;
    private int deposits;
    private int withdrawals;
    private int transfers;
    private int cards;
    private int purchases;
    private int loans;
    private int collaterals;
    private int refunds;
    private int repayments;
    private int creditPayments;
    private int interestTransactions;
    private int cardStatements;
    private int creditRequests;
    private int cardStatusChanges;
    private int billPayments;
    private long timeTakenMs;

    public int getCustomers() { return customers; }
    public void setCustomers(int customers) { this.customers = customers; }

    public int getKycDocuments() { return kycDocuments; }
    public void setKycDocuments(int kycDocuments) { this.kycDocuments = kycDocuments; }

    public int getAccounts() { return accounts; }
    public void setAccounts(int accounts) { this.accounts = accounts; }

    public int getDeposits() { return deposits; }
    public void setDeposits(int deposits) { this.deposits = deposits; }

    public int getWithdrawals() { return withdrawals; }
    public void setWithdrawals(int withdrawals) { this.withdrawals = withdrawals; }

    public int getTransfers() { return transfers; }
    public void setTransfers(int transfers) { this.transfers = transfers; }

    public int getCards() { return cards; }
    public void setCards(int cards) { this.cards = cards; }

    public int getPurchases() { return purchases; }
    public void setPurchases(int purchases) { this.purchases = purchases; }

    public int getLoans() { return loans; }
    public void setLoans(int loans) { this.loans = loans; }

    public int getCollaterals() { return collaterals; }
    public void setCollaterals(int collaterals) { this.collaterals = collaterals; }

    public int getRefunds() { return refunds; }
    public void setRefunds(int refunds) { this.refunds = refunds; }

    public int getRepayments() { return repayments; }
    public void setRepayments(int repayments) { this.repayments = repayments; }

    public int getCreditPayments() { return creditPayments; }
    public void setCreditPayments(int creditPayments) { this.creditPayments = creditPayments; }

    public int getInterestTransactions() { return interestTransactions; }
    public void setInterestTransactions(int interestTransactions) { this.interestTransactions = interestTransactions; }

    public int getCardStatements() { return cardStatements; }
    public void setCardStatements(int cardStatements) { this.cardStatements = cardStatements; }

    public int getCreditRequests() { return creditRequests; }
    public void setCreditRequests(int creditRequests) { this.creditRequests = creditRequests; }

    public int getCardStatusChanges() { return cardStatusChanges; }
    public void setCardStatusChanges(int cardStatusChanges) { this.cardStatusChanges = cardStatusChanges; }

    public int getBillPayments() { return billPayments; }
    public void setBillPayments(int billPayments) { this.billPayments = billPayments; }

    public long getTimeTakenMs() { return timeTakenMs; }
    public void setTimeTakenMs(long timeTakenMs) { this.timeTakenMs = timeTakenMs; }
}
