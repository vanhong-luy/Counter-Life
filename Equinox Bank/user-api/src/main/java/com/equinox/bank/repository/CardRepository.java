package com.equinox.bank.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Card;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByAccount(Account account);
    List<Card> findByAccountIn(List<Account> accounts);
    Optional<Card> findByCardNumber(String cardNumber);
    List<Card> findByCreditLimitIsNotNull();

    @Query("SELECT c FROM Card c JOIN FETCH c.account a JOIN FETCH a.customer WHERE c.cardId = :id")
    Optional<Card> findByIdWithAccount(@Param("id") Long id);
}
