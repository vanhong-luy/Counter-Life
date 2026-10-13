package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.KycDocument;

import java.util.Optional;

@Repository
public interface KycDocumentRepository extends JpaRepository<KycDocument, Long> {
    List<KycDocument> findByCustomer(Customer customer);
    List<KycDocument> findByStatus(String status);
    Optional<KycDocument> findTopByCustomerOrderByUploadedAtDesc(Customer customer);
}
