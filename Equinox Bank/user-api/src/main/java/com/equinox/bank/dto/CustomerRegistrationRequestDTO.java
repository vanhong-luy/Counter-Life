package com.equinox.bank.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerRegistrationRequestDTO(
    @NotBlank @Size(min = 2, max = 50) String firstName,
    @NotBlank @Size(min = 2, max = 50) String lastName,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password,
    String phoneNumber,
    LocalDate dateOfBirth,
    String address) {}
