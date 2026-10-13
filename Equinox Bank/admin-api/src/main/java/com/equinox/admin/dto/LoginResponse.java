package com.equinox.admin.dto;

import java.util.List;

public class LoginResponse {

    private String token;
    private String refreshToken;
    private String roleName;
    private List<String> permissions;

    public LoginResponse(String token) {
        this.token = token;
    }

    public LoginResponse(String token, String refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }
}
