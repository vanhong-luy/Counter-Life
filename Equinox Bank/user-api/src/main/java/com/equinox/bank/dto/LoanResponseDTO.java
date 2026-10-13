package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record LoanResponseDTO(
    Long loanId, Long customerId, String loanTypeName, Long approvedBy,
    BigDecimal principalAmount, BigDecimal outstandingBalance, BigDecimal lateFeesOwed,
    BigDecimal interestRate, Integer loanTermMonths, String status,
    String remarks, String purpose,
    LocalDateTime appliedAt, LocalDateTime approvedAt, LocalDate lastInterestDate,
    NextPaymentDTO nextPayment) {

    public record NextPaymentDTO(BigDecimal amount, LocalDate dueDate, String apr) {}
}
