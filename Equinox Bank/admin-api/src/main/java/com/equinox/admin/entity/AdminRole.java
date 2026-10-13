package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "admin_roles")
public class AdminRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Integer roleId;

    @Column(name = "role_name", nullable = false, unique = true, length = 50)
    private String roleName;

    @Column(length = 255)
    private String permissions;

    public Integer getRoleId() { return roleId; }
    public void setRoleId(Integer roleId) { this.roleId = roleId; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public String getPermissions() { return permissions; }
    public void setPermissions(String permissions) { this.permissions = permissions; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public List<String> getPermissionList() {
        if (permissions == null || permissions.isBlank()) return List.of();
        return Arrays.asList(permissions.split(","));
    }
}
