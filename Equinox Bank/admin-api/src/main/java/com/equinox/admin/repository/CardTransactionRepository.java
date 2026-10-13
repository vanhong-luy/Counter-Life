package com.equinox.admin.repository;

import com.equinox.admin.entity.CardTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardTransactionRepository extends JpaRepository<CardTransaction, Long> {
}
