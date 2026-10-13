package com.equinox.admin.repository;

import com.equinox.admin.entity.CardType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardTypeRepository extends JpaRepository<CardType, Integer> {
}
