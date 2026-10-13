package com.equinox.bank.repository;

import com.equinox.bank.entity.CardTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface CardTransactionRepository extends JpaRepository<CardTransaction, Long> {
    List<CardTransaction> findByCard_CardIdOrderByTransactionDateDesc(Long cardId);
    Page<CardTransaction> findByCard_CardIdOrderByTransactionDateDesc(Long cardId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CardTransaction t WHERE t.card.cardId = :cardId AND t.transactionDate >= :start")
    BigDecimal sumAmountSince(@Param("cardId") Long cardId, @Param("start") LocalDateTime start);

    List<CardTransaction> findByCard_CardIdAndStatementIdOrderByTransactionDateDesc(Long cardId, Long statementId);

    @Query("SELECT t FROM CardTransaction t WHERE t.card.cardId = :cardId AND t.transactionDate >= :start AND t.transactionDate <= :end ORDER BY t.transactionDate DESC")
    List<CardTransaction> findByCardIdAndDateRange(@Param("cardId") Long cardId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<CardTransaction> findByCard_CardIdAndTransactionDateGreaterThanEqual(Long cardId, LocalDateTime from);

    List<CardTransaction> findByTransactionId(Long transactionId);
}
