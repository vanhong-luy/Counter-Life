package com.equinox.bank.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.CollateralRequestDTO;
import com.equinox.bank.dto.CollateralResponseDTO;
import com.equinox.bank.dto.LoanApplicationRequestDTO;
import com.equinox.bank.dto.LoanRepaymentRequestDTO;
import com.equinox.bank.dto.LoanRepaymentResponseDTO;
import com.equinox.bank.dto.LoanResponseDTO;
import com.equinox.bank.dto.RepaymentHistoryDTO;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Collateral;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.Loan;
import com.equinox.bank.entity.LoanRepayment;
import com.equinox.bank.entity.LoanType;
import com.equinox.bank.entity.Transaction;
import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.entity.TransactionType;
import com.equinox.bank.repository.AccountRepository;
import com.equinox.bank.repository.CollateralRepository;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.LoanRepaymentRepository;
import com.equinox.bank.repository.LoanRepository;
import com.equinox.bank.repository.LoanTypeRepository;
import com.equinox.bank.repository.MonthlyAnalyticsRepository;
import com.equinox.bank.repository.TransactionCategoryRepository;
import com.equinox.bank.repository.TransactionRepository;
import com.equinox.bank.repository.TransactionTypeRepository;

@Service
@Transactional(readOnly = true)
public class LoanService {

    private static final Logger log = LoggerFactory.getLogger(LoanService.class);

    private final LoanRepository loanRepository;
    private final LoanTypeRepository loanTypeRepository;
    private final CustomerRepository customerRepository;
    private final CollateralRepository collateralRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final AccountRepository accountRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final MonthlyAnalyticsRepository analyticsRepository;

    @Autowired
    public LoanService(LoanRepository loanRepository, LoanTypeRepository loanTypeRepository,
                       CustomerRepository customerRepository, CollateralRepository collateralRepository,
                       LoanRepaymentRepository loanRepaymentRepository, AccountRepository accountRepository,
                       TransactionTypeRepository transactionTypeRepository, TransactionRepository transactionRepository,
                       TransactionCategoryRepository transactionCategoryRepository,
                       MonthlyAnalyticsRepository analyticsRepository) {
        this.loanRepository = loanRepository;
        this.loanTypeRepository = loanTypeRepository;
        this.customerRepository = customerRepository;
        this.collateralRepository = collateralRepository;
        this.loanRepaymentRepository = loanRepaymentRepository;
        this.accountRepository = accountRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionRepository = transactionRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.analyticsRepository = analyticsRepository;
    }

    private Customer findCustomerByEmail(String email) {
        return customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    @Transactional
    public LoanResponseDTO applyForLoan(String email, LoanApplicationRequestDTO dto) {
        Customer customer = findCustomerByEmail(email);
        LoanType loanType = loanTypeRepository.findById(dto.loanTypeId())
                .orElseThrow(() -> new RuntimeException("Loan type not found"));

        Loan loan = new Loan();
        loan.setCustomer(customer);
        loan.setLoanType(loanType);
        loan.setPrincipalAmount(dto.principalAmount());
        loan.setOutstandingBalance(dto.principalAmount());
        loan.setInterestRate(loanType.getBaseInterestRate());
        loan.setLoanTermMonths(dto.loanTermMonths());
        loan.setStatus("pending");
        loan.setAppliedAt(LocalDateTime.now());
        loan.setPurpose(dto.purpose());

        Loan saved = loanRepository.save(loan);
        return mapToResponseDTO(saved);
    }

    @Transactional
    public LoanResponseDTO updateLoan(String email, Long loanId, LoanApplicationRequestDTO dto) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to loan");
        }
        if (!"revision".equals(loan.getStatus())) {
            throw new RuntimeException("Only revision-requested loans can be edited. Declined loans cannot be resubmitted.");
        }

        LoanType loanType = loanTypeRepository.findById(dto.loanTypeId())
                .orElseThrow(() -> new RuntimeException("Loan type not found"));

