package com.equinox.admin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    private String email;
    private String username;

    @NotBlank
    private String password;

    public String getEmail() { 
        return email != null && !email.isBlank() ? email : username; 
    }
    public void setEmail(String email) { this.email = email; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
