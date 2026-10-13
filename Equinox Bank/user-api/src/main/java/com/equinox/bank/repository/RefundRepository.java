package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Refund;
import com.equinox.bank.entity.Transaction;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    List<Refund> findByOriginalTransaction(Transaction transaction);
    List<Refund> findByStatusOrderByProcessedAtDesc(String status);
    List<Refund> findAllByOrderByProcessedAtDesc();
    Page<Refund> findAllByOrderByProcessedAtDesc(Pageable pageable);
    Page<Refund> findByStatusOrderByProcessedAtDesc(String status, Pageable pageable);
}