        loan.setLoanType(loanType);
        loan.setPrincipalAmount(dto.principalAmount());
        loan.setOutstandingBalance(dto.principalAmount());
        loan.setInterestRate(loanType.getBaseInterestRate());
        loan.setLoanTermMonths(dto.loanTermMonths());
        loan.setStatus("pending");
        loan.setApprovedBy(null);
        loan.setPurpose(dto.purpose());
        loan.setApprovedAt(null);
        loan.setAppliedAt(LocalDateTime.now());

        Loan saved = loanRepository.save(loan);
        return mapToResponseDTO(saved);
    }

    public List<LoanResponseDTO> getCustomerLoans(String email) {
        Customer customer = findCustomerByEmail(email);
        return loanRepository.findByCustomer(customer).stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    public LoanResponseDTO getLoan(String email, Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to loan");
        }
        return mapToResponseDTO(loan);
    }

    @Transactional
    @CacheEvict(value = "customer_accounts", key = "#email")
    public LoanRepaymentResponseDTO repayLoan(String email, Long loanId, LoanRepaymentRequestDTO dto, Long fromAccountId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to loan");
        }
        if (!"approved".equals(loan.getStatus()) && !"active".equals(loan.getStatus())) {
            throw new RuntimeException("Loan is not in an approved or active state");
        }

        Account account = accountRepository.findById(fromAccountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        if (!account.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Account does not belong to customer");
        }
        if ("Fixed Deposit".equals(account.getAccountType().getTypeName())) {
            throw new RuntimeException("Cannot repay a loan from a Fixed Deposit account");
        }

        BigDecimal amountPaid = dto.amountPaid();
        if (amountPaid == null || amountPaid.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        // Interest accrues at the monthly rate on the outstanding principal for
        // each calendar month that has passed since the last interest charge
        // (min 0). Late fees are tracked separately and never earn interest.
        BigDecimal monthlyRate = loan.getInterestRate() != null
                ? loan.getInterestRate().divide(BigDecimal.valueOf(100), 10, java.math.RoundingMode.HALF_UP)
                        .divide(BigDecimal.valueOf(12), 10, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal lateFeesOwed = loan.getLateFeesOwed() != null ? loan.getLateFeesOwed() : BigDecimal.ZERO;
        BigDecimal interestBase = loan.getOutstandingBalance().subtract(lateFeesOwed);
        if (interestBase.compareTo(BigDecimal.ZERO) < 0) interestBase = BigDecimal.ZERO;

        LocalDate lastInterestDate = loan.getLastInterestDate() != null
                ? loan.getLastInterestDate()
                : (loan.getApprovedAt() != null ? loan.getApprovedAt().toLocalDate() : LocalDate.now());
        long monthsElapsed = Math.max(0, java.time.temporal.ChronoUnit.MONTHS.between(
                YearMonth.from(lastInterestDate), YearMonth.from(LocalDate.now())));
        BigDecimal accruedInterest = interestBase.multiply(monthlyRate)
                .multiply(BigDecimal.valueOf(monthsElapsed))
                .setScale(2, java.math.RoundingMode.HALF_UP);

        // Paying off the full balance is the outstanding balance plus any interest
        // accrued since the last charge. Anything paid beyond that is returned.
        BigDecimal payoffAmount = loan.getOutstandingBalance().add(accruedInterest);
        BigDecimal effectivePaid = amountPaid.min(payoffAmount);
        BigDecimal overpaymentReturned = amountPaid.subtract(effectivePaid);

        if (account.getBalance().compareTo(effectivePaid) < 0) {
            throw new RuntimeException("Insufficient funds");
        }
        account.setBalance(account.getBalance().subtract(effectivePaid));
        accountRepository.save(account);

        // Payments are applied in order: unpaid late fees first, then interest,
        // then the principal.
        BigDecimal interestPaid;
        BigDecimal principalPaid;
        BigDecimal lateFeePaid;
        if (effectivePaid.compareTo(payoffAmount) >= 0) {
            // Full payoff — settle the loan, keeping only what was actually owed.
            lateFeePaid = lateFeesOwed;
            interestPaid = accruedInterest;
            principalPaid = interestBase;
            loan.setOutstandingBalance(BigDecimal.ZERO);
            loan.setLateFeesOwed(BigDecimal.ZERO);
            loan.setStatus("settled");
            loan.setNextPaymentDueDate(null);
        } else {
            lateFeePaid = effectivePaid.min(lateFeesOwed);
            BigDecimal rest = effectivePaid.subtract(lateFeePaid);
            interestPaid = rest.min(accruedInterest);
            principalPaid = rest.subtract(interestPaid);
            loan.setLateFeesOwed(lateFeesOwed.subtract(lateFeePaid));
            loan.setOutstandingBalance(loan.getOutstandingBalance()
                    .subtract(principalPaid).subtract(lateFeePaid));
            if (loan.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0) {
                loan.setOutstandingBalance(BigDecimal.ZERO);
                loan.setLateFeesOwed(BigDecimal.ZERO);
                loan.setStatus("settled");
                loan.setNextPaymentDueDate(null);
            } else if (loan.getNextPaymentDueDate() != null) {
                loan.setNextPaymentDueDate(loan.getNextPaymentDueDate().plusMonths(1));
            }
        }
        loan.setLastInterestDate(LocalDate.now());
        loanRepository.save(loan);

        TransactionType txType = transactionTypeRepository.findByTypeName("loan_repayment")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName("loan_repayment");
                    return transactionTypeRepository.save(tt);
                });

        Transaction transaction = new Transaction();
        transaction.setReferenceNumber(UUID.randomUUID().toString());
        transaction.setType(txType);
        transaction.setSourceAccount(account);
        transaction.setTargetAccount(null);
        transaction.setAmount(effectivePaid);
        transaction.setCurrency(account.getCurrency());
        transaction.setStatus("completed");
        transaction.setDescription("Loan Repayment: " + loan.getLoanType().getTypeName() + " (#" + loan.getLoanId() + ")");
        transaction.setTransactionDate(OffsetDateTime.now());
        transaction.setCategory(transactionCategoryRepository.findByCategoryName("Others").orElse(null));
        Transaction savedTx = transactionRepository.save(transaction);

        LoanRepayment repayment = new LoanRepayment();
        repayment.setLoan(loan);
        repayment.setTransaction(savedTx);
        repayment.setAmountPaid(effectivePaid);
        repayment.setPaymentDate(LocalDateTime.now());
        repayment.setInterestPaid(interestPaid);
        repayment.setPrincipalPaid(principalPaid);
        repayment.setLateFeePaid(lateFeePaid);
        LoanRepayment savedRepayment = loanRepaymentRepository.save(repayment);

        try {
            analyticsRepository.deleteByEmailAndPeriod(email, YearMonth.now().toString());
        } catch (Exception e) {
            log.warn("Failed to invalidate analytics cache for {}: {}", email, e.getMessage());
        }

        return new LoanRepaymentResponseDTO(
                savedRepayment.getRepaymentId(), loan.getLoanId(), savedTx.getTransactionId(),
                savedRepayment.getAmountPaid(), savedRepayment.getPaymentDate(),
                interestPaid, principalPaid, lateFeePaid, overpaymentReturned);
    }

    @Transactional
    public CollateralResponseDTO addCollateral(String email, Long loanId, CollateralRequestDTO dto) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to loan");
        }

        Collateral collateral = new Collateral();
        collateral.setLoan(loan);
        collateral.setAssetType(dto.assetType());
        collateral.setEstimatedValue(dto.estimatedValue());
        collateral.setProofDocumentUrl(dto.proofDocumentUrl());
        collateral.setStatus("active");

        Collateral saved = collateralRepository.save(collateral);
        return new CollateralResponseDTO(
                saved.getCollateralId(), loan.getLoanId(), saved.getAssetType(),
                saved.getEstimatedValue(), saved.getProofDocumentUrl(), saved.getStatus());
    }

    public List<CollateralResponseDTO> getLoanCollateral(String email, Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to loan");
        }

        return collateralRepository.findByLoan(loan).stream()
                .map(c -> new CollateralResponseDTO(
                        c.getCollateralId(), loan.getLoanId(), c.getAssetType(),
                        c.getEstimatedValue(), c.getProofDocumentUrl(), c.getStatus()))
                .toList();
    }

    public List<RepaymentHistoryDTO> getLoanRepayments(String email, Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
        if (!loan.getCustomer().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to loan");
        }

        List<LoanRepayment> repayments = loanRepaymentRepository.findByLoan(loan);
        repayments.sort((a, b) -> a.getPaymentDate().compareTo(b.getPaymentDate()));

        BigDecimal running = loan.getPrincipalAmount();
        List<RepaymentHistoryDTO> history = new java.util.ArrayList<>();
        for (LoanRepayment r : repayments) {
            running = running.subtract(r.getPrincipalPaid() != null ? r.getPrincipalPaid() : r.getAmountPaid());
            if (running.compareTo(BigDecimal.ZERO) < 0) running = BigDecimal.ZERO;
            history.add(new RepaymentHistoryDTO(
                    r.getRepaymentId(), r.getAmountPaid(), r.getPaymentDate(), running,
                    r.getInterestPaid() != null ? r.getInterestPaid() : BigDecimal.ZERO,
                    r.getPrincipalPaid() != null ? r.getPrincipalPaid() : r.getAmountPaid(),
                    r.getLateFeePaid() != null ? r.getLateFeePaid() : BigDecimal.ZERO));
        }
        return history;
    }

    @Transactional
    public int assessLateFees() {
        List<Loan> overdueLoans = loanRepository.findOverdueLoans(LocalDate.now());
        if (overdueLoans.isEmpty()) return 0;

        TransactionType lateFeeType = transactionTypeRepository.findByTypeName("late_fee")
                .orElseGet(() -> {
                    TransactionType tt = new TransactionType();
                    tt.setTypeName("late_fee");
                    return transactionTypeRepository.save(tt);
                });

        int charged = 0;
        for (Loan loan : overdueLoans) {
            LoanType loanType = loan.getLoanType();
            BigDecimal lateFee = loanType != null && loanType.getLateFee() != null
                    ? loanType.getLateFee()
                    : new BigDecimal("25.00");

            loan.setOutstandingBalance(loan.getOutstandingBalance().add(lateFee));
            loan.setLateFeesOwed(loan.getLateFeesOwed() != null
                    ? loan.getLateFeesOwed().add(lateFee) : lateFee);
            loan.setLastLateFeeCharged(LocalDate.now());
            loanRepository.save(loan);

            Transaction tx = new Transaction();
            tx.setReferenceNumber("LATEFEE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            tx.setType(lateFeeType);
            tx.setAmount(lateFee);
            tx.setCurrency("USD");
            tx.setStatus("completed");
            tx.setDescription("Late Fee — " + loan.getLoanType().getTypeName() + " (#" + loan.getLoanId() + ")");
            tx.setTransactionDate(OffsetDateTime.now());
            transactionRepository.save(tx);

            charged++;
        }

        log.info("Assessed late fees on {} overdue loan(s)", charged);
        return charged;
    }

    private LoanResponseDTO mapToResponseDTO(Loan loan) {
        Long approvedById = loan.getApprovedBy() != null ? loan.getApprovedBy().getAdminId() : null;

        LoanResponseDTO.NextPaymentDTO nextPayment = null;
        boolean payable = "approved".equals(loan.getStatus()) || "active".equals(loan.getStatus());
        if (payable && loan.getMonthlyPaymentAmount() != null && loan.getNextPaymentDueDate() != null) {
            BigDecimal amount = loan.getMonthlyPaymentAmount().min(loan.getOutstandingBalance());
            nextPayment = new LoanResponseDTO.NextPaymentDTO(
                    amount, loan.getNextPaymentDueDate(), loan.getInterestRate() + "%");
        }

        return new LoanResponseDTO(
                loan.getLoanId(), loan.getCustomer().getCustomerId(),
                loan.getLoanType().getTypeName(), approvedById,
                loan.getPrincipalAmount(), loan.getOutstandingBalance(),
                loan.getLateFeesOwed() != null ? loan.getLateFeesOwed() : BigDecimal.ZERO,
                loan.getInterestRate(), loan.getLoanTermMonths(),
                loan.getStatus(), loan.getRemarks(), loan.getPurpose(),
                loan.getAppliedAt(), loan.getApprovedAt(),
                loan.getLastInterestDate(),
                nextPayment);
    }
}
