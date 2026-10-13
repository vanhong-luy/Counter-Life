package com.equinox.bank.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKey {

    @Id
    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "operation", nullable = false, length = 50)
    private String operation;

    @Column(name = "resource_id")
    private Long resourceId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public IdempotencyKey() {}

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
