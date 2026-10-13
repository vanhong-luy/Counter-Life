package com.equinox.admin.dto;

import java.util.List;

public class RoleResponse {

    private Integer roleId;
    private String roleName;
    private List<String> permissions;

    public RoleResponse(Integer roleId, String roleName, List<String> permissions) {
        this.roleId = roleId;
        this.roleName = roleName;
        this.permissions = permissions;
    }

    public Integer getRoleId() { return roleId; }
    public String getRoleName() { return roleName; }
    public List<String> getPermissions() { return permissions; }
}
