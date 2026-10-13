package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LoanRepaymentResponseDTO(
    Long repaymentId, Long loanId, Long transactionId,
    BigDecimal amountPaid, LocalDateTime paymentDate,
    BigDecimal interestPaid, BigDecimal principalPaid, BigDecimal lateFeePaid,
    BigDecimal overpaymentReturned) {}
