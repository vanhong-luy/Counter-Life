package com.equinox.bank.dto;

import java.time.LocalDateTime;

public record KycDocumentAdminResponseDTO(
    Long documentId, Long customerId, String customerName,
    String documentType, String documentUrl, LocalDateTime uploadedAt,
    String reviewStatus) {}
