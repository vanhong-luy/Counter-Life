package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Collateral;
import com.equinox.bank.entity.Loan;

@Repository
public interface CollateralRepository extends JpaRepository<Collateral, Long> {
    List<Collateral> findByLoan(Loan loan);
    List<Collateral> findByLoanIn(List<Loan> loans);
}
