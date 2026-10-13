package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "card_limits")
public class CardLimit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "limit_id") private Long limitId;
    @Column(name = "card_id", nullable = false, unique = true) private Long cardId;
    @Column(name = "daily_limit", nullable = false, precision = 19, scale = 4) private BigDecimal dailyLimit = BigDecimal.ZERO;
    @Column(name = "monthly_limit", nullable = false, precision = 19, scale = 4) private BigDecimal monthlyLimit = BigDecimal.ZERO;
    @Column(name = "allow_international", nullable = false) private Boolean allowInternational = false;
    @Column(name = "allow_online", nullable = false) private Boolean allowOnline = true;

    public Long getLimitId() { return limitId; }
    public void setLimitId(Long v) { limitId = v; }
    public Long getCardId() { return cardId; }
    public void setCardId(Long v) { cardId = v; }
    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal v) { dailyLimit = v; }
    public BigDecimal getMonthlyLimit() { return monthlyLimit; }
    public void setMonthlyLimit(BigDecimal v) { monthlyLimit = v; }
    public Boolean getAllowInternational() { return allowInternational; }
    public void setAllowInternational(Boolean v) { allowInternational = v; }
    public Boolean getAllowOnline() { return allowOnline; }
    public void setAllowOnline(Boolean v) { allowOnline = v; }
}
