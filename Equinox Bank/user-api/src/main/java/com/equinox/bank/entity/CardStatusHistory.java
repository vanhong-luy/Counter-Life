package com.equinox.bank.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "card_status_history")
public class CardStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long historyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_customer")
    private Customer changedByCustomer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_admin")
    private AdminUser changedByAdmin;

    @Column(name = "old_status", nullable = false, length = 20)
    private String oldStatus;

    @Column(name = "new_status", nullable = false, length = 20)
    private String newStatus;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    public CardStatusHistory() {}

    public Long getHistoryId() { return historyId; }
    public void setHistoryId(Long historyId) { this.historyId = historyId; }

    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }

    public Customer getChangedByCustomer() { return changedByCustomer; }
    public void setChangedByCustomer(Customer changedByCustomer) { this.changedByCustomer = changedByCustomer; }

    public AdminUser getChangedByAdmin() { return changedByAdmin; }
    public void setChangedByAdmin(AdminUser changedByAdmin) { this.changedByAdmin = changedByAdmin; }

    public String getOldStatus() { return oldStatus; }
    public void setOldStatus(String oldStatus) { this.oldStatus = oldStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
