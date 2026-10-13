package com.equinox.bank.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.CardStatusHistory;

@Repository
public interface CardStatusHistoryRepository extends JpaRepository<CardStatusHistory, Long> {
    List<CardStatusHistory> findByCard(Card card);
}
