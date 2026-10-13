package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.SavingsGoalActionRequestDTO;
import com.equinox.bank.dto.SavingsGoalRequestDTO;
import com.equinox.bank.dto.SavingsGoalResponseDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.SavingsGoal;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.MonthlyAnalyticsRepository;
import com.equinox.bank.repository.SavingsGoalRepository;
import com.equinox.bank.repository.TransactionCategoryRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;

@Service
@Transactional(readOnly = true)
public class SavingsGoalService {

    private static final Logger log = LoggerFactory.getLogger(SavingsGoalService.class);

    private final SavingsGoalRepository savingsGoalRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final TransactionRepository transactionRepository;
    private final MonthlyAnalyticsRepository analyticsRepository;

    @Autowired
    public SavingsGoalService(SavingsGoalRepository savingsGoalRepository,
                              CustomerRepository customerRepository,
                              AccountRepository accountRepository,
                              TransactionTypeRepository transactionTypeRepository,
                              TransactionCategoryRepository transactionCategoryRepository,
                              TransactionRepository transactionRepository,
                              MonthlyAnalyticsRepository analyticsRepository) {
        this.savingsGoalRepository = savingsGoalRepository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.transactionRepository = transactionRepository;
        this.analyticsRepository = analyticsRepository;
    }

    private Customer findCustomerByEmail(String email) {
        return customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    private TransactionCategory getSavingsCategory() {
        return transactionCategoryRepository.findByCategoryName("Savings Goal").orElse(null);
    }

    private TransactionType getTransactionType(String typeName) {
        return transactionTypeRepository.findByTypeName(typeName)
                .orElseThrow(() -> new RuntimeException("Transaction type '" + typeName + "' not found"));
    }

    private void invalidateAnalytics(String email) {
        try {
            analyticsRepository.deleteByEmailAndPeriod(email, java.time.YearMonth.now().toString());
        } catch (Exception e) {
            log.warn("Failed to invalidate analytics cache for {}: {}", email, e.getMessage());
        }
    }

    private void recordTransaction(String refPrefix, Account account, String txTypeName,
                                    BigDecimal amount, String description) {
        TransactionType txType = getTransactionType(txTypeName);
        Transaction tx = new Transaction();
        tx.setReferenceNumber(refPrefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        tx.setType(txType);
        tx.setCategory(getSavingsCategory());

        // Record the account on the side the money actually moved: funding a goal takes
        // money OUT of the account, releasing one puts it back IN. Getting this wrong
        // makes the ledger show a goal deposit as incoming.
        boolean moneyLeavesAccount = "savings_goal_deposit".equals(txTypeName);
        tx.setSourceAccount(moneyLeavesAccount ? account : null);
        tx.setTargetAccount(moneyLeavesAccount ? null : account);

        tx.setAmount(amount);
        tx.setCurrency("USD");
        tx.setStatus("completed");
        tx.setDescription(description);
        tx.setTransactionDate(OffsetDateTime.now());
        transactionRepository.save(tx);
    }

    public List<SavingsGoalResponseDTO> getGoals(String email) {
        Customer customer = findCustomerByEmail(email);
        return savingsGoalRepository.findByCustomer(customer).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "customer_accounts", key = "#email")
    public SavingsGoalResponseDTO createGoal(String email, SavingsGoalRequestDTO dto) {
        Customer customer = findCustomerByEmail(email);

        Account account = accountRepository.findById(dto.accountId())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        if (!account.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new RuntimeException("Account does not belong to this customer");
        }

        SavingsGoal goal = new SavingsGoal();
        goal.setCustomer(customer);
        goal.setAccount(account);
        goal.setGoalName(dto.goalName());
        goal.setCategory(dto.category() != null ? dto.category() : "Other");
        goal.setTargetAmount(dto.targetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setTargetDate(dto.targetDate());
        goal.setStatus("ACTIVE");
        goal.setAutoRelease(dto.autoRelease() != null && dto.autoRelease());

        SavingsGoal saved = savingsGoalRepository.save(goal);
        return mapToDTO(saved);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_accounts", key = "#email"),
        @CacheEvict(value = "customer_transactions", key = "#email")
    })
    public SavingsGoalResponseDTO deposit(String email, Long goalId, SavingsGoalActionRequestDTO dto) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Goal not found"));
        if (!goal.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to goal");
        }
        if (!"ACTIVE".equals(goal.getStatus())) {
            throw new RuntimeException("Cannot deposit into a " + goal.getStatus() + " goal");
        }

        BigDecimal amount = dto.amount();
        Account account = goal.getAccount();

        if (account.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient account balance");
        }

        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        goal.setCurrentAmount(goal.getCurrentAmount().add(amount));
        boolean justCompleted = false;
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus("COMPLETED");
            justCompleted = true;
        }
        goal.setUpdatedAt(LocalDateTime.now());
        savingsGoalRepository.save(goal);

        recordTransaction("SGD", account, "savings_goal_deposit", amount,
                "Deposit to savings goal: " + goal.getGoalName());

        if (justCompleted && Boolean.TRUE.equals(goal.getAutoRelease())) {
            BigDecimal fullAmount = goal.getCurrentAmount();
            goal.setCurrentAmount(BigDecimal.ZERO);
            goal.setUpdatedAt(LocalDateTime.now());
            savingsGoalRepository.save(goal);

            account.setBalance(account.getBalance().add(fullAmount));
            accountRepository.save(account);

            recordTransaction("SGR", account, "savings_goal_withdrawal", fullAmount,
                    "Auto-release from completed goal: " + goal.getGoalName());
        }

        invalidateAnalytics(email);
        return mapToDTO(goal);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_accounts", key = "#email"),
        @CacheEvict(value = "customer_transactions", key = "#email")
    })
    public SavingsGoalResponseDTO withdraw(String email, Long goalId, SavingsGoalActionRequestDTO dto) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Goal not found"));
        if (!goal.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to goal");
        }
        if (!"ACTIVE".equals(goal.getStatus()) && !"COMPLETED".equals(goal.getStatus())) {
            throw new RuntimeException("Cannot withdraw from a " + goal.getStatus() + " goal");
        }

        BigDecimal amount = dto.amount();
        if (goal.getCurrentAmount().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient goal balance");
        }

        Account account = goal.getAccount();

        goal.setCurrentAmount(goal.getCurrentAmount().subtract(amount));
        if (goal.getCurrentAmount().compareTo(BigDecimal.ZERO) == 0
                && "COMPLETED".equals(goal.getStatus())) {
            goal.setStatus("ACTIVE");
        }
        goal.setUpdatedAt(LocalDateTime.now());
        savingsGoalRepository.save(goal);

        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        recordTransaction("SGW", account, "savings_goal_withdrawal", amount,
                "Release from savings goal: " + goal.getGoalName());

        invalidateAnalytics(email);
        return mapToDTO(goal);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "customer_accounts", key = "#email"),
        @CacheEvict(value = "customer_transactions", key = "#email")
    })
    public void cancelGoal(String email, Long goalId) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Goal not found"));
        if (!goal.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to goal");
        }
        if ("CANCELLED".equals(goal.getStatus())) {
            throw new RuntimeException("Goal is already cancelled");
        }

        BigDecimal refundAmount = goal.getCurrentAmount();
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            Account account = goal.getAccount();

            goal.setCurrentAmount(BigDecimal.ZERO);
            goal.setUpdatedAt(LocalDateTime.now());
            savingsGoalRepository.save(goal);

            account.setBalance(account.getBalance().add(refundAmount));
            accountRepository.save(account);

            recordTransaction("SGC", account, "savings_goal_withdrawal", refundAmount,
                    "Refund from cancelled goal: " + goal.getGoalName());
        }

        goal.setStatus("CANCELLED");
        goal.setUpdatedAt(LocalDateTime.now());
        savingsGoalRepository.save(goal);

        invalidateAnalytics(email);
    }

    private SavingsGoalResponseDTO mapToDTO(SavingsGoal goal) {
        return new SavingsGoalResponseDTO(
                goal.getGoalId(),
                goal.getCustomer().getCustomerId(),
                goal.getAccount().getAccountId(),
                goal.getGoalName(),
                goal.getCategory(),
                goal.getTargetAmount(),
                goal.getCurrentAmount(),
                goal.getTargetDate(),
                goal.getStatus(),
                goal.getAutoRelease(),
                goal.getCreatedAt());
    }
}
