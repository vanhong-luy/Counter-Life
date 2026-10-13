package com.equinox.bank.dto;

import java.time.LocalDate;

public record ProfileUpdateRequestDTO(
    String firstName, String lastName, String phoneNumber,
    LocalDate dateOfBirth, String address) {}
