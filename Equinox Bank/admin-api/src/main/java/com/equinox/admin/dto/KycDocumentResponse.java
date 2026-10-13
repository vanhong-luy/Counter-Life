package com.equinox.admin.dto;

import java.time.OffsetDateTime;

public class KycDocumentResponse {

    private Long documentId;
    private Long customerId;
    private String customerName;
    private String documentType;
    private String reviewStatus;
    private OffsetDateTime uploadedAt;
    private String documentUrl;
    private String backUrl;
    private String profilePhotoUrl;

    public KycDocumentResponse(Long documentId, Long customerId, String customerName, String documentType,
                               String reviewStatus, OffsetDateTime uploadedAt, String documentUrl,
                               String backUrl, String profilePhotoUrl) {
        this.documentId = documentId;
        this.customerId = customerId;
        this.customerName = customerName;
        this.documentType = documentType;
        this.reviewStatus = reviewStatus;
        this.uploadedAt = uploadedAt;
        this.documentUrl = documentUrl;
        this.backUrl = backUrl;
        this.profilePhotoUrl = profilePhotoUrl;
    }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(String reviewStatus) { this.reviewStatus = reviewStatus; }
    public OffsetDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    public String getBackUrl() { return backUrl; }
    public void setBackUrl(String backUrl) { this.backUrl = backUrl; }
    public String getProfilePhotoUrl() { return profilePhotoUrl; }
    public void setProfilePhotoUrl(String profilePhotoUrl) { this.profilePhotoUrl = profilePhotoUrl; }
}
