package com.equinox.bank.dto;

import java.math.BigDecimal;

public record CardLimitUpdateRequestDTO(
    BigDecimal dailyLimit, BigDecimal monthlyLimit,
    Boolean allowInternational, Boolean allowOnline) {}
