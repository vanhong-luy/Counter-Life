package com.equinox.bank.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.Loan;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {
    List<Loan> findByCustomer(Customer customer);
    List<Loan> findByStatus(String status);

    @Query("SELECT l FROM Loan l WHERE l.status IN ('approved', 'active') "
         + "AND l.nextPaymentDueDate IS NOT NULL AND l.nextPaymentDueDate < :date "
         + "AND (l.lastLateFeeCharged IS NULL OR l.lastLateFeeCharged < :date)")
    List<Loan> findOverdueLoans(LocalDate date);
}
