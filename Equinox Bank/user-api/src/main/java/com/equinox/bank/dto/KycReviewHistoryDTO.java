package com.equinox.bank.dto;

import java.time.LocalDateTime;

public record KycReviewHistoryDTO(
    Long reviewId, String documentType, String status,
    String remarks, String adminEmail, LocalDateTime reviewedAt) {}
