package com.equinox.bank.repository;

import com.equinox.bank.entity.CardStatement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface CardStatementRepository extends JpaRepository<CardStatement, Long> {
    List<CardStatement> findByCard_CardIdOrderByPeriodEndDesc(Long cardId);
    List<CardStatement> findByPaidFalseAndDueDateBefore(LocalDate date);
    List<CardStatement> findByPaidFalseAndDueDateBeforeAndCard_CardIdIn(LocalDate date, Collection<Long> cardIds);
}
