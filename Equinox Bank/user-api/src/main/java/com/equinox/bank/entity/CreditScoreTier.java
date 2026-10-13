package com.equinox.bank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "credit_score_tiers")
public class CreditScoreTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tier_id")
    private Integer tierId;

    @Column(name = "tier_name", nullable = false, unique = true, length = 50)
    private String tierName;

    @Column(name = "min_score", nullable = false)
    private Integer minScore;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    @Column(name = "credit_limit", nullable = false, precision = 19, scale = 4)
    private BigDecimal creditLimit;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal apr;

    public CreditScoreTier() {}

    public Integer getTierId() { return tierId; }
    public void setTierId(Integer tierId) { this.tierId = tierId; }
    public String getTierName() { return tierName; }
    public void setTierName(String tierName) { this.tierName = tierName; }
    public Integer getMinScore() { return minScore; }
    public void setMinScore(Integer minScore) { this.minScore = minScore; }
    public Integer getMaxScore() { return maxScore; }
    public void setMaxScore(Integer maxScore) { this.maxScore = maxScore; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    public BigDecimal getApr() { return apr; }
    public void setApr(BigDecimal apr) { this.apr = apr; }
}
