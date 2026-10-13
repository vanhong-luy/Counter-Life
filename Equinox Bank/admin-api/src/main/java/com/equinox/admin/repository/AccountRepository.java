package com.equinox.admin.repository;

import com.equinox.admin.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface AccountRepository extends JpaRepository<Account, Long> {
    long countByStatus(String status);
    List<Account> findByCustomer_CustomerId(Long customerId);

    @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a WHERE a.status = 'active'")
    BigDecimal sumActiveBalances();

    @Query(value = "SELECT at.type_name, COUNT(a.account_id), COALESCE(SUM(a.balance), 0) FROM accounts a JOIN account_types at ON a.account_type_id = at.account_type_id WHERE a.status = 'active' GROUP BY at.type_name ORDER BY COUNT(a.account_id) DESC", nativeQuery = true)
    List<Object[]> aggregateByType();

}
