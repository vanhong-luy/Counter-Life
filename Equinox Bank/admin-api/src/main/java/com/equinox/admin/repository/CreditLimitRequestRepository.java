package com.equinox.admin.repository;

import com.equinox.admin.entity.CreditLimitRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CreditLimitRequestRepository extends JpaRepository<CreditLimitRequest, Long> {

    List<CreditLimitRequest> findByCard_CardId(Long cardId);

    @Query("SELECT r FROM CreditLimitRequest r JOIN FETCH r.card c JOIN FETCH c.account a JOIN FETCH a.customer JOIN FETCH c.cardType " +
           "WHERE r.status = :status ORDER BY r.createdAt DESC")
    List<CreditLimitRequest> findByStatusWithDetails(@Param("status") String status);

    @Query("SELECT r FROM CreditLimitRequest r JOIN FETCH r.card c JOIN FETCH c.account a JOIN FETCH a.customer JOIN FETCH c.cardType " +
           "ORDER BY r.createdAt DESC")
    List<CreditLimitRequest> findAllWithDetails();
}
