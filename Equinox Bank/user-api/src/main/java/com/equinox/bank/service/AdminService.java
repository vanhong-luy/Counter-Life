package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.AdminCustomerResponseDTO;
import com.equinox.bank.dto.AdminRefundResponseDTO;
import com.equinox.bank.dto.CustomerStatusUpdateRequestDTO;
import com.equinox.bank.dto.DashboardResponseDTO;
import com.equinox.bank.dto.KycDocumentAdminResponseDTO;
import com.equinox.bank.dto.KycReviewRequestDTO;
import com.equinox.bank.dto.KycReviewResponseDTO;
import com.equinox.bank.dto.LoanApprovalRequestDTO;
import com.equinox.bank.dto.LoanResponseDTO;
import com.equinox.bank.dto.TransactionResponseDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.AdminUser;
import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.CardTransaction;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.KycDocument;
import com.equinox.bank.entity.Loan;
import com.equinox.bank.entity.Refund;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.AdminUserRepository;
import com.equinox.bank.repository.CardRepository;
import com.equinox.bank.repository.CardTransactionRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.KycDocumentRepository;
import com.equinox.bank.repository.LoanRepository;
import com.equinox.bank.repository.RefundRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final KycDocumentRepository kycDocumentRepository;
    private final AdminUserRepository adminUserRepository;
    private final LoanRepository loanRepository;
    private final RefundRepository refundRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final CardRepository cardRepository;
    private final CardTransactionRepository cardTransactionRepository;
    private final CacheManager cacheManager;

    @Autowired
    public AdminService(CustomerRepository customerRepository,
                        AccountRepository accountRepository,
                        TransactionRepository transactionRepository,
                        KycDocumentRepository kycDocumentRepository,
                        AdminUserRepository adminUserRepository,
                        LoanRepository loanRepository,
                        RefundRepository refundRepository,
                        TransactionTypeRepository transactionTypeRepository,
                        CardRepository cardRepository,
                        CardTransactionRepository cardTransactionRepository,
                        CacheManager cacheManager) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.kycDocumentRepository = kycDocumentRepository;
        this.adminUserRepository = adminUserRepository;
        this.loanRepository = loanRepository;
        this.refundRepository = refundRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.cardRepository = cardRepository;
        this.cardTransactionRepository = cardTransactionRepository;
        this.cacheManager = cacheManager;
    }

    /**
     * An admin action changed a customer's balance/ledger. Their cached account and
     * transaction lists are keyed by their own email, so annotation-based eviction
     * can't reach them from here — drop those entries explicitly.
     */
    private void evictCustomerCaches(Account account) {
        if (account == null || account.getCustomer() == null) return;
        String email = account.getCustomer().getEmail();
        if (email == null) return;
        for (String cacheName : new String[] {"customer_accounts", "customer_transactions"}) {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) cache.evict(email);
        }
    }

    public DashboardResponseDTO getDashboard() {
        long totalCustomers = customerRepository.count();
        long totalAccounts = accountRepository.count();
        BigDecimal totalDeposits = accountRepository.findAll().stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long pendingKycCount = kycDocumentRepository.count();
        long pendingLoansCount = loanRepository.findByStatus("pending").size();
        long totalTransactions = transactionRepository.count();
        return new DashboardResponseDTO(totalCustomers, totalAccounts, totalDeposits,
                pendingKycCount, pendingLoansCount, totalTransactions);
    }

    public List<KycDocumentAdminResponseDTO> getKycQueue() {
        List<KycDocument> documents = kycDocumentRepository.findAll();
        return documents.stream().map(doc -> {
            String reviewStatus = doc.getStatus() != null ? doc.getStatus() : "pending";
            return new KycDocumentAdminResponseDTO(
                    doc.getDocumentId(),
                    doc.getCustomer().getCustomerId(),
                    doc.getCustomer().getFirstName() + " " + doc.getCustomer().getLastName(),
                    doc.getDocumentType(),
                    doc.getDocumentUrl(),
                    doc.getUploadedAt(),
                    reviewStatus);
        }).toList();
    }

    @Transactional
    public KycReviewResponseDTO reviewKyc(Long documentId, String adminEmail, KycReviewRequestDTO dto) {
        AdminUser admin = adminUserRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        KycDocument document = kycDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("KYC document not found"));

        document.setStatus(dto.status());
        document.setRemarks(dto.remarks());
        KycDocument saved = kycDocumentRepository.save(document);

        if ("approved".equalsIgnoreCase(dto.status())) {
            Customer customer = document.getCustomer();
            customer.setKycStatus("approved");
            customerRepository.save(customer);
        }

        return new KycReviewResponseDTO(
                saved.getDocumentId(),
                saved.getDocumentId(),
                admin.getAdminId(),
                saved.getStatus(),
                saved.getRemarks(),
                LocalDateTime.now());
    }

    public List<AdminCustomerResponseDTO> getAllUsers() {
        return customerRepository.findAll().stream()
                .map(this::mapToAdminCustomerResponseDTO)
                .toList();
    }

    public AdminCustomerResponseDTO getUserDetail(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        return mapToAdminCustomerResponseDTO(customer);
    }

    @Transactional
    public AdminCustomerResponseDTO updateCustomerStatus(Long customerId, CustomerStatusUpdateRequestDTO dto) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        if (dto.kycStatus() != null) {
            customer.setKycStatus(dto.kycStatus());
        }
        if (dto.creditScore() != null) {
            customer.setCreditScore(dto.creditScore());
        }
        Customer saved = customerRepository.save(customer);

        return mapToAdminCustomerResponseDTO(saved);
    }

    public List<TransactionResponseDTO> getAllTransactions() {
        List<Transaction> transactions = transactionRepository.findAll();
        transactions.sort(Comparator.comparing(Transaction::getTransactionDate).reversed());
        return transactions.stream().map(this::mapToTransactionResponseDTO).toList();
    }

    public List<LoanResponseDTO> getPendingLoans() {
        return loanRepository.findByStatus("pending").stream()
                .map(this::mapToLoanResponseDTO)
                .toList();
    }

    public Map<String, Object> getAllRefunds(int page, int size) {
        Page<Refund> p = refundRepository.findAllByOrderByProcessedAtDesc(PageRequest.of(page, size));
        List<AdminRefundResponseDTO> items = p.stream().map(this::mapToAdminRefundResponseDTO).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("totalItems", p.getTotalElements());
        result.put("totalPages", p.getTotalPages());
        result.put("currentPage", p.getNumber());
        return result;
    }

    public Map<String, Object> getRefundsByStatus(String status, int page, int size) {
        Page<Refund> p;
        if ("pending".equals(status)) {
            p = refundRepository.findByStatusOrderByProcessedAtDesc("pending", PageRequest.of(page, size));
        } else {
            p = refundRepository.findAllByOrderByProcessedAtDesc(PageRequest.of(page, size));
        }
        List<AdminRefundResponseDTO> items = p.stream().map(this::mapToAdminRefundResponseDTO).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("totalItems", p.getTotalElements());
        result.put("totalPages", p.getTotalPages());
        result.put("currentPage", p.getNumber());
        return result;
    }

    @Transactional
    public AdminRefundResponseDTO reviewRefund(Long refundId, String adminEmail, String status, String remarks) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));
        refund.setStatus(status);
        refund.setRemarks(remarks);
        refund.setReviewedAt(LocalDateTime.now());

        if ("completed".equals(status)) {
            Transaction original = refund.getOriginalTransaction();
            String txnTypeName = original.getType() != null ? original.getType().getTypeName() : "";
            boolean isCardPurchase = txnTypeName.equals("debit_purchase") || txnTypeName.equals("credit_purchase");

            // Find the correct card by looking up the original purchase's CardTransaction
            Card card = null;
            List<CardTransaction> originalCardTxns = cardTransactionRepository.findByTransactionId(original.getTransactionId());
            if (!originalCardTxns.isEmpty()) {
                card = originalCardTxns.get(0).getCard();
            }

            boolean isCreditCardPurchase = card != null && card.getCreditLimit() != null;

            Account target = original.getTargetAccount();
            if (target == null) target = original.getSourceAccount();

            // Only add to account balance for non-credit-card purchases
            // (credit card purchases never deducted from the account balance)
            if (target != null && !isCreditCardPurchase) {
                target.setBalance(target.getBalance().add(refund.getRefundAmount()));
                accountRepository.save(target);
            }

            // Create reversal transaction
            if (target != null) {
                TransactionType refundType = transactionTypeRepository.findByTypeName("refund")
                        .orElseGet(() -> {
                            TransactionType tt = new TransactionType();
                            tt.setTypeName("refund");
                            return transactionTypeRepository.save(tt);
                        });
                Transaction reversal = new Transaction();
                reversal.setType(refundType);
                reversal.setSourceAccount(null);
                reversal.setTargetAccount(target);
                reversal.setAmount(refund.getRefundAmount());
                reversal.setCurrency(target.getCurrency());
                reversal.setStatus("completed");
                reversal.setDescription("Refund for transaction #" + original.getTransactionId());
                reversal.setReferenceNumber("RFN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                reversal.setTransactionDate(java.time.OffsetDateTime.now());
                Transaction savedReversal = transactionRepository.save(reversal);

                // Card-specific: adjust outstanding balance + log CardTransaction
                if (isCardPurchase && card != null) {
                    if (isCreditCardPurchase) {
                        card.setOutstandingBalance(card.getOutstandingBalance().subtract(refund.getRefundAmount()));
                        if (card.getOutstandingBalance().compareTo(BigDecimal.ZERO) < 0) {
                            card.setOutstandingBalance(BigDecimal.ZERO);
                        }
                        cardRepository.save(card);
                    }
                    CardTransaction cardTxn = new CardTransaction();
                    cardTxn.setCard(card);
                    cardTxn.setAmount(refund.getRefundAmount().negate());
                    cardTxn.setMerchant(refund.getReason() != null ? refund.getReason() : "Refund");
                    cardTxn.setDescription("Refund");
                    cardTxn.setTransactionDate(java.time.LocalDateTime.now());
                    cardTxn.setTransactionId(savedReversal.getTransactionId());
                    cardTransactionRepository.save(cardTxn);
                }

                evictCustomerCaches(target);
            }
        }

        Refund saved = refundRepository.save(refund);
        return mapToAdminRefundResponseDTO(saved);
    }

    @Transactional
    public LoanResponseDTO approveRejectLoan(Long loanId, String adminEmail, LoanApprovalRequestDTO dto) {
        AdminUser admin = adminUserRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        loan.setStatus(dto.status());
        loan.setApprovedBy(admin);
        loan.setApprovedAt(LocalDateTime.now());
        if ("approved".equalsIgnoreCase(dto.status()) || "active".equalsIgnoreCase(dto.status())) {
            loan.setMonthlyPaymentAmount(computeMonthlyPayment(
                    loan.getPrincipalAmount(), loan.getInterestRate(), loan.getLoanTermMonths()));
            loan.setNextPaymentDueDate(java.time.LocalDate.now().plusMonths(1));
            loan.setLastInterestDate(java.time.LocalDate.now());
        }
        Loan saved = loanRepository.save(loan);

        return mapToLoanResponseDTO(saved);
    }

    private BigDecimal computeMonthlyPayment(BigDecimal principal, BigDecimal interestRatePercent, Integer termMonths) {
        if (termMonths == null || termMonths <= 0) {
            return principal.setScale(2, java.math.RoundingMode.HALF_UP);
        }
        BigDecimal monthlyRate = interestRatePercent.divide(BigDecimal.valueOf(1200), 10, java.math.RoundingMode.HALF_UP);
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(termMonths), 2, java.math.RoundingMode.HALF_UP);
        }
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal onePlusRPowN = onePlusR.pow(termMonths);
        BigDecimal numerator = principal.multiply(monthlyRate).multiply(onePlusRPowN);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE);
        return numerator.divide(denominator, 2, java.math.RoundingMode.HALF_UP);
    }

    private AdminRefundResponseDTO mapToAdminRefundResponseDTO(Refund r) {
        Transaction txn = r.getOriginalTransaction();
        String customerName = "Unknown";
        String customerEmail = "unknown";
        try {
            Customer customer = null;
            if (txn.getSourceAccount() != null) {
                customer = txn.getSourceAccount().getCustomer();
            } else if (txn.getTargetAccount() != null) {
                customer = txn.getTargetAccount().getCustomer();
            }
            if (customer == null) {
                Account src = txn.getSourceAccount();
                Account tgt = txn.getTargetAccount();
                if (src != null) customer = customerRepository.findById(src.getCustomer().getCustomerId()).orElse(null);
                else if (tgt != null) customer = customerRepository.findById(tgt.getCustomer().getCustomerId()).orElse(null);
            }
            if (customer != null) {
                customerName = customer.getFirstName() + " " + customer.getLastName();
                customerEmail = customer.getEmail();
            }
        } catch (Exception ignored) {}
        return new AdminRefundResponseDTO(
                r.getRefundId(),
                txn.getTransactionId(),
                r.getRefundAmount(),
                r.getReason(),
                r.getComment(),
                r.getStatus(),
                r.getRemarks(),
                customerName,
                customerEmail,
                r.getProcessedAt(),
                r.getReviewedAt());
    }

    private AdminCustomerResponseDTO mapToAdminCustomerResponseDTO(Customer c) {
        return new AdminCustomerResponseDTO(
                c.getCustomerId(),
                c.getFirstName(),
                c.getLastName(),
                c.getEmail(),
                c.getPhoneNumber(),
                c.getKycStatus(),
                c.getCreditScore(),
                c.getCreatedAt(),
                c.getProfilePhotoUrl());
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
                t.getTransactionDate());
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

    private LoanResponseDTO mapToLoanResponseDTO(Loan l) {
        return new LoanResponseDTO(
                l.getLoanId(),
                l.getCustomer() != null ? l.getCustomer().getCustomerId() : null,
                l.getLoanType() != null ? l.getLoanType().getTypeName() : null,
                l.getApprovedBy() != null ? l.getApprovedBy().getAdminId() : null,
                l.getPrincipalAmount(),
                l.getOutstandingBalance(),
                l.getLateFeesOwed() != null ? l.getLateFeesOwed() : java.math.BigDecimal.ZERO,
                l.getInterestRate(),
                l.getLoanTermMonths(),
                l.getStatus(),
                l.getRemarks(),
                l.getPurpose(),
                l.getAppliedAt(),
                l.getApprovedAt(),
                l.getLastInterestDate(),
                null);
    }
}
