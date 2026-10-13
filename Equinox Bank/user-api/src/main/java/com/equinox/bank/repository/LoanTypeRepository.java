package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.LoanType;

@Repository
public interface LoanTypeRepository extends JpaRepository<LoanType, Integer> {
    Optional<LoanType> findByTypeName(String typeName);
}
