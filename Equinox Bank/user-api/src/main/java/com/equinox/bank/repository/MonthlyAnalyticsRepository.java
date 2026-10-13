package com.equinox.bank.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.equinox.bank.document.MonthlyAnalyticsDocument;

public interface MonthlyAnalyticsRepository extends MongoRepository<MonthlyAnalyticsDocument, String> {
    Optional<MonthlyAnalyticsDocument> findByEmailAndPeriod(String email, String period);
    List<MonthlyAnalyticsDocument> findByEmail(String email);
    void deleteAllByEmail(String email);
    void deleteByEmailAndPeriod(String email, String period);
}