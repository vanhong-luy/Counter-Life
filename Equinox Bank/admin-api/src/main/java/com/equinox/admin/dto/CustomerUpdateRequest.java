package com.equinox.admin.dto;

public class CustomerUpdateRequest {

    private String kycStatus;
    private Integer creditScore;

    public String getKycStatus() { return kycStatus; }
    public void setKycStatus(String kycStatus) { this.kycStatus = kycStatus; }
    public Integer getCreditScore() { return creditScore; }
    public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
}
