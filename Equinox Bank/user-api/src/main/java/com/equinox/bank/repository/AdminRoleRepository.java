package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.AdminRole;

@Repository
public interface AdminRoleRepository extends JpaRepository<AdminRole, Integer> {
    Optional<AdminRole> findByRoleName(String roleName);
}
