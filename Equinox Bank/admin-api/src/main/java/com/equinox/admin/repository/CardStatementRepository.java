package com.equinox.admin.repository;

import com.equinox.admin.entity.CardStatement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CardStatementRepository extends JpaRepository<CardStatement, Long> {
    List<CardStatement> findByCard_CardIdOrderByPeriodEndDesc(Long cardId);
    List<CardStatement> findByPaidFalseAndDueDateBefore(LocalDate date);
}
