package com.equinox.admin.repository;

import com.equinox.admin.entity.TransactionCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransactionCategoryRepository extends JpaRepository<TransactionCategory, Integer> {
    Optional<TransactionCategory> findByCategoryName(String categoryName);
}
