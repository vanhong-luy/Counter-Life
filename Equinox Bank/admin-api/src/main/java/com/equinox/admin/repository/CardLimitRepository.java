package com.equinox.admin.repository;

import com.equinox.admin.entity.CardLimit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CardLimitRepository extends JpaRepository<CardLimit, Long> {
    Optional<CardLimit> findByCardId(Long cardId);
}
