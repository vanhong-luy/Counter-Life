package com.equinox.bank.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "collaterals")
public class Collateral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "collateral_id")
    private Long collateralId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @Column(name = "asset_type", nullable = false, length = 50)
    private String assetType;

    @Column(name = "estimated_value", nullable = false, precision = 19, scale = 4)
    private BigDecimal estimatedValue;

    @Column(name = "proof_document_url", length = 255)
    private String proofDocumentUrl;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "active";

    public Collateral() {}

    public Long getCollateralId() { return collateralId; }
    public void setCollateralId(Long collateralId) { this.collateralId = collateralId; }

    public Loan getLoan() { return loan; }
    public void setLoan(Loan loan) { this.loan = loan; }

    public String getAssetType() { return assetType; }
    public void setAssetType(String assetType) { this.assetType = assetType; }

    public BigDecimal getEstimatedValue() { return estimatedValue; }
    public void setEstimatedValue(BigDecimal estimatedValue) { this.estimatedValue = estimatedValue; }

    public String getProofDocumentUrl() { return proofDocumentUrl; }
    public void setProofDocumentUrl(String proofDocumentUrl) { this.proofDocumentUrl = proofDocumentUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
