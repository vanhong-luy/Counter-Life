package com.equinox.bank.service;

import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.AccountType;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.AccountTypeRepository;
import com.equinox.bank.repository.TransactionCategoryRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.equinox.bank.repository.FixedDepositRateRepository;

@Service
public class ScheduledInterestService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledInterestService.class);

    private final AccountRepository accountRepository;
    private final AccountTypeRepository accountTypeRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final TransactionRepository transactionRepository;
    private final FixedDepositRateRepository fixedDepositRateRepository;

    public ScheduledInterestService(AccountRepository accountRepository,
                                    AccountTypeRepository accountTypeRepository,
                                    TransactionTypeRepository transactionTypeRepository,
                                    TransactionCategoryRepository transactionCategoryRepository,
                                    TransactionRepository transactionRepository,
                                    FixedDepositRateRepository fixedDepositRateRepository) {
        this.accountRepository = accountRepository;
        this.accountTypeRepository = accountTypeRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.transactionRepository = transactionRepository;
        this.fixedDepositRateRepository = fixedDepositRateRepository;
    }

    @Transactional
    @Scheduled(cron = "0 0 2 * * ?")
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, allEntries = true)
    public void applyMonthlyInterestAndFees() {
        log.info("Starting monthly interest and fee application");

        List<Account> accounts = accountRepository.findByStatus("active");

        for (Account account : accounts) {
            AccountType type = account.getAccountType();
            if (type == null) continue;

            String typeName = type.getTypeName();
            if (typeName == null) continue;

            OffsetDateTime now = OffsetDateTime.now();
            LocalDateTime lastApplied = account.getLastInterestDate();

            boolean alreadyAppliedThisMonth = lastApplied != null
                    && lastApplied.getMonth() == now.getMonth()
                    && lastApplied.getYear() == now.getYear();

            if (alreadyAppliedThisMonth) continue;

            if (type.getInterestRate() != null && type.getInterestRate().compareTo(BigDecimal.ZERO) > 0) {
                applyInterest(account, type, now);
            }
        }

        processMaturedFixedDeposits();

        log.info("Finished monthly interest and fee application");
    }

    @Transactional
    public void processMaturedFixedDeposits() {
        List<Account> maturedFds = accountRepository.findMaturedFixedDeposits(LocalDate.now());

        if (maturedFds.isEmpty()) return;

        TransactionType interestType = transactionTypeRepository.findByTypeName("interest")
                .orElseGet(() -> createTransactionType("interest"));

        for (Account fd : maturedFds) {
            AccountType acctType = fd.getAccountType();
            BigDecimal annualRate = (fd.getTermMonths() != null)
                    ? fixedDepositRateRepository.findByTermMonths(fd.getTermMonths())
                            .map(r -> r.getInterestRate())
                            .orElse(acctType.getInterestRate())
                    : acctType.getInterestRate();
            BigDecimal termFraction = BigDecimal.valueOf(fd.getTermMonths())
                    .divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
            BigDecimal interestAmount = fd.getBalance().multiply(annualRate).multiply(termFraction)
                    .setScale(2, RoundingMode.HALF_UP);

            fd.setBalance(fd.getBalance().add(interestAmount));

            Transaction tx = new Transaction();
            tx.setType(interestType);
            tx.setTargetAccount(fd);
            tx.setAmount(interestAmount);
            tx.setCurrency("USD");
            tx.setStatus("completed");
            tx.setDescription("Fixed Deposit maturity interest — " + acctType.getTypeName());
            tx.setReferenceNumber("FD-MAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            tx.setTransactionDate(OffsetDateTime.now());
            transactionRepository.save(tx);

            String disposition = fd.getPrincipalDisposition();
            if ("TRANSFER_TO_PRIMARY".equals(disposition)) {
                List<Account> primaryAccounts = accountRepository.findByCustomerAndIsPrimaryTrue(fd.getCustomer());
                Account primary = primaryAccounts.isEmpty() ? null : primaryAccounts.get(0);
                if (primary != null) {
                    primary.setBalance(primary.getBalance().add(fd.getBalance()));
                    accountRepository.save(primary);

                    Transaction transferTx = new Transaction();
                    transferTx.setType(transactionTypeRepository.findByTypeName("transfer")
                            .orElseGet(() -> createTransactionType("transfer")));
                    transferTx.setSourceAccount(fd);
                    transferTx.setTargetAccount(primary);
                    transferTx.setAmount(fd.getBalance());
                    transferTx.setCurrency("USD");
                    transferTx.setStatus("completed");
                    transferTx.setDescription("Fixed Deposit maturity transfer to primary account");
                    transferTx.setReferenceNumber("FD-TRF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    transferTx.setTransactionDate(OffsetDateTime.now());
                    transactionRepository.save(transferTx);

                    fd.setBalance(BigDecimal.ZERO);
                }
                fd.setStatus("matured");
                fd.setMatured(true);
            } else {
                fd.setMaturityDate(LocalDate.now().plusMonths(fd.getTermMonths()));
                fd.setMatured(false);
                fd.setPrincipalDisposition("TRANSFER_TO_PRIMARY");
            }

            fd.setLastInterestDate(LocalDateTime.now());
            accountRepository.save(fd);

            log.info("Processed matured Fixed Deposit {}: interest={}, disposition={}",
                    fd.getAccountId(), interestAmount, disposition);
        }
    }

    private void applyInterest(Account account, AccountType type, OffsetDateTime now) {
        BigDecimal annualRate = type.getInterestRate();
        if (annualRate.compareTo(BigDecimal.ZERO) == 0) return;

        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        BigDecimal interest = account.getBalance().multiply(monthlyRate).setScale(4, RoundingMode.HALF_UP);
        if (interest.compareTo(BigDecimal.ZERO) <= 0) return;

        account.setBalance(account.getBalance().add(interest));
        account.setLastInterestDate(now.toLocalDateTime());
        accountRepository.save(account);

        TransactionType interestType = transactionTypeRepository.findByTypeName("interest")
                .orElseGet(() -> createTransactionType("interest"));

        TransactionCategory cat = transactionCategoryRepository.findByCategoryName("Interest Payment")
                .orElse(null);

        Transaction txn = new Transaction();
        txn.setType(interestType);
        txn.setTargetAccount(account);
        txn.setAmount(interest);
        txn.setCurrency(account.getCurrency());
        txn.setStatus("completed");
        txn.setDescription("Monthly interest (" + type.getTypeName() + ")");
        txn.setReferenceNumber("INT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        txn.setTransactionDate(now);
        txn.setCategory(cat);
        transactionRepository.save(txn);

        log.info("Applied {} interest to account {}: {}", interest, account.getAccountId(), type.getTypeName());
    }

    private TransactionType createTransactionType(String name) {
        TransactionType tt = new TransactionType();
        tt.setTypeName(name);
        return transactionTypeRepository.save(tt);
    }
}
