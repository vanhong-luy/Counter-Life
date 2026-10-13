package com.equinox.bank.dto;

public record CustomerStatusUpdateRequestDTO(
    String kycStatus, Integer creditScore) {}
