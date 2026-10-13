package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.BillResponseDTO;
import com.equinox.bank.dto.CreateBillRequestDTO;
import com.equinox.bank.dto.PayBillRequestDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.CustomerBill;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.CustomerBillRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.MonthlyAnalyticsRepository;
import com.equinox.bank.repository.TransactionCategoryRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;

@Service
@Transactional(readOnly = true)
public class BillService {

    private static final Logger log = LoggerFactory.getLogger(BillService.class);
    private static final Map<String, String> BILL_TYPE_TO_CATEGORY = Map.ofEntries(
        Map.entry("Utilities", "Utilities"),
        Map.entry("Internet", "Utilities"),
        Map.entry("Subscription", "Entertainment"),
        Map.entry("Membership", "Others"),
        Map.entry("Rent", "Rent"),
        Map.entry("Insurance", "Insurance"),
        Map.entry("Loan Payment", "Others"),
        Map.entry("Credit Card", "Others"),
        Map.entry("Other", "Others")
    );

    private final CustomerBillRepository billRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final TransactionRepository transactionRepository;
    private final MonthlyAnalyticsRepository analyticsRepository;

    public BillService(CustomerBillRepository billRepository,
                       CustomerRepository customerRepository,
                       AccountRepository accountRepository,
                       TransactionTypeRepository transactionTypeRepository,
                       TransactionCategoryRepository transactionCategoryRepository,
                       TransactionRepository transactionRepository,
                       MonthlyAnalyticsRepository analyticsRepository) {
        this.billRepository = billRepository;
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

    @Transactional
    public BillResponseDTO createBill(String email, CreateBillRequestDTO dto) {
        Customer customer = findCustomerByEmail(email);

        CustomerBill bill = new CustomerBill();
        bill.setCustomer(customer);
        bill.setBillerName(dto.billerName());
        bill.setBillType(dto.billType());
        bill.setAmount(dto.amount());
        bill.setDueDate(dto.dueDate() != null ? LocalDate.parse(dto.dueDate()) : null);
        bill.setFrequency(dto.frequency());
        bill.setAutoPay(dto.autoPay() != null && dto.autoPay());
        bill.setStatus("ACTIVE");

        if (dto.sourceAccountId() != null) {
            Account account = accountRepository.findById(dto.sourceAccountId())
                    .orElseThrow(() -> new RuntimeException("Account not found"));
            if (!account.getCustomer().getEmail().equals(email)) {
                throw new RuntimeException("Account does not belong to customer");
            }
            bill.setSourceAccount(account);
        }

        if (dto.targetAccountId() != null) {
            Account target = accountRepository.findById(dto.targetAccountId())
                    .orElseThrow(() -> new RuntimeException("Target account not found"));
            bill.setTargetAccount(target);
        }

        CustomerBill saved = billRepository.save(bill);
        return mapToResponseDTO(saved);
    }

    public List<BillResponseDTO> getBills(String email) {
        Customer customer = findCustomerByEmail(email);
        return billRepository.findByCustomerCustomerIdOrderByCreatedAtDesc(customer.getCustomerId())
                .stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Transactional
    public void deleteBill(String email, Long billId) {
        CustomerBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));
        if (!bill.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to bill");
        }
        billRepository.delete(bill);
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, key = "#email")
    public BillResponseDTO payBill(String email, Long billId, PayBillRequestDTO dto) {
        CustomerBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));
        if (!bill.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to bill");
        }
        if (!"ACTIVE".equals(bill.getStatus())) {
            throw new RuntimeException("Bill is not active");
        }

        Account sourceAccount = accountRepository.findById(dto.sourceAccountId())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        if (!sourceAccount.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Account does not belong to customer");
        }
        if (sourceAccount.getBalance().compareTo(dto.amount()) < 0) {
            throw new RuntimeException("Insufficient funds");
        }

        Account targetAccount = bill.getTargetAccount();
        if (targetAccount != null) {
            targetAccount.setBalance(targetAccount.getBalance().add(dto.amount()));
            accountRepository.save(targetAccount);
        }

        sourceAccount.setBalance(sourceAccount.getBalance().subtract(dto.amount()));
        accountRepository.save(sourceAccount);

        TransactionType transferType = transactionTypeRepository.findByTypeName("transfer")
                .orElseThrow(() -> new RuntimeException("Transaction type 'transfer' not found"));

        TransactionCategory category = null;
        String catName = BILL_TYPE_TO_CATEGORY.getOrDefault(bill.getBillType(), "Others");
        category = transactionCategoryRepository.findByCategoryName(catName).orElse(null);

        String billTypeInfo = bill.getBillType() != null ? " (" + bill.getBillType() + ")" : "";
        String targetInfo = targetAccount != null
            ? " → " + targetAccount.getCustomer().getFirstName() + " " + targetAccount.getCustomer().getLastName()
            : "";
        String desc = "Bill Payment: " + bill.getBillerName() + billTypeInfo + targetInfo;

        Transaction transaction = new Transaction();
        transaction.setType(transferType);
        transaction.setSourceAccount(sourceAccount);
        transaction.setTargetAccount(targetAccount);
        transaction.setAmount(dto.amount());
        transaction.setCurrency("USD");
        transaction.setStatus("completed");
        transaction.setDescription(desc);
        transaction.setReferenceNumber("BILL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transaction.setTransactionDate(OffsetDateTime.now());
        transaction.setCategory(category);
        transactionRepository.save(transaction);

        bill.setLastPaidAt(LocalDateTime.now());
        CustomerBill saved = billRepository.save(bill);

        invalidateAnalyticsCache(email);

        return mapToResponseDTO(saved);
    }

    private BillResponseDTO mapToResponseDTO(CustomerBill bill) {
        boolean isPaid = false;
        if (bill.getLastPaidAt() != null) {
            if ("MONTHLY".equals(bill.getFrequency())) {
                YearMonth paidMonth = YearMonth.from(bill.getLastPaidAt());
                isPaid = paidMonth.equals(YearMonth.now());
            } else {
                isPaid = true;
            }
        }

        Account target = bill.getTargetAccount();
        String targetName = target != null ? target.getCustomer().getFirstName() + " " + target.getCustomer().getLastName() : null;

        return new BillResponseDTO(
                bill.getBillId(),
                bill.getBillerName(),
                bill.getBillType(),
                bill.getAmount(),
                bill.getDueDate() != null ? bill.getDueDate().toString() : null,
                bill.getFrequency(),
                bill.getAutoPay(),
                bill.getSourceAccount() != null ? bill.getSourceAccount().getAccountId() : null,
                target != null ? target.getAccountId() : null,
                targetName,
                bill.getStatus(),
                bill.getCreatedAt() != null ? bill.getCreatedAt().toString() : null,
                bill.getLastPaidAt() != null ? bill.getLastPaidAt().toString() : null,
                isPaid);
    }

    @Transactional
    @CacheEvict(value = {"customer_transactions", "customer_accounts"}, key = "#email")
    public int processAutoPayBills(String email) {
        Customer customer = findCustomerByEmail(email);
        List<CustomerBill> autoPayBills = billRepository
                .findByCustomerCustomerIdOrderByCreatedAtDesc(customer.getCustomerId()).stream()
                .filter(b -> "ACTIVE".equals(b.getStatus()) && Boolean.TRUE.equals(b.getAutoPay()))
                .toList();

        int processed = 0;
        LocalDate today = LocalDate.now();

        for (CustomerBill bill : autoPayBills) {
            if (bill.getSourceAccount() == null || bill.getAmount() == null || bill.getAmount().compareTo(BigDecimal.ZERO) <= 0) continue;

            boolean shouldPay = false;
            LocalDate billDue = bill.getDueDate();
            if ("MONTHLY".equals(bill.getFrequency())) {
                if (billDue == null) continue;
                LocalDate thisMonthDue = billDue.withDayOfMonth(Math.min(billDue.getDayOfMonth(), today.lengthOfMonth()));
                if (today.isBefore(thisMonthDue)) { shouldPay = false; }
                else if (bill.getLastPaidAt() == null) { shouldPay = true; }
                else { shouldPay = !YearMonth.from(bill.getLastPaidAt()).equals(YearMonth.now()); }
            } else if (bill.getFrequency() == null || "ONE_TIME".equalsIgnoreCase(bill.getFrequency())) {
                if (billDue != null && today.isBefore(billDue)) { shouldPay = false; }
                else { shouldPay = bill.getLastPaidAt() == null; }
            }

            if (!shouldPay) continue;

            Account sourceAccount = bill.getSourceAccount();
            if ("Fixed Deposit".equals(sourceAccount.getAccountType().getTypeName())) continue;
            if (sourceAccount.getBalance().compareTo(bill.getAmount()) < 0) continue;

            Account targetAccount = bill.getTargetAccount();
            if (targetAccount != null) {
                targetAccount.setBalance(targetAccount.getBalance().add(bill.getAmount()));
                accountRepository.save(targetAccount);
            }

            sourceAccount.setBalance(sourceAccount.getBalance().subtract(bill.getAmount()));
            accountRepository.save(sourceAccount);

            TransactionType transferType = transactionTypeRepository.findByTypeName("transfer")
                    .orElseThrow(() -> new RuntimeException("Transaction type 'transfer' not found"));

            TransactionCategory category = null;
            String catName = BILL_TYPE_TO_CATEGORY.getOrDefault(bill.getBillType(), "Others");
            category = transactionCategoryRepository.findByCategoryName(catName).orElse(null);

            Transaction transaction = new Transaction();
            transaction.setType(transferType);
            transaction.setSourceAccount(sourceAccount);
            transaction.setTargetAccount(targetAccount);
            transaction.setAmount(bill.getAmount());
            transaction.setCurrency("USD");
            transaction.setStatus("completed");
            String autoTargetInfo = targetAccount != null
                ? " → " + targetAccount.getCustomer().getFirstName() + " " + targetAccount.getCustomer().getLastName()
                : "";
            transaction.setDescription("Auto-Pay: " + bill.getBillerName() + autoTargetInfo);
            transaction.setReferenceNumber("AUTO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            transaction.setTransactionDate(OffsetDateTime.now());
            transaction.setCategory(category);
            transactionRepository.save(transaction);

            bill.setLastPaidAt(LocalDateTime.now());
            billRepository.save(bill);
            processed++;
        }

        invalidateAnalyticsCache(email);
        return processed;
    }

    public Map<String, Object> lookupPayee(String currentEmail, String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) return null;
        Account account = accountRepository.findByAccountNumber(accountNumber.trim()).orElse(null);
        if (account == null) return null;
        Customer target = account.getCustomer();
        return Map.of(
            "found", true,
            "name", target.getFirstName() + " " + target.getLastName(),
            "accountId", account.getAccountId(),
            "accountNumber", account.getAccountNumber()
        );
    }

    private void invalidateAnalyticsCache(String email) {
        try {
            analyticsRepository.deleteByEmailAndPeriod(email, YearMonth.now().toString());
        } catch (Exception e) {
            log.warn("Failed to invalidate analytics cache for {}: {}", email, e.getMessage());
        }
    }
}
