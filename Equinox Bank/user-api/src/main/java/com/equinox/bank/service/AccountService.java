package com.equinox.bank.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.AccountCreationRequestDTO;
import com.equinox.bank.dto.AccountResponseDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.AccountType;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.entity.IdempotencyKey;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.AccountTypeRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.FixedDepositRateRepository;
import com.equinox.bank.repository.IdempotencyKeyRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;

@Service
@Transactional(readOnly = true)
public class AccountService {

    private static final int FIXED_DEPOSIT_TERM_MONTHS = 12;
    private static final Set<String> VALID_DISPOSITIONS = Set.of("REINVEST", "TRANSFER_TO_PRIMARY");
    private static final Set<String> PRIMARY_ELIGIBLE_TYPES = Set.of("Savings", "Checking");
    private static final String IDEMPOTENT_OP_CREATE_ACCOUNT = "CREATE_ACCOUNT";

    private final AccountRepository accountRepository;
    private final AccountTypeRepository accountTypeRepository;
    private final CustomerRepository customerRepository;
    private final FixedDepositRateRepository fixedDepositRateRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final IdempotencyKeyRepository idempotencyKeyRepository;

    public AccountService(AccountRepository accountRepository,
                          AccountTypeRepository accountTypeRepository,
                          CustomerRepository customerRepository,
                          FixedDepositRateRepository fixedDepositRateRepository,
                          TransactionRepository transactionRepository,
                          TransactionTypeRepository transactionTypeRepository,
                          IdempotencyKeyRepository idempotencyKeyRepository) {
        this.accountRepository = accountRepository;
        this.accountTypeRepository = accountTypeRepository;
        this.customerRepository = customerRepository;
        this.fixedDepositRateRepository = fixedDepositRateRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
    }

    // Fixed Deposit funding writes a transaction, so the cached ledger must be dropped too.
    @Caching(evict = {
        @CacheEvict(value = "customer_accounts", key = "#email"),
        @CacheEvict(value = "customer_transactions", key = "#email")
    })
    @Transactional
    public AccountResponseDTO createAccount(String email, AccountCreationRequestDTO dto) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        AccountType accountType = accountTypeRepository.findById(dto.accountTypeId())
            .orElseThrow(() -> new IllegalArgumentException("Account type not found"));

        if ("Loan Disbursement".equals(accountType.getTypeName())) {
            throw new IllegalArgumentException("This account type cannot be created directly");
        }

        // Duplicate-submit guard: a repeated request carrying the same key (double-clicked
        // button, client retry) returns the account the first request already created
        // instead of opening a second one.
        String idempotencyKey = dto.idempotencyKey();
        boolean usingIdempotencyKey = idempotencyKey != null && !idempotencyKey.isBlank();
        if (usingIdempotencyKey) {
            int claimed = idempotencyKeyRepository.tryClaim(
                idempotencyKey, customer.getCustomerId(), IDEMPOTENT_OP_CREATE_ACCOUNT);
            if (claimed == 0) {
                return resolveAlreadyCreatedAccount(idempotencyKey, customer);
            }
        }

        boolean isFirstAccount = accountRepository.findByCustomer(customer).isEmpty();
        boolean isFixedDeposit = "Fixed Deposit".equals(accountType.getTypeName());

