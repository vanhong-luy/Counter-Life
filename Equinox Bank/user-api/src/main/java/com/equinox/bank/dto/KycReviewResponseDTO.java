package com.equinox.bank.dto;

import java.time.LocalDateTime;

public record KycReviewResponseDTO(
    Long reviewId, Long documentId, Long adminId, String status,
    String remarks, LocalDateTime reviewedAt) {}
