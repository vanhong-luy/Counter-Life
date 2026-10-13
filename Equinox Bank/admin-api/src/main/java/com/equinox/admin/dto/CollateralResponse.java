package com.equinox.admin.dto;

import java.math.BigDecimal;

public class CollateralResponse {

    private Long collateralId;
    private String assetType;
    private BigDecimal estimatedValue;
    private String proofDocumentUrl;
    private String status;

    public CollateralResponse(Long collateralId, String assetType, BigDecimal estimatedValue,
                              String proofDocumentUrl, String status) {
        this.collateralId = collateralId;
        this.assetType = assetType;
        this.estimatedValue = estimatedValue;
        this.proofDocumentUrl = proofDocumentUrl;
        this.status = status;
    }

    public Long getCollateralId() { return collateralId; }
    public void setCollateralId(Long collateralId) { this.collateralId = collateralId; }
    public String getAssetType() { return assetType; }
    public void setAssetType(String assetType) { this.assetType = assetType; }
    public BigDecimal getEstimatedValue() { return estimatedValue; }
    public void setEstimatedValue(BigDecimal estimatedValue) { this.estimatedValue = estimatedValue; }
    public String getProofDocumentUrl() { return proofDocumentUrl; }
    public void setProofDocumentUrl(String proofDocumentUrl) { this.proofDocumentUrl = proofDocumentUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
