package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.CardType;

@Repository
public interface CardTypeRepository extends JpaRepository<CardType, Integer> {
    Optional<CardType> findByNetworkAndTypeName(String network, String typeName);
}
