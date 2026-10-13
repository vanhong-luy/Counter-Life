package com.equinox.admin.service;

import com.equinox.admin.dto.AccountTypeSettingsRequest;
import com.equinox.admin.dto.LoanTypeSettingsRequest;
import com.equinox.admin.entity.AccountType;
import com.equinox.admin.entity.AdminRole;
import com.equinox.admin.entity.AdminUser;
import com.equinox.admin.entity.CardType;
import com.equinox.admin.entity.CreditScoreTier;
import com.equinox.admin.entity.LoanType;
import com.equinox.admin.entity.TransactionType;
import com.equinox.admin.repository.AccountTypeRepository;
import com.equinox.admin.repository.AdminRoleRepository;
import com.equinox.admin.repository.AdminUserRepository;
import com.equinox.admin.repository.CardTypeRepository;
import com.equinox.admin.repository.CreditScoreTierRepository;
import com.equinox.admin.repository.LoanTypeRepository;
import com.equinox.admin.repository.TransactionTypeRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class SettingsService {

    private final AccountTypeRepository accountTypeRepository;
    private final LoanTypeRepository loanTypeRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final CardTypeRepository cardTypeRepository;
    private final CreditScoreTierRepository creditScoreTierRepository;
    private final AdminRoleRepository adminRoleRepository;
    private final AdminUserRepository adminUserRepository;
    private final com.equinox.admin.repository.FixedDepositRateRepository fixedDepositRateRepository;

    public SettingsService(AccountTypeRepository accountTypeRepository,
                           LoanTypeRepository loanTypeRepository,
                           TransactionTypeRepository transactionTypeRepository,
                           CardTypeRepository cardTypeRepository,
                           CreditScoreTierRepository creditScoreTierRepository,
                           AdminRoleRepository adminRoleRepository,
                           AdminUserRepository adminUserRepository,
                           com.equinox.admin.repository.FixedDepositRateRepository fixedDepositRateRepository) {
        this.accountTypeRepository = accountTypeRepository;
        this.loanTypeRepository = loanTypeRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.cardTypeRepository = cardTypeRepository;
        this.creditScoreTierRepository = creditScoreTierRepository;
        this.adminRoleRepository = adminRoleRepository;
        this.adminUserRepository = adminUserRepository;
        this.fixedDepositRateRepository = fixedDepositRateRepository;
    }

    @Cacheable("cache:fd_rates")
    public List<com.equinox.admin.entity.FixedDepositRate> getAllFdRates() {
        List<com.equinox.admin.entity.FixedDepositRate> rates = fixedDepositRateRepository.findAll();
        if (rates.isEmpty()) {
            rates = List.of(
                fixedDepositRateRepository.save(new com.equinox.admin.entity.FixedDepositRate(3, new java.math.BigDecimal("0.0350"))),
                fixedDepositRateRepository.save(new com.equinox.admin.entity.FixedDepositRate(6, new java.math.BigDecimal("0.0400"))),
                fixedDepositRateRepository.save(new com.equinox.admin.entity.FixedDepositRate(12, new java.math.BigDecimal("0.0450"))),
                fixedDepositRateRepository.save(new com.equinox.admin.entity.FixedDepositRate(24, new java.math.BigDecimal("0.0525"))),
                fixedDepositRateRepository.save(new com.equinox.admin.entity.FixedDepositRate(36, new java.math.BigDecimal("0.0600")))
            );
        }
        return rates;
    }

    @Transactional
    @CacheEvict(value = "cache:fd_rates", allEntries = true)
    public com.equinox.admin.entity.FixedDepositRate updateFdRate(Integer rateId, java.math.BigDecimal newRate) {
        com.equinox.admin.entity.FixedDepositRate rate = fixedDepositRateRepository.findById(rateId)
                .orElseThrow(() -> new RuntimeException("Fixed deposit rate tier not found"));
        rate.setInterestRate(newRate);
        return fixedDepositRateRepository.save(rate);
    }

    @Cacheable("cache:account_types")
    public List<AccountType> getAllAccountTypes() {
        return accountTypeRepository.findAll();
    }

    @Cacheable("cache:loan_types")
    public List<LoanType> getAllLoanTypes() {
        return loanTypeRepository.findAll();
    }

    @Cacheable("cache:tx_types")
    public List<TransactionType> getAllTransactionTypes() {
        return transactionTypeRepository.findAll();
    }

    @Cacheable("cache:card_types")
    public List<CardType> getAllCardTypes() {
        return cardTypeRepository.findAll();
    }

    @Cacheable("cache:credit_tiers")
    public List<CreditScoreTier> getAllCreditTiers() {
        return creditScoreTierRepository.findAll();
    }

    @Cacheable("cache:admin_roles")
    public List<AdminRole> getAllRoles() {
        return adminRoleRepository.findAll();
    }

    @Cacheable("cache:admin_staff")
    public List<AdminUser> getAllAdmins() {
        return adminUserRepository.findAll();
    }

    public org.springframework.data.domain.Page<AdminUser> getAdminPage(int limit, int offset) {
        return adminUserRepository.findAll(
                org.springframework.data.domain.PageRequest.of(
                        Math.max(0, offset / Math.max(1, limit)),
                        Math.max(1, limit),
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
    }

    public Map<String, Long> getRoleCounts() {
        return getAllAdmins().stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        u -> u.getRole().getRoleName().replace("ROLE_", ""),
                        java.util.stream.Collectors.counting()));
    }

    @Transactional
    @CacheEvict(value = "cache:account_types", allEntries = true)
    public AccountType updateAccountTypeSettings(AccountTypeSettingsRequest request) {
        AccountType accountType = accountTypeRepository.findByTypeName(request.getTypeName())
                .orElseThrow(() -> new RuntimeException("Account type not found: " + request.getTypeName()));

        if (request.getInterestRate() != null) {
            accountType.setInterestRate(request.getInterestRate());
        }
        if (request.getMaintenanceFee() != null) {
            accountType.setMaintenanceFee(request.getMaintenanceFee());
        }

        return accountTypeRepository.save(accountType);
    }

    @Transactional
    @CacheEvict(value = "cache:loan_types", allEntries = true)
    public LoanType updateLoanTypeSettings(LoanTypeSettingsRequest request) {
        LoanType loanType = loanTypeRepository.findByTypeName(request.getTypeName())
                .orElseThrow(() -> new RuntimeException("Loan type not found: " + request.getTypeName()));

        if (request.getBaseInterestRate() != null) {
            loanType.setBaseInterestRate(request.getBaseInterestRate());
        }
        if (request.getLateFee() != null) {
            loanType.setLateFee(request.getLateFee());
        }

        return loanTypeRepository.save(loanType);
    }
}
