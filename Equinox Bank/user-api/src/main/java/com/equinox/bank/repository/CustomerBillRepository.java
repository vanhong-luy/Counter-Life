package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.CustomerBill;

@Repository
public interface CustomerBillRepository extends JpaRepository<CustomerBill, Long> {
    List<CustomerBill> findByCustomerCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CustomerBill> findByCustomerCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, String status);
}
