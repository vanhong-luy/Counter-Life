package com.equinox.bank.dto;

import java.time.LocalDateTime;

public record AdminCustomerResponseDTO(
    Long customerId, String firstName, String lastName, String email,
    String phoneNumber, String kycStatus, Integer creditScore,
    LocalDateTime createdAt, String profilePhotoUrl) {}
