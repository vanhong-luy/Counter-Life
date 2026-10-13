package com.equinox.admin.service;

import com.equinox.admin.dto.LoanBatchReviewRequest;
import com.equinox.admin.dto.LoanResponse;
import com.equinox.admin.dto.LoanReviewRequest;
import com.equinox.admin.entity.AdminUser;
import com.equinox.admin.entity.Loan;
import com.equinox.admin.entity.Account;
import com.equinox.admin.entity.AccountType;
import com.equinox.admin.entity.Collateral;
import com.equinox.admin.entity.TransactionType;
import com.equinox.admin.exception.BusinessException;
import com.equinox.admin.exception.ResourceNotFoundException;
import com.equinox.admin.repository.AdminUserRepository;
import com.equinox.admin.repository.LoanRepository;
import com.equinox.admin.repository.CollateralRepository;
import com.equinox.admin.repository.AccountRepository;
import com.equinox.admin.repository.AccountTypeRepository;
import com.equinox.admin.repository.TransactionRepository;
import com.equinox.admin.repository.TransactionTypeRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LoanService {

    private static final String LOAN_DISBURSEMENT_TYPE = "Loan Disbursement";
    private static final String USER_API_ACCOUNTS_CACHE = "customer_accounts::";

    private final LoanRepository loanRepository;
    private final AdminUserRepository adminUserRepository;
    private final CollateralRepository collateralRepository;
    private final AccountRepository accountRepository;
    private final AccountTypeRepository accountTypeRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final StringRedisTemplate redisTemplate;

    public LoanService(LoanRepository loanRepository,
                       AdminUserRepository adminUserRepository,
                       CollateralRepository collateralRepository,
                       AccountRepository accountRepository,
                       AccountTypeRepository accountTypeRepository,
                       TransactionRepository transactionRepository,
                       TransactionTypeRepository transactionTypeRepository,
                       StringRedisTemplate redisTemplate) {
        this.loanRepository = loanRepository;
        this.adminUserRepository = adminUserRepository;
        this.collateralRepository = collateralRepository;
        this.accountRepository = accountRepository;
        this.accountTypeRepository = accountTypeRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.redisTemplate = redisTemplate;
    }

    public List<LoanResponse> getPendingLoans() {
        List<Loan> loans = loanRepository.findByStatusWithDetails("pending", PageRequest.of(0, 10));
        Map<Long, List<Collateral>> collatsByLoan = collateralRepository.findByLoanIn(loans).stream()
                .collect(Collectors.groupingBy(c -> c.getLoan().getLoanId()));
        return loans.stream()
                .map(loan -> toResponseLight(loan, collatsByLoan.getOrDefault(loan.getLoanId(), List.of())))
                .collect(Collectors.toList());
    }

    public List<LoanResponse> getAllLoans(String status, String loanType,
                                           String sortBy, String sortDir) {
        if (status != null && "ALL".equalsIgnoreCase(status)) status = null;
        if (status != null) status = status.toLowerCase();
        if (loanType != null && "ALL".equalsIgnoreCase(loanType)) loanType = null;
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        List<Loan> loans = loanRepository.findAllFilteredWithDetails(status, loanType, sort);
        Map<Long, List<Collateral>> collatsByLoan = collateralRepository.findByLoanIn(loans).stream()
                .collect(Collectors.groupingBy(c -> c.getLoan().getLoanId()));
        return loans.stream()
                .map(loan -> toResponse(loan, collatsByLoan.getOrDefault(loan.getLoanId(), List.of())))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getFilteredLoans(String status, String loanType, String search, int limit, int offset, String sortBy, String sortDir) {
        if (status != null && "ALL".equalsIgnoreCase(status)) status = null;
        if (status != null) status = status.toLowerCase();
        if (loanType != null && "ALL".equalsIgnoreCase(loanType)) loanType = null;
        if (search != null && search.isBlank()) search = null;
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        PageRequest page = PageRequest.of(offset / limit, limit, sort);
        List<Loan> loans = loanRepository.findFilteredWithDetails(status, loanType, search, page);
        long total = loanRepository.countFiltered(status, loanType, search);
        Map<Long, List<Collateral>> collatsByLoan = collateralRepository.findByLoanIn(loans).stream()
                .collect(Collectors.groupingBy(c -> c.getLoan().getLoanId()));
        List<LoanResponse> items = loans.stream()
                .map(loan -> toResponse(loan, collatsByLoan.getOrDefault(loan.getLoanId(), List.of())))
                .toList();
        List<String> availableTypes = loanRepository.findAllLoanTypes();
        List<String> availableStatuses = loanRepository.findAllStatuses();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("loans", items);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        result.put("availableTypes", availableTypes);
        result.put("availableStatuses", availableStatuses);
        return result;
    }

    public LoanResponse getLoanById(Long loanId) {
        Loan loan = loanRepository.findByIdWithDetails(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
        List<Collateral> colls = collateralRepository.findByLoan(loan);
        return toResponse(loan, colls != null ? colls : List.of());
    }

    @Transactional
    public List<Long> batchReviewLoans(List<LoanBatchReviewRequest> items, Long adminId) {
        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        List<Long> reviewed = new ArrayList<>();
        for (LoanBatchReviewRequest item : items) {
            Loan loan = loanRepository.findById(item.getLoanId())
                    .orElseThrow(() -> new ResourceNotFoundException("Loan " + item.getLoanId() + " not found"));
            if (!"pending".equals(loan.getStatus())) continue;
            boolean approved = "approved".equalsIgnoreCase(item.getStatus()) || "active".equalsIgnoreCase(item.getStatus());
            loan.setStatus(item.getStatus().toLowerCase());
            loan.setApprovedBy(admin);
            loan.setRemarks(item.getRemarks());
            if (approved) {
                loan.setApprovedAt(OffsetDateTime.now());
                loan.setMonthlyPaymentAmount(computeMonthlyPayment(loan.getPrincipalAmount(), loan.getInterestRate(), loan.getLoanTermMonths()));
                loan.setNextPaymentDueDate(java.time.LocalDate.now().plusMonths(1));
                loan.setLastInterestDate(java.time.LocalDate.now());
            }
            loanRepository.save(loan);
            if (approved) createDisbursementAccount(loan);
            reviewed.add(loan.getLoanId());
        }
        return reviewed;
    }

    private LoanResponse toResponse(Loan loan, List<Collateral> colls) {
        int creditScore = loan.getCustomer().getCreditScore() != null ? loan.getCustomer().getCreditScore() : 650;
        BigDecimal dti = BigDecimal.ZERO;
        List<Account> accounts = accountRepository.findByCustomer_CustomerId(loan.getCustomer().getCustomerId());
        if (accounts != null && !accounts.isEmpty()) {
            List<Long> accountIds = accounts.stream().map(Account::getAccountId).toList();
            OffsetDateTime threeMonthsAgo = OffsetDateTime.now().minusMonths(3);
            BigDecimal totalDeposits = transactionRepository.sumDepositsSince(accountIds, threeMonthsAgo);
            BigDecimal totalRepayments = transactionRepository.sumDebtPaymentsSince(accountIds, threeMonthsAgo);
            if (totalDeposits != null && totalDeposits.compareTo(BigDecimal.ZERO) > 0) {
                dti = totalRepayments.multiply(BigDecimal.valueOf(100)).divide(totalDeposits, 2, RoundingMode.HALF_UP);
            }
        }
        BigDecimal totalCollateral = BigDecimal.ZERO;
        if (colls != null) {
            for (Collateral c : colls) {
                if (c.getEstimatedValue() != null) totalCollateral = totalCollateral.add(c.getEstimatedValue());
            }
        }
        BigDecimal ltv = BigDecimal.ZERO;
        if (totalCollateral.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal debtAmount = (loan.getOutstandingBalance() != null && loan.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0) ? loan.getOutstandingBalance() : loan.getPrincipalAmount();
            ltv = debtAmount.multiply(BigDecimal.valueOf(100)).divide(totalCollateral, 2, RoundingMode.HALF_UP);
        }
        return new LoanResponse(loan.getLoanId(), loan.getCustomer().getFirstName() + " " + loan.getCustomer().getLastName(),
                loan.getPrincipalAmount(), loan.getLoanType().getTypeName(), loan.getInterestRate(), loan.getLoanTermMonths(),
                loan.getStatus(), loan.getRemarks(), loan.getPurpose(), loan.getAppliedAt(), creditScore, dti, ltv, totalCollateral);
    }

    private LoanResponse toResponseLight(Loan loan, List<Collateral> colls) {
        int creditScore = loan.getCustomer().getCreditScore() != null ? loan.getCustomer().getCreditScore() : 650;
        BigDecimal totalCollateral = BigDecimal.ZERO;
        if (colls != null) {
            for (Collateral c : colls) {
                if (c.getEstimatedValue() != null) totalCollateral = totalCollateral.add(c.getEstimatedValue());
            }
        }
        return new LoanResponse(loan.getLoanId(), loan.getCustomer().getFirstName() + " " + loan.getCustomer().getLastName(),
                loan.getPrincipalAmount(), loan.getLoanType().getTypeName(), loan.getInterestRate(), loan.getLoanTermMonths(),
                loan.getStatus(), loan.getRemarks(), loan.getPurpose(), loan.getAppliedAt(), creditScore, BigDecimal.ZERO, BigDecimal.ZERO, totalCollateral);
    }

    @Transactional
    public void reviewLoan(Long loanId, LoanReviewRequest request, Long adminId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        if (!"pending".equals(loan.getStatus())) {
            throw new BusinessException("Loan has already been reviewed");
        }

        boolean approved = "approved".equalsIgnoreCase(request.getStatus()) || "active".equalsIgnoreCase(request.getStatus());

        loan.setStatus(request.getStatus().toLowerCase());
        loan.setApprovedBy(admin);
        loan.setRemarks(request.getRemarks());
        if (approved) {
            loan.setApprovedAt(OffsetDateTime.now());
            loan.setMonthlyPaymentAmount(computeMonthlyPayment(
                loan.getPrincipalAmount(), loan.getInterestRate(), loan.getLoanTermMonths()));
            loan.setNextPaymentDueDate(java.time.LocalDate.now().plusMonths(1));
            loan.setLastInterestDate(java.time.LocalDate.now());
        }
        loanRepository.save(loan);

        if (approved) {
            createDisbursementAccount(loan);
        }
    }

    private BigDecimal computeMonthlyPayment(BigDecimal principal, BigDecimal interestRatePercent, Integer termMonths) {
        if (termMonths == null || termMonths <= 0) {
            return principal.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal monthlyRate = interestRatePercent.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(termMonths), 2, RoundingMode.HALF_UP);
        }
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal onePlusRPowN = onePlusR.pow(termMonths);
        BigDecimal numerator = principal.multiply(monthlyRate).multiply(onePlusRPowN);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE);
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private void createDisbursementAccount(Loan loan) {
        AccountType disbursementType = accountTypeRepository.findByTypeName(LOAN_DISBURSEMENT_TYPE)
                .orElseThrow(() -> new IllegalStateException(LOAN_DISBURSEMENT_TYPE + " account type is not configured"));

        Account account = new Account();
        account.setCustomer(loan.getCustomer());
        account.setAccountTypeId(disbursementType.getAccountTypeId());
        account.setAccountNumber("ACC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        account.setName(loan.getLoanType().getTypeName() + " Loan Disbursement");
        account.setBalance(loan.getPrincipalAmount());
        account.setCurrency("USD");
        account.setStatus("active");
        Account savedAccount = accountRepository.save(account);

        TransactionType depositType = transactionTypeRepository.findByTypeName("deposit")
                .orElseThrow(() -> new IllegalStateException("Transaction type 'deposit' not found"));

        com.equinox.admin.entity.Transaction transaction = new com.equinox.admin.entity.Transaction();
        transaction.setTypeId(depositType.getTypeId());
        transaction.setTargetAccountId(savedAccount.getAccountId());
        transaction.setAmount(loan.getPrincipalAmount());
        transaction.setCurrency("USD");
        transaction.setStatus("completed");
        transaction.setDescription("Loan disbursement for approved loan #" + loan.getLoanId());
        transaction.setReferenceNumber("LNDIS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transaction.setTransactionDate(OffsetDateTime.now());
        transactionRepository.save(transaction);

        String email = loan.getCustomer().getEmail();
        if (email != null) {
            redisTemplate.delete(USER_API_ACCOUNTS_CACHE + email);
        }
    }

    public List<com.equinox.admin.dto.CollateralResponse> getLoanCollaterals(Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
        return collateralRepository.findByLoan(loan).stream()
                .map(c -> new com.equinox.admin.dto.CollateralResponse(
                        c.getCollateralId(),
                        c.getAssetType(),
                        c.getEstimatedValue(),
                        c.getProofDocumentUrl(),
                        c.getStatus()
                ))
                .collect(Collectors.toList());
    }
}
