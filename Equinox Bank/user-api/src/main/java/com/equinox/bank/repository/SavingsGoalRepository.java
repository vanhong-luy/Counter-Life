package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.SavingsGoal;

@Repository
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByCustomer(Customer customer);
    List<SavingsGoal> findByCustomerAndStatus(Customer customer, String status);
}
