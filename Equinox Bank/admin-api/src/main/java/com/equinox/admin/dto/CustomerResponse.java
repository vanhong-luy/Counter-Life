package com.equinox.admin.dto;

import java.time.OffsetDateTime;

public class CustomerResponse {

    private Long customerId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String kycStatus;
    private Integer creditScore;
    private OffsetDateTime createdAt;
    private String profilePhotoUrl;

    public CustomerResponse(Long customerId, String firstName, String lastName, String email,
                            String phoneNumber, String kycStatus, Integer creditScore, OffsetDateTime createdAt,
                            String profilePhotoUrl) {
        this.customerId = customerId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.kycStatus = kycStatus;
        this.creditScore = creditScore;
        this.createdAt = createdAt;
        this.profilePhotoUrl = profilePhotoUrl;
    }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getKycStatus() { return kycStatus; }
    public void setKycStatus(String kycStatus) { this.kycStatus = kycStatus; }
    public Integer getCreditScore() { return creditScore; }
    public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getProfilePhotoUrl() { return profilePhotoUrl; }
    public void setProfilePhotoUrl(String profilePhotoUrl) { this.profilePhotoUrl = profilePhotoUrl; }
}
