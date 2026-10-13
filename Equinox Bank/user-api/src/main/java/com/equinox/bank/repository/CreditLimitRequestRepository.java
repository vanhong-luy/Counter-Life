package com.equinox.bank.repository;

import com.equinox.bank.entity.CreditLimitRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditLimitRequestRepository extends JpaRepository<CreditLimitRequest, Long> {
    java.util.List<CreditLimitRequest> findByCard_CardIdOrderByCreatedAtDesc(Long cardId);
}
