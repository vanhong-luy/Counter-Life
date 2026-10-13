package com.equinox.admin.repository;

import com.equinox.admin.entity.Customer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    long countByKycStatus(String kycStatus);
    Optional<Customer> findByEmail(String email);

    @Query("SELECT c FROM Customer c " +
           "WHERE (:search IS NULL OR c.firstName LIKE %:search% " +
           "OR c.lastName LIKE %:search% " +
           "OR c.email LIKE %:search%) " +
           "ORDER BY c.createdAt DESC")
    List<Customer> findFiltered(@Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(c) FROM Customer c " +
           "WHERE (:search IS NULL OR c.firstName LIKE %:search% " +
           "OR c.lastName LIKE %:search% " +
           "OR c.email LIKE %:search%)")
    long countFiltered(@Param("search") String search);
}
