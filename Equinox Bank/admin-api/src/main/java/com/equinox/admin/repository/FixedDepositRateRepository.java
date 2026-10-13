package com.equinox.admin.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.equinox.admin.entity.FixedDepositRate;

@Repository
public interface FixedDepositRateRepository extends JpaRepository<FixedDepositRate, Integer> {
    Optional<FixedDepositRate> findByTermMonths(Integer termMonths);
}
