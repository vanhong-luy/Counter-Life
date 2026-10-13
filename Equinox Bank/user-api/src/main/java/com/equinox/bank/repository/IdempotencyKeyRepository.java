package com.equinox.bank.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.equinox.bank.entity.IdempotencyKey;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, String> {

    /**
     * Atomically claims the key for this request. Returns 1 when the caller won the
     * claim and should do the work, 0 when the key was already taken (duplicate submit).
     *
     * ON CONFLICT DO NOTHING keeps this exception-free so the surrounding transaction
     * stays usable. A concurrent duplicate blocks on the unique index until the first
     * transaction commits, then correctly sees the conflict and returns 0.
     */
    @Modifying
    @Query(value = """
        INSERT INTO idempotency_keys (idempotency_key, customer_id, operation, created_at)
        VALUES (:key, :customerId, :operation, NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
        """, nativeQuery = true)
    int tryClaim(@Param("key") String key,
                 @Param("customerId") Long customerId,
                 @Param("operation") String operation);

    @Modifying
    @Query(value = "UPDATE idempotency_keys SET resource_id = :resourceId WHERE idempotency_key = :key",
           nativeQuery = true)
    void attachResource(@Param("key") String key, @Param("resourceId") Long resourceId);

    Optional<IdempotencyKey> findByIdempotencyKey(String idempotencyKey);
}
