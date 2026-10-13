package com.equinox.admin.repository;

import com.equinox.admin.entity.LoanType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanTypeRepository extends JpaRepository<LoanType, Integer> {
    java.util.Optional<LoanType> findByTypeName(String typeName);
}
