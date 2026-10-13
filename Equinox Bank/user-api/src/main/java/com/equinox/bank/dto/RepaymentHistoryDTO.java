package com.equinox.bank.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RepaymentHistoryDTO(
    Long repaymentId, BigDecimal amountPaid, LocalDateTime paymentDate,
    BigDecimal outstandingAfter, BigDecimal interestPaid, BigDecimal principalPaid,
    BigDecimal lateFeePaid) {}
