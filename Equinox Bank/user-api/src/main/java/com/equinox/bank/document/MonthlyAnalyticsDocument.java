package com.equinox.bank.document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "monthly_analytics")
public class MonthlyAnalyticsDocument {

    @Id
    private String id;

    @Indexed
    private String email;

    @Indexed
    private String period;

    private BigDecimal totalIncome;
    private BigDecimal totalExpenses;
    private BigDecimal netBalance;
    private List<CategoryItem> categories;
    private LocalDateTime computedAt;

    public MonthlyAnalyticsDocument() {}

    public MonthlyAnalyticsDocument(String email, String period,
                                     BigDecimal totalIncome, BigDecimal totalExpenses, BigDecimal netBalance,
                                     List<CategoryItem> categories) {
        this.email = email;
        this.period = period;
        this.totalIncome = totalIncome;
        this.totalExpenses = totalExpenses;
        this.netBalance = netBalance;
        this.categories = categories;
        this.computedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public BigDecimal getTotalIncome() { return totalIncome; }
    public void setTotalIncome(BigDecimal totalIncome) { this.totalIncome = totalIncome; }
    public BigDecimal getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(BigDecimal totalExpenses) { this.totalExpenses = totalExpenses; }
    public BigDecimal getNetBalance() { return netBalance; }
    public void setNetBalance(BigDecimal netBalance) { this.netBalance = netBalance; }
    public List<CategoryItem> getCategories() { return categories; }
    public void setCategories(List<CategoryItem> categories) { this.categories = categories; }
    public LocalDateTime getComputedAt() { return computedAt; }
    public void setComputedAt(LocalDateTime computedAt) { this.computedAt = computedAt; }

    public static class CategoryItem {
        private String categoryName;
        private BigDecimal totalAmount;
        private long transactionCount;
        private List<TransactionItem> topTransactions;

        public CategoryItem() {}

        public CategoryItem(String categoryName, BigDecimal totalAmount,
                            long transactionCount, List<TransactionItem> topTransactions) {
            this.categoryName = categoryName;
            this.totalAmount = totalAmount;
            this.transactionCount = transactionCount;
            this.topTransactions = topTransactions;
        }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
        public long getTransactionCount() { return transactionCount; }
        public void setTransactionCount(long transactionCount) { this.transactionCount = transactionCount; }
        public List<TransactionItem> getTopTransactions() { return topTransactions; }
        public void setTopTransactions(List<TransactionItem> topTransactions) { this.topTransactions = topTransactions; }
    }

    public static class TransactionItem {
        private String referenceNumber;
        private String description;
        private BigDecimal amount;
        private LocalDateTime date;

        public TransactionItem() {}

        public TransactionItem(String referenceNumber, String description, BigDecimal amount, LocalDateTime date) {
            this.referenceNumber = referenceNumber;
            this.description = description;
            this.amount = amount;
            this.date = date;
        }

        public String getReferenceNumber() { return referenceNumber; }
        public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public LocalDateTime getDate() { return date; }
        public void setDate(LocalDateTime date) { this.date = date; }
    }
}