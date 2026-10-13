package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.TransactionCategory;

@Repository
public interface TransactionCategoryRepository extends JpaRepository<TransactionCategory, Integer> {
    Optional<TransactionCategory> findByCategoryName(String categoryName);
}
