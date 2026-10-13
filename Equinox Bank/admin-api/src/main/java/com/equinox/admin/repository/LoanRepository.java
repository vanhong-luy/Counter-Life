package com.equinox.admin.repository;

import com.equinox.admin.entity.Loan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {
    @Query("SELECT l FROM Loan l JOIN FETCH l.customer JOIN FETCH l.loanType WHERE l.status = :status ORDER BY l.appliedAt DESC")
    List<Loan> findByStatusWithDetails(@Param("status") String status);

    @Query("SELECT l FROM Loan l JOIN FETCH l.customer JOIN FETCH l.loanType WHERE l.status = :status ORDER BY l.appliedAt DESC")
    List<Loan> findByStatusWithDetails(@Param("status") String status, Pageable pageable);

    @Query("SELECT l FROM Loan l JOIN FETCH l.customer JOIN FETCH l.loanType lt " +
           "WHERE (:status IS NULL OR LOWER(l.status) = :status) " +
           "AND (:loanType IS NULL OR lt.typeName = :loanType)")
    List<Loan> findAllFilteredWithDetails(
            @Param("status") String status,
            @Param("loanType") String loanType,
            Sort sort);

    @Query("SELECT l FROM Loan l JOIN FETCH l.customer c JOIN FETCH l.loanType lt " +
           "WHERE (:status IS NULL OR LOWER(l.status) = :status) " +
           "AND (:loanType IS NULL OR lt.typeName = :loanType) " +
           "AND (:search IS NULL OR c.firstName LIKE %:search% OR c.lastName LIKE %:search% OR c.email LIKE %:search% OR CAST(l.loanId AS text) LIKE %:search%)")
    List<Loan> findFilteredWithDetails(
            @Param("status") String status,
            @Param("loanType") String loanType,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(l) FROM Loan l JOIN l.customer c JOIN l.loanType lt " +
           "WHERE (:status IS NULL OR LOWER(l.status) = :status) " +
           "AND (:loanType IS NULL OR lt.typeName = :loanType) " +
           "AND (:search IS NULL OR c.firstName LIKE %:search% OR c.lastName LIKE %:search% OR c.email LIKE %:search% OR CAST(l.loanId AS text) LIKE %:search%)")
    long countFiltered(@Param("status") String status, @Param("loanType") String loanType, @Param("search") String search);

    @Query("SELECT l FROM Loan l JOIN FETCH l.customer JOIN FETCH l.loanType WHERE l.loanId = :id")
    java.util.Optional<Loan> findByIdWithDetails(@Param("id") Long id);

    long countByStatus(String status);

    @Query("SELECT l FROM Loan l JOIN l.customer c JOIN l.loanType lt " +
           "WHERE (:status IS NULL OR LOWER(l.status) = :status) " +
           "AND (:loanType IS NULL OR lt.typeName = :loanType)")
    List<Loan> findAllFiltered(
            @Param("status") String status,
            @Param("loanType") String loanType,
            Sort sort);

    @Query("SELECT DISTINCT lt.typeName FROM LoanType lt ORDER BY lt.typeName")
    List<String> findAllLoanTypes();

    @Query("SELECT DISTINCT l.status FROM Loan l WHERE l.status IS NOT NULL ORDER BY l.status")
    List<String> findAllStatuses();

    List<Loan> findByStatusOrderByAppliedAtDesc(String status);

    List<Loan> findByCustomer_CustomerId(Long customerId);
}
