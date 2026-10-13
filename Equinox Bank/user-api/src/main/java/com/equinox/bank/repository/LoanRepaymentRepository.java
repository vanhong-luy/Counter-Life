package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Loan;
import com.equinox.bank.entity.LoanRepayment;

@Repository
public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, Long> {
    List<LoanRepayment> findByLoan(Loan loan);
}
