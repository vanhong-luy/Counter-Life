package com.equinox.bank.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "card_limits")
public class CardLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "limit_id")
    private Long limitId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false, unique = true)
    private Card card;

    @Column(name = "daily_limit", nullable = false, precision = 19, scale = 4)
    private BigDecimal dailyLimit = BigDecimal.ZERO;

    @Column(name = "monthly_limit", nullable = false, precision = 19, scale = 4)
    private BigDecimal monthlyLimit = BigDecimal.ZERO;

    @Column(name = "allow_international", nullable = false)
    private Boolean allowInternational = false;

    @Column(name = "allow_online", nullable = false)
    private Boolean allowOnline = true;

    public CardLimit() {}

    public Long getLimitId() { return limitId; }
    public void setLimitId(Long limitId) { this.limitId = limitId; }

    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }

    public BigDecimal getMonthlyLimit() { return monthlyLimit; }
    public void setMonthlyLimit(BigDecimal monthlyLimit) { this.monthlyLimit = monthlyLimit; }

    public Boolean getAllowInternational() { return allowInternational; }
    public void setAllowInternational(Boolean allowInternational) { this.allowInternational = allowInternational; }

    public Boolean getAllowOnline() { return allowOnline; }
    public void setAllowOnline(Boolean allowOnline) { this.allowOnline = allowOnline; }
}
