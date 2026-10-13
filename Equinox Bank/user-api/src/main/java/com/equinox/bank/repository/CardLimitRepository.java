package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.CardLimit;

@Repository
public interface CardLimitRepository extends JpaRepository<CardLimit, Long> {
    Optional<CardLimit> findByCard(Card card);
}
