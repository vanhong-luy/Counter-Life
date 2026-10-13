package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "card_types")
public class CardType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "card_type_id")
    private Integer cardTypeId;

    @Column(name = "network", nullable = false, length = 20)
    private String network;

    @Column(name = "type_name", nullable = false, length = 20)
    private String typeName;

    @Column(name = "default_apr", precision = 5, scale = 4)
    private BigDecimal defaultApr;

    @Column(name = "late_fee", nullable = false, precision = 19, scale = 4)
    private BigDecimal lateFee = BigDecimal.ZERO;

    public CardType() {}

    public Integer getCardTypeId() { return cardTypeId; }
    public void setCardTypeId(Integer cardTypeId) { this.cardTypeId = cardTypeId; }
    public String getNetwork() { return network; }
    public void setNetwork(String network) { this.network = network; }
    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }
    public BigDecimal getDefaultApr() { return defaultApr; }
    public void setDefaultApr(BigDecimal defaultApr) { this.defaultApr = defaultApr; }
    public BigDecimal getLateFee() { return lateFee; }
    public void setLateFee(BigDecimal lateFee) { this.lateFee = lateFee; }
}
