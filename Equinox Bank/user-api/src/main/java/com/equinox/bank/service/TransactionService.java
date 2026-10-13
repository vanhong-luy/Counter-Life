package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.DepositWithdrawRequestDTO;
import com.equinox.bank.dto.RefundRequestDTO;
import com.equinox.bank.dto.RefundResponseDTO;
import com.equinox.bank.dto.TransactionResponseDTO;
import com.equinox.bank.dto.TransferRequestDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.CardTransaction;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.Refund;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.CardRepository;
import com.equinox.bank.repository.CardTransactionRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.MonthlyAnalyticsRepository;
import com.equinox.bank.repository.RefundRepository;
import com.equinox.bank.repository.TransactionCategoryRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional(readOnly = true)
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);
    private static final BigDecimal INTERNATIONAL_TRANSFER_FEE = BigDecimal.valueOf(25);

    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final RefundRepository refundRepository;
    private final MonthlyAnalyticsRepository analyticsRepository;
    private final CardRepository cardRepository;
    private final CardTransactionRepository cardTransactionRepository;

    public TransactionService(TransactionRepository transactionRepository,
                              TransactionTypeRepository transactionTypeRepository,
                              TransactionCategoryRepository transactionCategoryRepository,
                              AccountRepository accountRepository,
                              CustomerRepository customerRepository,
                              RefundRepository refundRepository,
                              MonthlyAnalyticsRepository analyticsRepository,
                              CardRepository cardRepository,
                              CardTransactionRepository cardTransactionRepository) {
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.refundRepository = refundRepository;
        this.analyticsRepository = analyticsRepository;
        this.cardRepository = cardRepository;
        this.cardTransactionRepository = cardTransactionRepository;
    }

    private void validateCardForAtm(Card card, Account account, Customer customer) {
        if (!card.getAccount().getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Card does not belong to this customer");
        }
        if (!card.getAccount().getAccountId().equals(account.getAccountId())) {
            throw new IllegalArgumentException("Card is not linked to the selected account");
        }
        if (Boolean.TRUE.equals(card.getIsFrozen())) {
            throw new IllegalArgumentException("This card is frozen — ATM transactions are not allowed until it is unfrozen");
        }
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, key = "#email")
    public TransactionResponseDTO deposit(String email, DepositWithdrawRequestDTO dto) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account account = accountRepository.findById(dto.accountId())
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!account.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Account does not belong to this customer");
        }

        if ("Loan Disbursement".equals(account.getAccountType().getTypeName())) {
            throw new IllegalArgumentException("Cannot deposit into a Loan Disbursement account");
        }

        if ("Fixed Deposit".equals(account.getAccountType().getTypeName())) {
            throw new IllegalArgumentException("A Fixed Deposit can only be funded once at creation — additional deposits are not allowed");
        }

        if (dto.cardId() != null) {
            Card card = cardRepository.findById(dto.cardId())
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
            validateCardForAtm(card, account, customer);
        }

        TransactionType depositType = transactionTypeRepository.findByTypeName("deposit")
            .orElseThrow(() -> new IllegalArgumentException("Transaction type 'deposit' not found"));

        Transaction transaction = new Transaction();
        transaction.setType(depositType);
        transaction.setTargetAccount(account);
        transaction.setSourceAccount(null);
        transaction.setAmount(dto.amount());
        transaction.setCurrency("USD");
        transaction.setStatus("completed");
        transaction.setDescription(dto.description());
        transaction.setReferenceNumber("DEP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transaction.setTransactionDate(OffsetDateTime.now());
        transaction.setCategory(getCategory(dto.categoryId()));

        account.setBalance(account.getBalance().add(dto.amount()));
        accountRepository.save(account);
        Transaction saved = transactionRepository.save(transaction);

        if (dto.cardId() != null) {
            Card usedCard = cardRepository.findById(dto.cardId()).orElse(null);
            if (usedCard != null) {
                CardTransaction ct = new CardTransaction();
                ct.setCard(usedCard);
                ct.setAmount(dto.amount());
                ct.setMerchant("ATM Deposit");
                ct.setDescription("ATM Deposit to " + account.getName());
                ct.setTransactionDate(LocalDateTime.now());
                ct.setTransactionId(saved.getTransactionId());
                cardTransactionRepository.save(ct);
            }
        }

        invalidateAnalyticsCache(email);
        return mapToTransactionResponseDTO(saved);
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, key = "#email")
    public TransactionResponseDTO withdraw(String email, DepositWithdrawRequestDTO dto) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account account = accountRepository.findById(dto.accountId())
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!account.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Account does not belong to this customer");
        }

        if ("Fixed Deposit".equals(account.getAccountType().getTypeName())) {
            throw new IllegalArgumentException("Cannot withdraw from a Fixed Deposit account");
        }

        if (dto.cardId() != null) {
            Card card = cardRepository.findById(dto.cardId())
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
            validateCardForAtm(card, account, customer);
        } else if (cardRepository.findByAccount(account).stream().anyMatch(c -> Boolean.TRUE.equals(c.getIsFrozen()))) {
            // No card selected, but this account has a frozen card — block the ATM-only bypass.
            throw new IllegalArgumentException("This account has a frozen card — ATM transactions are not allowed until it is unfrozen");
        }

        if (account.getBalance().compareTo(dto.amount()) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }

        TransactionType withdrawType = transactionTypeRepository.findByTypeName("withdrawal")
            .orElseThrow(() -> new IllegalArgumentException("Transaction type 'withdrawal' not found"));

        Transaction transaction = new Transaction();
        transaction.setType(withdrawType);
        transaction.setSourceAccount(account);
        transaction.setTargetAccount(null);
        transaction.setAmount(dto.amount());
        transaction.setCurrency("USD");
        transaction.setStatus("completed");
        transaction.setDescription(dto.description());
        transaction.setReferenceNumber("WTH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transaction.setTransactionDate(OffsetDateTime.now());
        transaction.setCategory(getCategory(dto.categoryId()));

        account.setBalance(account.getBalance().subtract(dto.amount()));
        accountRepository.save(account);
        Transaction saved = transactionRepository.save(transaction);

        if (dto.cardId() != null) {
            Card usedCard = cardRepository.findById(dto.cardId()).orElse(null);
            if (usedCard != null) {
                CardTransaction ct = new CardTransaction();
                ct.setCard(usedCard);
                ct.setAmount(dto.amount());
                ct.setMerchant("ATM Withdrawal");
                ct.setDescription("ATM Withdrawal from " + account.getName());
                ct.setTransactionDate(LocalDateTime.now());
                ct.setTransactionId(saved.getTransactionId());
                cardTransactionRepository.save(ct);
            }
        }

        invalidateAnalyticsCache(email);
        return mapToTransactionResponseDTO(saved);
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, key = "#email")
    public TransactionResponseDTO transfer(String email, TransferRequestDTO dto) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account sourceAccount = accountRepository.findById(dto.sourceAccountId())
            .orElseThrow(() -> new IllegalArgumentException("Source account not found"));

        if (!sourceAccount.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Source account does not belong to this customer");
        }

        if ("Fixed Deposit".equals(sourceAccount.getAccountType().getTypeName())) {
            throw new IllegalArgumentException("Cannot transfer from a Fixed Deposit account");
        }

        boolean isInternational = Boolean.TRUE.equals(dto.isInternational());
        if (isInternational && (dto.swiftCode() == null || dto.swiftCode().isBlank())) {
            throw new IllegalArgumentException("SWIFT/BIC code is required for international transfers");
        }

        BigDecimal fee = isInternational ? INTERNATIONAL_TRANSFER_FEE : BigDecimal.ZERO;
        if (sourceAccount.getBalance().compareTo(dto.amount().add(fee)) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }

        TransactionType transferType = transactionTypeRepository.findByTypeName("transfer")
            .orElseThrow(() -> new IllegalArgumentException("Transaction type 'transfer' not found"));

        Account targetAccount = null;
        if (dto.targetAccountId() != null && dto.targetAccountId() > 0) {
            targetAccount = accountRepository.findById(dto.targetAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Target account not found"));
            if ("Loan Disbursement".equals(targetAccount.getAccountType().getTypeName())) {
                throw new IllegalArgumentException("Cannot transfer into a Loan Disbursement account");
            }
            if ("Fixed Deposit".equals(targetAccount.getAccountType().getTypeName())) {
                throw new IllegalArgumentException("A Fixed Deposit can only be funded once at creation — additional deposits are not allowed");
            }
        }

        String description = dto.description();
        if (isInternational) {
            String recipient = (dto.recipientName() != null && !dto.recipientName().isBlank())
                ? dto.recipientName() : "recipient";
            String note = "International transfer to " + recipient + " (SWIFT: " + dto.swiftCode() + ")";
            description = (description != null && !description.isBlank()) ? note + " - " + description : note;
        }

        Transaction transaction = new Transaction();
        transaction.setType(transferType);
        transaction.setSourceAccount(sourceAccount);
        transaction.setTargetAccount(targetAccount);
        transaction.setAmount(dto.amount());
        transaction.setCurrency("USD");
        transaction.setStatus("completed");
        transaction.setDescription(description);
        transaction.setReferenceNumber((isInternational ? "INTL-" : "TRF-") + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transaction.setTransactionDate(OffsetDateTime.now());
        transaction.setCategory(getCategory(dto.categoryId()));

        sourceAccount.setBalance(sourceAccount.getBalance().subtract(dto.amount()));
        if (targetAccount != null) {
            targetAccount.setBalance(targetAccount.getBalance().add(dto.amount()));
            accountRepository.save(targetAccount);
        }
        if (isInternational) {
            sourceAccount.setBalance(sourceAccount.getBalance().subtract(fee));
        }
        accountRepository.save(sourceAccount);
        Transaction saved = transactionRepository.save(transaction);

        if (isInternational) {
            TransactionType withdrawalType = transactionTypeRepository.findByTypeName("withdrawal")
                .orElseThrow(() -> new IllegalArgumentException("Transaction type 'withdrawal' not found"));
            Transaction feeTxn = new Transaction();
            feeTxn.setType(withdrawalType);
            feeTxn.setSourceAccount(sourceAccount);
            feeTxn.setTargetAccount(null);
            feeTxn.setAmount(fee);
            feeTxn.setCurrency(sourceAccount.getCurrency());
            feeTxn.setStatus("completed");
            feeTxn.setDescription("International transfer fee for " + saved.getReferenceNumber());
            feeTxn.setReferenceNumber("FEE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            feeTxn.setTransactionDate(OffsetDateTime.now());
            transactionRepository.save(feeTxn);
        }

        invalidateAnalyticsCache(email);
        return mapToTransactionResponseDTO(saved);
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, key = "#email")
    public RefundResponseDTO refund(String email, Long transactionId, RefundRequestDTO dto) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Transaction originalTransaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        Account targetAccount = originalTransaction.getTargetAccount();
        Account sourceAccount = originalTransaction.getSourceAccount();
        boolean ownsTransaction = (targetAccount != null && targetAccount.getCustomer().getCustomerId().equals(customer.getCustomerId()))
            || (targetAccount == null && sourceAccount != null && sourceAccount.getCustomer().getCustomerId().equals(customer.getCustomerId()));
        if (!ownsTransaction) {
            throw new IllegalArgumentException("Customer does not own the account for this transaction");
        }
        if (targetAccount == null) targetAccount = sourceAccount;

        List<Refund> existing = refundRepository.findByOriginalTransaction(originalTransaction);
        if (!existing.isEmpty()) {
            throw new IllegalArgumentException("A refund request already exists for this transaction");
        }

        Refund refund = new Refund();
        refund.setOriginalTransaction(originalTransaction);
        refund.setRefundAmount(dto.refundAmount());
        refund.setReason(dto.reason());
        refund.setComment(dto.comment());
        refund.setStatus("pending");
        refund.setProcessedAt(LocalDateTime.now());
        Refund savedRefund = refundRepository.save(refund);

        invalidateAnalyticsCache(email);
        return mapToRefundResponseDTO(savedRefund);
    }

    @Cacheable(value = "customer_transactions", key = "#email")
    public List<TransactionResponseDTO> getTransactionHistory(String email) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        List<Account> accounts = accountRepository.findByCustomer(customer);
        List<Transaction> transactions = new ArrayList<>();

        for (Account account : accounts) {
            transactions.addAll(
                transactionRepository.findBySourceAccountOrTargetAccount(account, account));
        }

        return transactions.stream()
            .distinct()
            .sorted(Comparator.comparing(Transaction::getTransactionDate).reversed())
            .map(this::mapToTransactionResponseDTO)
            .toList();
    }

    @Cacheable(value = "customer_transactions", key = "#email + ':' + #transactionId")
    public TransactionResponseDTO getTransactionById(String email, Long transactionId) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        List<Account> accounts = accountRepository.findByCustomer(customer);
        boolean ownsTransaction = false;
        for (Account account : accounts) {
            if ((transaction.getSourceAccount() != null
                    && transaction.getSourceAccount().getAccountId().equals(account.getAccountId()))
                || (transaction.getTargetAccount() != null
                    && transaction.getTargetAccount().getAccountId().equals(account.getAccountId()))) {
                ownsTransaction = true;
                break;
            }
        }

        if (!ownsTransaction) {
            throw new IllegalArgumentException("Transaction does not belong to this customer");
        }

        return mapToTransactionResponseDTO(transaction);
    }

    public RefundResponseDTO getRefundForTransaction(String email, Long transactionId) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        List<Account> accounts = accountRepository.findByCustomer(customer);
        boolean ownsTransaction = false;
        for (Account account : accounts) {
            if ((transaction.getSourceAccount() != null
                    && transaction.getSourceAccount().getAccountId().equals(account.getAccountId()))
                || (transaction.getTargetAccount() != null
                    && transaction.getTargetAccount().getAccountId().equals(account.getAccountId()))) {
                ownsTransaction = true;
                break;
            }
        }

        if (!ownsTransaction) {
            throw new IllegalArgumentException("Transaction does not belong to this customer");
        }

        List<Refund> refunds = refundRepository.findByOriginalTransaction(transaction);
        if (refunds.isEmpty()) {
            return null;
        }
        return mapToRefundResponseDTO(refunds.get(0));
    }

    private TransactionResponseDTO mapToTransactionResponseDTO(Transaction t) {
        String typeName = t.getType() != null ? t.getType().getTypeName() : null;
        String categoryName = t.getCategory() != null ? t.getCategory().getCategoryName() : typeName;
        String iconType = deriveIconType(typeName);
        return new TransactionResponseDTO(
            t.getTransactionId(),
            t.getReferenceNumber(),
            typeName,
            categoryName,
            iconType,
            t.getSourceAccount() != null ? t.getSourceAccount().getAccountId() : null,
            t.getTargetAccount() != null ? t.getTargetAccount().getAccountId() : null,
            t.getAmount(),
            t.getCurrency(),
            t.getStatus(),
            t.getDescription(),
            t.getTransactionDate()
        );
    }

    private String deriveIconType(String typeName) {
        if (typeName == null) return "general";
        return switch (typeName) {
            case "deposit" -> "deposit";
            case "withdrawal" -> "withdrawal";
            case "transfer" -> "transfer";
            case "refund" -> "refund";
            case "loan_repayment" -> "loan";
            case "interest" -> "interest";
            case "loan_interest", "late_fee", "interest_charge" -> "fee";
            case "debit_purchase", "credit_purchase" -> "store";
            case "payment" -> "payment";
            case "savings_goal_deposit", "savings_goal_withdrawal" -> "savings";
            default -> "general";
        };
    }

    private RefundResponseDTO mapToRefundResponseDTO(Refund r) {
        return new RefundResponseDTO(
            r.getRefundId(),
            r.getOriginalTransaction() != null ? r.getOriginalTransaction().getTransactionId() : null,
            r.getRefundAmount(),
            r.getReason(),
            r.getComment(),
            r.getStatus(),
            r.getRemarks(),
            r.getProcessedAt(),
            r.getReviewedAt()
        );
    }

    private TransactionCategory getCategory(Integer categoryId) {
        if (categoryId != null) {
            return transactionCategoryRepository.findById(categoryId).orElse(null);
        }
        return transactionCategoryRepository.findByCategoryName("Others").orElse(null);
    }

    private void invalidateAnalyticsCache(String email) {
        try {
            String currentMonth = java.time.YearMonth.now().toString();
            analyticsRepository.deleteByEmailAndPeriod(email, currentMonth);
        } catch (Exception e) {
            log.warn("Failed to invalidate analytics cache for {}: {}", email, e.getMessage());
        }
    }
}
