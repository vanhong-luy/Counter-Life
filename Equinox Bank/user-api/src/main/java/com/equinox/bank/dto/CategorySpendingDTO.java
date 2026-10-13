package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.util.List;

public record CategorySpendingDTO(
    String categoryName, BigDecimal totalAmount, long transactionCount,
    List<TransactionSummaryItem> topTransactions) {

    public record TransactionSummaryItem(
        String referenceNumber, String description,
        BigDecimal amount, String date) {}
}