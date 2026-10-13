package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.AccountType;

@Repository
public interface AccountTypeRepository extends JpaRepository<AccountType, Integer> {
    Optional<AccountType> findByTypeName(String typeName);
}
