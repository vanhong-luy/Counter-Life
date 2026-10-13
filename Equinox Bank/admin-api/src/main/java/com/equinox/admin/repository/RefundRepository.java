package com.equinox.admin.repository;

import com.equinox.admin.entity.Refund;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    List<Refund> findByStatus(String status);
    Page<Refund> findAllByOrderByRefundIdDesc(Pageable pageable);
    Page<Refund> findByStatusOrderByRefundIdDesc(String status, Pageable pageable);
}
