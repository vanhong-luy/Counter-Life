package com.equinox.admin.repository;

import com.equinox.admin.entity.Collateral;
import com.equinox.admin.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CollateralRepository extends JpaRepository<Collateral, Long> {
    List<Collateral> findByLoan(Loan loan);
    List<Collateral> findByLoanIn(List<Loan> loans);
}
