package com.equinox.admin.repository;

import com.equinox.admin.entity.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(s.currentAmount), 0) FROM SavingsGoal s")
    BigDecimal sumCurrentAmount();

    @Query("SELECT COALESCE(SUM(s.targetAmount), 0) FROM SavingsGoal s")
    BigDecimal sumTargetAmount();

    List<SavingsGoal> findByStatusAndAutoReleaseTrueAndTargetDateBefore(String status, LocalDate targetDate);
}
