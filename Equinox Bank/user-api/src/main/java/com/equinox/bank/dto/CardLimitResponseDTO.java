package com.equinox.bank.dto;

import java.math.BigDecimal;

public record CardLimitResponseDTO(
    Long limitId, Long cardId, BigDecimal dailyLimit, BigDecimal monthlyLimit,
    Boolean allowInternational, Boolean allowOnline) {}
