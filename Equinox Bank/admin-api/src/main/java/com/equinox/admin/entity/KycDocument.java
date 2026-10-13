package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "kyc_documents")
public class KycDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "document_url", nullable = false, length = 255)
    private String documentUrl;

    @Column(name = "document_url_back", length = 255)
    private String documentUrlBack;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) uploadedAt = OffsetDateTime.now();
    }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    public String getDocumentUrlBack() { return documentUrlBack; }
    public void setDocumentUrlBack(String documentUrlBack) { this.documentUrlBack = documentUrlBack; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public OffsetDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
