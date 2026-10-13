package com.equinox.bank.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CustomerResponseDTO(
    Long customerId, String firstName, String lastName, String email,
    String phoneNumber, LocalDate dateOfBirth, String address,
    String kycStatus, Integer creditScore, LocalDateTime createdAt,
    String profilePhotoUrl) {}
