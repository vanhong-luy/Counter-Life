package com.equinox.admin.repository;

import com.equinox.admin.entity.Card;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import org.springframework.data.domain.Page;

public interface CardRepository extends JpaRepository<Card, Long> {

    @Query("SELECT c FROM Card c JOIN FETCH c.account a JOIN FETCH a.customer cu JOIN FETCH c.cardType " +
           "WHERE (:search IS NULL OR cu.firstName LIKE %:search% OR cu.lastName LIKE %:search% OR cu.email LIKE %:search% OR CAST(c.cardId AS string) LIKE %:search%) " +
           "AND (:frozen IS NULL OR c.isFrozen = :frozen) " +
           "AND (:hasPendingReq IS NULL OR :hasPendingReq = false OR EXISTS (SELECT r FROM CreditLimitRequest r WHERE r.card = c AND r.status = 'PENDING')) " +
           "ORDER BY c.issuedAt DESC")
    List<Card> findFilteredAdvanced(@Param("search") String search, @Param("frozen") Boolean frozen, @Param("hasPendingReq") Boolean hasPendingReq, Pageable pageable);

    @Query("SELECT COUNT(c) FROM Card c JOIN c.account a JOIN a.customer cu " +
           "WHERE (:search IS NULL OR cu.firstName LIKE %:search% OR cu.lastName LIKE %:search% OR cu.email LIKE %:search% OR CAST(c.cardId AS string) LIKE %:search%) " +
           "AND (:frozen IS NULL OR c.isFrozen = :frozen) " +
           "AND (:hasPendingReq IS NULL OR :hasPendingReq = false OR EXISTS (SELECT r FROM CreditLimitRequest r WHERE r.card = c AND r.status = 'PENDING'))")
    long countFilteredAdvanced(@Param("search") String search, @Param("frozen") Boolean frozen, @Param("hasPendingReq") Boolean hasPendingReq);

    @Query("SELECT c FROM Card c JOIN FETCH c.account a JOIN FETCH a.customer JOIN FETCH c.cardType WHERE c.cardId = :id")
    java.util.Optional<Card> findByIdWithDetails(@Param("id") Long id);

    long countByIsFrozen(Boolean frozen);

    List<Card> findByCreditLimitIsNotNull();
    Page<Card> findByCreditLimitIsNotNull(Pageable pageable);

    @Query("SELECT c FROM Card c JOIN FETCH c.account a WHERE a.customer.customerId = :customerId")
    List<Card> findByAccount_Customer_CustomerId(@Param("customerId") Long customerId);

    // Returns [card_id, account_id, balance] for all eligible debit cards (one-shot)
    @Query(value = "SELECT c.card_id, a.account_id, a.balance FROM cards c " +
           "JOIN accounts a ON a.account_id = c.account_id " +
           "JOIN card_types ct ON ct.card_type_id = c.card_type_id " +
           "WHERE ct.type_name = 'debit' AND a.status = 'active' AND a.balance >= 10", nativeQuery = true)
    List<Object[]> findDebitCardPurchaseData();
}