        Account account = new Account();
        account.setCustomer(customer);
        account.setAccountType(accountType);
        account.setAccountNumber("ACC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        account.setName(dto.name());
        account.setCurrency("USD");
        account.setStatus("active");
        account.setIsPrimary(isFirstAccount);
        account.setCreatedAt(LocalDateTime.now());

        if (isFixedDeposit) {
            if (dto.amount() == null || dto.amount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Deposit amount is required for a Fixed Deposit account");
            }
            if (dto.sourceAccountId() == null) {
                throw new IllegalArgumentException("Source account is required for a Fixed Deposit account");
            }
            if (dto.principalDisposition() == null || !VALID_DISPOSITIONS.contains(dto.principalDisposition())) {
                throw new IllegalArgumentException("A valid maturity option (principalDisposition) is required");
            }

            Account sourceAccount = accountRepository.findById(dto.sourceAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Source account not found"));
            if (!sourceAccount.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
                throw new IllegalArgumentException("Source account does not belong to this customer");
            }
            if ("Fixed Deposit".equals(sourceAccount.getAccountType().getTypeName())) {
                throw new IllegalArgumentException("Cannot fund a Fixed Deposit from another Fixed Deposit account");
            }
            if (sourceAccount.getBalance().compareTo(dto.amount()) < 0) {
                throw new IllegalArgumentException("Source account balance is insufficient for this deposit amount");
            }

            sourceAccount.setBalance(sourceAccount.getBalance().subtract(dto.amount()));
            accountRepository.save(sourceAccount);

            int months = (dto.termMonths() != null && dto.termMonths() > 0) ? dto.termMonths() : FIXED_DEPOSIT_TERM_MONTHS;

            account.setBalance(dto.amount());
            account.setSourceAccount(sourceAccount);
            account.setTermMonths(months);
            account.setMaturityDate(LocalDate.now().plusMonths(months));
            account.setPrincipalDisposition(dto.principalDisposition());

            Account saved = accountRepository.save(account);

            TransactionType transferType = transactionTypeRepository.findByTypeName("transfer")
                .orElseThrow(() -> new IllegalArgumentException("Transaction type 'transfer' not found"));
            Transaction fundingTx = new Transaction();
            fundingTx.setType(transferType);
            fundingTx.setSourceAccount(sourceAccount);
            fundingTx.setTargetAccount(saved);
            fundingTx.setAmount(dto.amount());
            fundingTx.setCurrency("USD");
            fundingTx.setStatus("completed");
            fundingTx.setDescription("Fixed Deposit funding");
            fundingTx.setReferenceNumber("FD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            fundingTx.setTransactionDate(OffsetDateTime.now());
            transactionRepository.save(fundingTx);

            if (usingIdempotencyKey) {
                idempotencyKeyRepository.attachResource(idempotencyKey, saved.getAccountId());
            }
            return mapToAccountResponseDTO(saved);
        }

        account.setBalance(BigDecimal.ZERO);
        Account saved = accountRepository.save(account);
        if (usingIdempotencyKey) {
            idempotencyKeyRepository.attachResource(idempotencyKey, saved.getAccountId());
        }
        return mapToAccountResponseDTO(saved);
    }

    /**
     * A duplicate submit lost the race for the key. Hand back whatever the winning
     * request created so the caller sees one consistent result instead of an error.
     */
    private AccountResponseDTO resolveAlreadyCreatedAccount(String idempotencyKey, Customer customer) {
        IdempotencyKey record = idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey)
            .orElseThrow(() -> new IllegalArgumentException("This request has already been submitted"));

        if (!customer.getCustomerId().equals(record.getCustomerId())) {
            throw new IllegalArgumentException("This request has already been submitted");
        }
        if (record.getResourceId() == null) {
            throw new IllegalArgumentException(
                "This request is already being processed. Please wait a moment and refresh your accounts.");
        }

        Account existing = accountRepository.findById(record.getResourceId())
            .orElseThrow(() -> new IllegalArgumentException("This request has already been submitted"));
        return mapToAccountResponseDTO(existing);
    }

    @Transactional
    @CacheEvict(value = "customer_accounts", key = "#email")
    public AccountResponseDTO setPrimaryAccount(String email, Long accountId) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account target = accountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!target.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Account does not belong to this customer");
        }

        String targetTypeName = target.getAccountType() != null ? target.getAccountType().getTypeName() : null;
        if (!PRIMARY_ELIGIBLE_TYPES.contains(targetTypeName)) {
            throw new IllegalArgumentException("Only Savings and Checking accounts can be set as primary");
        }

