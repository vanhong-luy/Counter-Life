package com.equinox.admin.dto;

public class AdminProfileResponse {

    private Long adminId;
    private String firstName;
    private String lastName;
    private String email;
    private String roleName;
    private java.util.List<String> permissions;
    private String employeeId;
    private String departmentRole;
    private java.util.List<String> workFocus;

    public AdminProfileResponse(Long adminId, String firstName, String lastName, String email, String roleName,
                                java.util.List<String> permissions,
                                String employeeId, String departmentRole, java.util.List<String> workFocus) {
        this.adminId = adminId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.roleName = roleName;
        this.permissions = permissions;
        this.employeeId = employeeId;
        this.departmentRole = departmentRole;
        this.workFocus = workFocus;
    }

    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public java.util.List<String> getPermissions() { return permissions; }
    public void setPermissions(java.util.List<String> permissions) { this.permissions = permissions; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getDepartmentRole() { return departmentRole; }
    public void setDepartmentRole(String departmentRole) { this.departmentRole = departmentRole; }
    public java.util.List<String> getWorkFocus() { return workFocus; }
    public void setWorkFocus(java.util.List<String> workFocus) { this.workFocus = workFocus; }
}
