package com.equinox.admin.repository;

import com.equinox.admin.entity.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountTypeRepository extends JpaRepository<AccountType, Integer> {
    java.util.Optional<AccountType> findByTypeName(String typeName);
}
