package com.equinox.admin.dto;

public class AdminStaffResponse {

    private Long adminId;
    private String email;
    private String firstName;
    private String lastName;
    private String roleName;
    private java.util.List<String> permissions;
    private Boolean isActive;
    private String employeeId;

    public AdminStaffResponse(Long adminId, String email, String firstName, String lastName,
                              String roleName, java.util.List<String> permissions,
                              Boolean isActive, String employeeId) {
        this.adminId = adminId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.roleName = roleName;
        this.permissions = permissions;
        this.isActive = isActive;
        this.employeeId = employeeId;
    }

    public Long getAdminId() { return adminId; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getRoleName() { return roleName; }
    public java.util.List<String> getPermissions() { return permissions; }
    public Boolean getIsActive() { return isActive; }
    public String getEmployeeId() { return employeeId; }
}
