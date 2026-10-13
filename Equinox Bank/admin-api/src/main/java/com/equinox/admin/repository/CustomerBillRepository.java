package com.equinox.admin.repository;

import com.equinox.admin.entity.CustomerBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerBillRepository extends JpaRepository<CustomerBill, Long> {
    List<CustomerBill> findByStatusAndAutoPayTrue(String status);
}
