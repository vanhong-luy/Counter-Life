package com.equinox.admin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "savings_goals")
public class SavingsGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "goal_id")
    private Long goalId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "goal_name", nullable = false, length = 100)
    private String goalName;

    @Column(nullable = false, length = 50)
    private String category = "Other";

    @Column(name = "target_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal targetAmount;

    @Column(name = "current_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "auto_release")
    private Boolean autoRelease = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public SavingsGoal() {}

    public Long getGoalId() { return goalId; }
    public void setGoalId(Long goalId) { this.goalId = goalId; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }
    public String getGoalName() { return goalName; }
    public void setGoalName(String goalName) { this.goalName = goalName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getTargetAmount() { return targetAmount; }
    public void setTargetAmount(BigDecimal targetAmount) { this.targetAmount = targetAmount; }
    public BigDecimal getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(BigDecimal currentAmount) { this.currentAmount = currentAmount; }
    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getAutoRelease() { return autoRelease; }
    public void setAutoRelease(Boolean autoRelease) { this.autoRelease = autoRelease; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
