package com.equinox.admin.repository;

import com.equinox.admin.entity.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransactionTypeRepository extends JpaRepository<TransactionType, Integer> {
    Optional<TransactionType> findByTypeName(String typeName);
}