        List<Account> allAccounts = accountRepository.findByCustomer(customer);
        Account saved = target;
        for (Account acc : allAccounts) {
            if (acc.getAccountId().equals(target.getAccountId())) {
                acc.setIsPrimary(true);
                saved = acc;
            } else if (Boolean.TRUE.equals(acc.getIsPrimary())) {
                acc.setIsPrimary(false);
            }
        }
        accountRepository.saveAll(allAccounts);
        return mapToAccountResponseDTO(saved);
    }

    @Cacheable(value = "customer_accounts", key = "#email")
    public List<AccountResponseDTO> getAccounts(String email) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        return accountRepository.findByCustomer(customer).stream()
            .filter(a -> !"closed".equals(a.getStatus()))
            .map(this::mapToAccountResponseDTO)
            .toList();
    }

    @CacheEvict(value = "customer_accounts", key = "#email")
    public AccountResponseDTO updateAccountName(String email, Long accountId, String newName) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account target = accountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!target.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Account does not belong to this customer");
        }

        if ("Loan Disbursement".equals(target.getAccountType().getTypeName())) {
            throw new IllegalArgumentException("This account cannot be renamed");
        }

        target.setName(newName.trim());
        Account saved = accountRepository.save(target);
        return mapToAccountResponseDTO(saved);
    }

    @Transactional
    // Closing an account sweeps its balance to the primary account and writes a transfer
    // transaction, so the cached ledger must be dropped or that transfer stays invisible.
    @Caching(evict = {
        @CacheEvict(value = "customer_accounts", key = "#email"),
        @CacheEvict(value = "customer_transactions", key = "#email")
    })
    public void deleteAccount(String email, Long accountId) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account target = accountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!target.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Account does not belong to this customer");
        }

        if ("closed".equals(target.getStatus())) {
            throw new IllegalArgumentException("Account is already closed");
        }

        List<Account> activeAccounts = accountRepository.findByCustomer(customer).stream()
            .filter(a -> !"closed".equals(a.getStatus()))
            .toList();

        if (activeAccounts.size() <= 1) {
            throw new IllegalArgumentException("Cannot delete your only account");
        }

        Account primary = activeAccounts.stream()
            .filter(a -> !a.getAccountId().equals(target.getAccountId()) && Boolean.TRUE.equals(a.getIsPrimary()))
            .findFirst()
            .orElse(null);

        if (Boolean.TRUE.equals(target.getIsPrimary())) {
            Account newPrimary = activeAccounts.stream()
                .filter(a -> !a.getAccountId().equals(target.getAccountId()))
                .filter(a -> PRIMARY_ELIGIBLE_TYPES.contains(
                    a.getAccountType() != null ? a.getAccountType().getTypeName() : null))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                    "Cannot delete your primary account: no eligible Savings or Checking account is available to become the new primary"));
            newPrimary.setIsPrimary(true);
            accountRepository.save(newPrimary);
            primary = newPrimary;
        }

        if (primary == null) {
            primary = activeAccounts.stream()
                .filter(a -> !a.getAccountId().equals(target.getAccountId()))
                .findFirst()
                .orElse(null);
        }

        BigDecimal remaining = target.getBalance();
        if (primary != null && remaining != null && remaining.compareTo(BigDecimal.ZERO) > 0) {
            primary.setBalance(primary.getBalance().add(remaining));
            accountRepository.save(primary);

            TransactionType transferType = transactionTypeRepository.findByTypeName("transfer")
                .orElseThrow(() -> new IllegalArgumentException("Transaction type 'transfer' not found"));
            Transaction closureTx = new Transaction();
            closureTx.setType(transferType);
            closureTx.setSourceAccount(target);
            closureTx.setTargetAccount(primary);
            closureTx.setAmount(remaining);
            closureTx.setCurrency("USD");
            closureTx.setStatus("completed");
            closureTx.setDescription("Account closure balance transfer");
            closureTx.setReferenceNumber("CLS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            closureTx.setTransactionDate(OffsetDateTime.now());
            transactionRepository.save(closureTx);

            target.setBalance(BigDecimal.ZERO);
        }

        target.setIsPrimary(false);
        target.setStatus("closed");
        accountRepository.save(target);
    }

    public AccountResponseDTO getAccount(String email, Long accountId) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!account.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new IllegalArgumentException("Account does not belong to this customer");
        }

        return mapToAccountResponseDTO(account);
    }

    private Long getCustomerId(Account account) {
        return account.getCustomer() != null ? account.getCustomer().getCustomerId() : null;
    }

    private String getAccountTypeName(Account account) {
        return account.getAccountType() != null ? account.getAccountType().getTypeName() : null;
    }

    public AccountResponseDTO lookupByAccountNumber(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber.trim())
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        String cardholderName = account.getCustomer().getFirstName()
                + " " + account.getCustomer().getLastName();
        String displayName = (account.getName() != null)
                ? cardholderName + " — " + account.getName()
                : cardholderName;
        BigDecimal interestRate = account.getAccountType() != null
            ? account.getAccountType().getInterestRate() : null;
        return new AccountResponseDTO(
                account.getAccountId(),
                displayName,
                null,
                getAccountTypeName(account),
                account.getAccountNumber(),
                null,
                account.getCurrency(),
                account.getStatus(),
                account.getIsPrimary(),
                account.getCreatedAt(),
                null, null, null, null, null, null, null, null, null, interestRate);
    }

    private AccountResponseDTO mapToAccountResponseDTO(Account account) {
        Account source = account.getSourceAccount();
        Long sourceAccountId = source != null ? source.getAccountId() : null;
        String sourceAccountNumber = source != null ? source.getAccountNumber() : null;
        String sourceAccountName = source != null
            ? (source.getName() != null ? source.getName() : getAccountTypeName(source))
            : null;

        BigDecimal interestAmount = null;
        BigDecimal totalToReceive = null;
        BigDecimal rate = account.getAccountType() != null
            ? account.getAccountType().getInterestRate() : null;

        if (account.getTermMonths() != null && rate != null) {
            rate = fixedDepositRateRepository.findByTermMonths(account.getTermMonths())
                .map(r -> r.getInterestRate())
                .orElse(rate);
            BigDecimal termFraction = BigDecimal.valueOf(account.getTermMonths())
                .divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
            interestAmount = account.getBalance().multiply(rate).multiply(termFraction)
                .setScale(4, RoundingMode.HALF_UP);
            totalToReceive = account.getBalance().add(interestAmount);
        }

        return new AccountResponseDTO(
            account.getAccountId(),
            account.getName(),
            getCustomerId(account),
            getAccountTypeName(account),
            account.getAccountNumber(),
            account.getBalance(),
            account.getCurrency(),
            account.getStatus(),
            account.getIsPrimary(),
            account.getCreatedAt(),
            sourceAccountId,
            sourceAccountNumber,
            sourceAccountName,
            account.getTermMonths(),
            account.getMaturityDate(),
            account.getPrincipalDisposition(),
            account.getMatured(),
            interestAmount,
            totalToReceive,
            rate
        );
    }
}
