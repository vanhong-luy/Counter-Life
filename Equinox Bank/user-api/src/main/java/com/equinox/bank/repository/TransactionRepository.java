package com.equinox.bank.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Transaction;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findBySourceAccountOrTargetAccount(Account source, Account target);

    @Query("SELECT t FROM Transaction t WHERE (t.sourceAccount.id IN :accountIds OR t.targetAccount.id IN :accountIds) AND t.transactionDate BETWEEN :start AND :end")
    List<Transaction> findByAccountsAndDateRange(@Param("accountIds") Set<Long> accountIds, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
    Optional<Transaction> findByReferenceNumber(String referenceNumber);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type.typeName = 'deposit' AND t.targetAccount IN :accounts AND t.transactionDate >= :since")
    BigDecimal sumDepositsSince(@Param("accounts") List<Account> accounts, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type.typeName IN ('loan_repayment', 'loan_payment') AND t.sourceAccount IN :accounts AND t.transactionDate >= :since")
    BigDecimal sumDebtPaymentsSince(@Param("accounts") List<Account> accounts, @Param("since") OffsetDateTime since);
}
