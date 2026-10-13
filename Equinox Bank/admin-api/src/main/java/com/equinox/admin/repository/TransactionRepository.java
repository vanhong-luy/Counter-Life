package com.equinox.admin.repository;

import com.equinox.admin.entity.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findAllByOrderByTransactionDateDesc();

    long countByCategoryId(Integer categoryId);

    @Query("SELECT t FROM Transaction t, TransactionType tt " +
           "WHERE t.typeId = tt.typeId " +
           "AND (:typeName IS NULL OR LOWER(tt.typeName) = :typeName) " +
           "AND (:status IS NULL OR LOWER(t.status) = :status) " +
           "AND (:search IS NULL OR CAST(t.referenceNumber AS text) LIKE %:search% OR CAST(t.description AS text) LIKE %:search%) " +
           "AND t.transactionDate >= COALESCE(:startDate, t.transactionDate) " +
           "AND t.transactionDate <= COALESCE(:endDate, t.transactionDate)")
    List<Transaction> findAllFiltered(
            @Param("typeName") String typeName,
            @Param("status") String status,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(t) FROM Transaction t, TransactionType tt " +
           "WHERE t.typeId = tt.typeId " +
           "AND (:typeName IS NULL OR LOWER(tt.typeName) = :typeName) " +
           "AND (:status IS NULL OR LOWER(t.status) = :status) " +
           "AND (:search IS NULL OR CAST(t.referenceNumber AS text) LIKE %:search% OR CAST(t.description AS text) LIKE %:search%) " +
           "AND t.transactionDate >= COALESCE(:startDate, t.transactionDate) " +
           "AND t.transactionDate <= COALESCE(:endDate, t.transactionDate)")
    long countFiltered(
            @Param("typeName") String typeName,
            @Param("status") String status,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate,
            @Param("search") String search);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.typeId = 1 AND t.status = 'completed'")
    BigDecimal sumCompletedDeposits();

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.typeId = (SELECT tt.typeId FROM TransactionType tt WHERE tt.typeName = 'deposit') " +
           "AND t.status = 'completed' " +
           "AND (t.targetAccountId IN :accountIds) " +
           "AND t.transactionDate >= :since")
    BigDecimal sumDepositsSince(@Param("accountIds") List<Long> accountIds, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.typeId IN (SELECT tt.typeId FROM TransactionType tt WHERE tt.typeName IN ('loan_repayment', 'loan_payment')) " +
           "AND t.status = 'completed' " +
           "AND (t.sourceAccountId IN :accountIds) " +
           "AND t.transactionDate >= :since")
    BigDecimal sumDebtPaymentsSince(@Param("accountIds") List<Long> accountIds, @Param("since") OffsetDateTime since);

    @Query("SELECT DISTINCT t.status FROM Transaction t WHERE t.status IS NOT NULL ORDER BY t.status")
    List<String> findAllDistinctStatuses();

    @Query(value = """
        SELECT tt.type_name,
               CASE
                 WHEN :range = 'today' THEN
                   CASE
                     WHEN EXTRACT(HOUR FROM t.transaction_date) < 4 THEN '00-04'
                     WHEN EXTRACT(HOUR FROM t.transaction_date) < 8 THEN '04-08'
                     WHEN EXTRACT(HOUR FROM t.transaction_date) < 12 THEN '08-12'
                     WHEN EXTRACT(HOUR FROM t.transaction_date) < 16 THEN '12-16'
                     WHEN EXTRACT(HOUR FROM t.transaction_date) < 20 THEN '16-20'
                     ELSE '20-24'
                   END
                 WHEN :range = 'monthly' THEN 'Week ' || CEIL(EXTRACT(DAY FROM t.transaction_date) / 7.0)::int
                 ELSE UPPER(TO_CHAR(t.transaction_date, 'DY'))
               END as bucket,
               COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        JOIN transaction_types tt ON t.type_id = tt.type_id
        WHERE t.transaction_date >= :since
          AND t.status = 'completed'
          AND tt.type_name IN ('deposit', 'withdrawal', 'transfer')
        GROUP BY tt.type_name, bucket
        ORDER BY MIN(t.transaction_date)
        """, nativeQuery = true)
    List<Object[]> aggregateVolume(@Param("range") String range, @Param("since") OffsetDateTime since);
}
