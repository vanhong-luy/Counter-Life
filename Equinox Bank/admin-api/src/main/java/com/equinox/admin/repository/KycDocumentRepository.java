package com.equinox.admin.repository;

import com.equinox.admin.entity.KycDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KycDocumentRepository extends JpaRepository<KycDocument, Long> {
    @Query("SELECT d FROM KycDocument d JOIN FETCH d.customer ORDER BY d.uploadedAt DESC")
    List<KycDocument> findAllWithCustomer();

    @Query(value = "SELECT d FROM KycDocument d JOIN FETCH d.customer c " +
           "WHERE (:status IS NULL OR LOWER(d.status) = :status) " +
           "AND (:search IS NULL OR c.firstName LIKE %:search% " +
           "OR c.lastName LIKE %:search% " +
           "OR d.documentType LIKE %:search%) " +
           "ORDER BY d.uploadedAt DESC")
    List<KycDocument> findFiltered(@Param("status") String status, @Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(d) FROM KycDocument d JOIN d.customer c " +
           "WHERE (:status IS NULL OR LOWER(d.status) = :status) " +
           "AND (:search IS NULL OR c.firstName LIKE %:search% " +
           "OR c.lastName LIKE %:search% " +
           "OR d.documentType LIKE %:search%)")
    long countFiltered(@Param("status") String status, @Param("search") String search);

    @Query("SELECT DISTINCT d.status FROM KycDocument d WHERE d.status IS NOT NULL ORDER BY d.status")
    List<String> findAllDistinctStatuses();
}
