package com.equinox.bank.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Customer;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByCustomer(Customer customer);
    Optional<Account> findByAccountNumber(String accountNumber);
    List<Account> findByStatus(String status);
    List<Account> findByCustomerAndIsPrimaryTrue(Customer customer);

    @Query("SELECT a FROM Account a WHERE a.accountType.typeName = 'Fixed Deposit' AND a.matured = false AND a.maturityDate <= :date")
    List<Account> findMaturedFixedDeposits(@Param("date") LocalDate date);
}
