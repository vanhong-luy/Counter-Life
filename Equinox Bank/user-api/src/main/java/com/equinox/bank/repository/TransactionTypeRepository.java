package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.TransactionType;

@Repository
public interface TransactionTypeRepository extends JpaRepository<TransactionType, Integer> {
    Optional<TransactionType> findByTypeName(String typeName);
}
