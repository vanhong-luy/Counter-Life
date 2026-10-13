package com.equinox.bank.repository;

import com.equinox.bank.entity.CreditScoreTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CreditScoreTierRepository extends JpaRepository<CreditScoreTier, Integer> {
    Optional<CreditScoreTier> findByMinScoreLessThanEqualAndMaxScoreGreaterThanEqual(Integer minScore, Integer maxScore);
}
