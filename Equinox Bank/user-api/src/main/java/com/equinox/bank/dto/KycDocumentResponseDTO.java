package com.equinox.bank.dto;

import java.time.LocalDateTime;

public record KycDocumentResponseDTO(
    Long documentId, Long customerId, String documentType,
    String documentUrl, String backUrl, LocalDateTime uploadedAt,
    String reviewStatus, String remarks) {}
