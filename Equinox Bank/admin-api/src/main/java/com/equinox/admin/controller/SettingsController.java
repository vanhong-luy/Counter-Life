package com.equinox.admin.controller;

import com.equinox.admin.dto.AccountTypeSettingsRequest;
import com.equinox.admin.dto.AdminStaffResponse;
import com.equinox.admin.dto.LoanTypeSettingsRequest;
import com.equinox.admin.dto.RoleResponse;
import com.equinox.admin.entity.AccountType;
import com.equinox.admin.entity.AdminRole;
import com.equinox.admin.entity.AdminUser;
import com.equinox.admin.entity.CardType;
import com.equinox.admin.entity.CreditScoreTier;
import com.equinox.admin.entity.LoanType;
import com.equinox.admin.exception.ResourceNotFoundException;
import com.equinox.admin.repository.AdminRoleRepository;
import com.equinox.admin.repository.AdminUserRepository;
import com.equinox.admin.repository.CardTypeRepository;
import com.equinox.admin.repository.CreditScoreTierRepository;
import com.equinox.admin.service.AuditLogService;
import com.equinox.admin.service.PermissionService;
import com.equinox.admin.service.SettingsService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.equinox.admin.entity.Customer;
import com.equinox.admin.repository.CustomerRepository;
import com.equinox.admin.repository.LoanTypeRepository;

import com.equinox.admin.entity.Account;
import com.equinox.admin.entity.Card;
import com.equinox.admin.entity.CardStatement;
import com.equinox.admin.entity.CustomerBill;
import com.equinox.admin.entity.Loan;
import com.equinox.admin.entity.Transaction;
import com.equinox.admin.entity.TransactionType;
import com.equinox.admin.entity.TransactionCategory;
import com.equinox.admin.repository.AccountRepository;
import com.equinox.admin.repository.CardRepository;
import com.equinox.admin.repository.CardStatementRepository;
import com.equinox.admin.repository.LoanRepository;
import com.equinox.admin.repository.TransactionRepository;
import com.equinox.admin.repository.AccountTypeRepository;
import com.equinox.admin.repository.TransactionTypeRepository;
import com.equinox.admin.repository.TransactionCategoryRepository;
import com.equinox.admin.repository.CustomerBillRepository;
import com.equinox.admin.entity.SavingsGoal;
import com.equinox.admin.repository.SavingsGoalRepository;
import com.equinox.admin.entity.CardTransaction;
import com.equinox.admin.entity.CardLimit;
import com.equinox.admin.entity.LoanRepayment;
import com.equinox.admin.repository.CardTransactionRepository;
import com.equinox.admin.repository.CardLimitRepository;
import com.equinox.admin.repository.LoanRepaymentRepository;
import org.springframework.jdbc.core.JdbcTemplate;

@RestController
@RequestMapping("/auth/admin/settings")
public class SettingsController {

    private static final Logger log = LoggerFactory.getLogger(SettingsController.class);

    private final SettingsService service;
    private final AuditLogService auditLogService;
    private final PermissionService permissionService;
    private final AdminUserRepository adminUserRepository;
    private final AdminRoleRepository adminRoleRepository;
    private final CustomerRepository customerRepository;
    private final LoanTypeRepository loanTypeRepository;
    private final AccountRepository accountRepository;
    private final AccountTypeRepository accountTypeRepository;
    private final LoanRepository loanRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final CardTypeRepository cardTypeRepository;
    private final CreditScoreTierRepository creditScoreTierRepository;
    private final CardRepository cardRepository;
    private final CardStatementRepository cardStatementRepository;
    private final CustomerBillRepository customerBillRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final CardTransactionRepository cardTransactionRepository;
    private final CardLimitRepository cardLimitRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final JdbcTemplate jdbcTemplate;
    public SettingsController(SettingsService service, AuditLogService auditLogService,
                              PermissionService permissionService,
                              AdminUserRepository adminUserRepository,
                              AdminRoleRepository adminRoleRepository,
                              CustomerRepository customerRepository,
                              LoanTypeRepository loanTypeRepository,
                              AccountRepository accountRepository,
                              AccountTypeRepository accountTypeRepository,
                              LoanRepository loanRepository,
                              TransactionRepository transactionRepository,
                              TransactionTypeRepository transactionTypeRepository,
                              CardTypeRepository cardTypeRepository,
                              CreditScoreTierRepository creditScoreTierRepository,
                              CardRepository cardRepository,
                              CardStatementRepository cardStatementRepository,
                                CustomerBillRepository customerBillRepository,
                                SavingsGoalRepository savingsGoalRepository,
                                CardTransactionRepository cardTransactionRepository,
                                CardLimitRepository cardLimitRepository,
                                 LoanRepaymentRepository loanRepaymentRepository,
                                 TransactionCategoryRepository transactionCategoryRepository,
                                 JdbcTemplate jdbcTemplate) {
        this.service = service;
        this.auditLogService = auditLogService;
        this.permissionService = permissionService;
        this.adminUserRepository = adminUserRepository;
        this.adminRoleRepository = adminRoleRepository;
        this.customerRepository = customerRepository;
        this.loanTypeRepository = loanTypeRepository;
        this.accountRepository = accountRepository;
        this.accountTypeRepository = accountTypeRepository;
        this.loanRepository = loanRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.cardTypeRepository = cardTypeRepository;
        this.creditScoreTierRepository = creditScoreTierRepository;
        this.cardRepository = cardRepository;
        this.cardStatementRepository = cardStatementRepository;
        this.customerBillRepository = customerBillRepository;
        this.savingsGoalRepository = savingsGoalRepository;
        this.cardTransactionRepository = cardTransactionRepository;
        this.cardLimitRepository = cardLimitRepository;
        this.loanRepaymentRepository = loanRepaymentRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<AccountType>> getAccountSettings(Authentication auth) {
        permissionService.require(auth, "settings");
        return ResponseEntity.ok(service.getAllAccountTypes());
    }

    @GetMapping("/fd-rates")
    public ResponseEntity<List<com.equinox.admin.entity.FixedDepositRate>> getFdRates(Authentication auth) {
        permissionService.require(auth, "settings");
        return ResponseEntity.ok(service.getAllFdRates());
    }

    @PutMapping("/fd-rates/{id}")
    public ResponseEntity<com.equinox.admin.entity.FixedDepositRate> updateFdRate(
            Authentication auth,
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");
        java.math.BigDecimal newRate = new java.math.BigDecimal(body.get("interestRate").toString());
        com.equinox.admin.entity.FixedDepositRate updated = service.updateFdRate(id, newRate);
        
        Long adminId = (Long) auth.getCredentials();
        String adminEmail = auth.getName();
        auditLogService.log(adminId, adminEmail, "UPDATE_SETTINGS", "fixed_deposit_rates", (long) id,
                "Updated FD rate tier " + updated.getTermMonths() + " months to " + newRate,
                Map.of("termMonths", updated.getTermMonths(), "interestRate", newRate.toString()));
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/loans")
    public ResponseEntity<List<LoanType>> getLoanSettings(Authentication auth) {
        permissionService.require(auth, "settings");
        return ResponseEntity.ok(service.getAllLoanTypes());
    }

    @PutMapping("/accounts")
    public ResponseEntity<AccountType> updateAccountSettings(
            @RequestBody AccountTypeSettingsRequest request,
            Authentication authentication) {
        permissionService.require(authentication, "settings");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        AccountType updated = service.updateAccountTypeSettings(request);
        auditLogService.log(adminId, adminEmail, "UPDATE_SETTINGS", "account_types",
                (long) updated.getAccountTypeId(),
                "Updated account type " + request.getTypeName() + " settings",
                Map.of("interestRate", request.getInterestRate() != null ? request.getInterestRate() : "",
                       "maintenanceFee", request.getMaintenanceFee() != null ? request.getMaintenanceFee() : ""));
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/loans")
    public ResponseEntity<LoanType> updateLoanSettings(
            @RequestBody LoanTypeSettingsRequest request,
            Authentication authentication) {
        permissionService.require(authentication, "settings");
        Long adminId = (Long) authentication.getCredentials();
        String adminEmail = authentication.getName();
        LoanType updated = service.updateLoanTypeSettings(request);
        auditLogService.log(adminId, adminEmail, "UPDATE_SETTINGS", "loan_types",
                (long) updated.getLoanTypeId(),
                "Updated loan type " + request.getTypeName() + " settings",
                Map.of("baseInterestRate", request.getBaseInterestRate() != null ? request.getBaseInterestRate() : ""));
        return ResponseEntity.ok(updated);
    }

    // ── Role & Staff Management ──────────────────────────────────────────

    @GetMapping("/roles")
    public ResponseEntity<List<RoleResponse>> getRoles(Authentication auth) {
        permissionService.require(auth, "settings");
        List<RoleResponse> roles = service.getAllRoles().stream()
                .map(r -> new RoleResponse(r.getRoleId(), r.getRoleName(), r.getPermissionList()))
                .toList();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/admins")
    public ResponseEntity<Map<String, Object>> getAdmins(Authentication auth,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        permissionService.require(auth, "settings");
        Page<AdminUser> page = service.getAdminPage(limit, offset);
        List<AdminStaffResponse> admins = page.getContent().stream()
                .map(u -> new AdminStaffResponse(
                        u.getAdminId(), u.getEmail(), u.getFirstName(), u.getLastName(),
                        u.getRole().getRoleName(), u.getRole().getPermissionList(),
                        u.getIsActive(), u.getEmployeeId()))
                .toList();
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("admins", admins);
        response.put("total", page.getTotalElements());
        response.put("limit", limit);
        response.put("offset", offset);
        response.put("roleCounts", service.getRoleCounts());
        return ResponseEntity.ok(response);
    }

    @CacheEvict(value = "cache:admin_staff", allEntries = true)
    @PutMapping("/admins/{adminId}/role")
    public ResponseEntity<AdminStaffResponse> updateAdminRole(
            Authentication auth,
            @PathVariable Long adminId,
            @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");

        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        Integer roleId = Integer.valueOf(body.get("roleId").toString());
        AdminRole role = adminRoleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        admin.setRole(role);
        adminUserRepository.save(admin);

        return ResponseEntity.ok(new AdminStaffResponse(
                admin.getAdminId(), admin.getEmail(), admin.getFirstName(), admin.getLastName(),
                admin.getRole().getRoleName(), admin.getRole().getPermissionList(),
                admin.getIsActive(), admin.getEmployeeId()));
    }

    @CacheEvict(value = "cache:admin_staff", allEntries = true)
    @DeleteMapping("/admins/{adminId}")
    public ResponseEntity<Void> revokeAdminRole(
            Authentication auth,
            @PathVariable Long adminId) {
        permissionService.require(auth, "settings");

        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        adminUserRepository.delete(admin);

        Long currentAdminId = (Long) auth.getCredentials();
        String currentAdminEmail = auth.getName();
        auditLogService.log(currentAdminId, currentAdminEmail, "REVOKE_STAFF", "admin_users", adminId,
                "Revoked staff access & unassigned admin role from " + admin.getFirstName() + " " + admin.getLastName() + " (" + admin.getEmail() + ")",
                Map.of("email", admin.getEmail(), "employeeId", admin.getEmployeeId() != null ? admin.getEmployeeId() : ""));

        return ResponseEntity.ok().build();
    }

    @CacheEvict(value = "cache:admin_staff", allEntries = true)
    @PostMapping("/admins")
    public ResponseEntity<AdminStaffResponse> createAdmin(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");

        Integer roleId = Integer.valueOf(body.get("roleId").toString());
        AdminRole role = adminRoleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        String email = body.get("email") != null ? body.get("email").toString() : null;
        Long customerId = body.get("customerId") != null ? Long.valueOf(body.get("customerId").toString()) : null;
        String employeeId = body.get("employeeId") != null ? body.get("employeeId").toString() : null;

        AdminUser adminToSave;
        if (customerId != null) {
            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
            email = customer.getEmail();
            var existingOpt = adminUserRepository.findByEmail(email);
            if (existingOpt.isPresent()) {
                adminToSave = existingOpt.get();
                adminToSave.setRole(role);
            } else {
                adminToSave = new AdminUser();
                adminToSave.setEmail(customer.getEmail());
                adminToSave.setPasswordHash(customer.getPasswordHash());
                adminToSave.setFirstName(customer.getFirstName());
                adminToSave.setLastName(customer.getLastName());
                adminToSave.setEmployeeId(employeeId != null && !employeeId.isBlank() ? employeeId : "EMP-" + (1000 + customer.getCustomerId()));
                adminToSave.setRole(role);
                adminToSave.setIsActive(true);
            }
        } else if (email != null && !email.isBlank()) {
            var customerOpt = customerRepository.findByEmail(email);
            var existingOpt = adminUserRepository.findByEmail(email);
            if (existingOpt.isPresent()) {
                adminToSave = existingOpt.get();
                adminToSave.setRole(role);
            } else if (customerOpt.isPresent()) {
                Customer customer = customerOpt.get();
                adminToSave = new AdminUser();
                adminToSave.setEmail(customer.getEmail());
                adminToSave.setPasswordHash(customer.getPasswordHash());
                adminToSave.setFirstName(customer.getFirstName());
                adminToSave.setLastName(customer.getLastName());
                adminToSave.setEmployeeId(employeeId != null && !employeeId.isBlank() ? employeeId : "EMP-" + (1000 + customer.getCustomerId()));
                adminToSave.setRole(role);
                adminToSave.setIsActive(true);
            } else {
                String password = (String) body.get("password");
                String firstName = (String) body.get("firstName");
                String lastName = (String) body.get("lastName");
                org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

                adminToSave = new AdminUser();
                adminToSave.setEmail(email);
                adminToSave.setPasswordHash(encoder.encode(password != null ? password : "Password123!"));
                adminToSave.setFirstName(firstName != null ? firstName : "Staff");
                adminToSave.setLastName(lastName != null ? lastName : "Member");
                adminToSave.setEmployeeId(employeeId != null && !employeeId.isBlank() ? employeeId : "EMP-" + System.currentTimeMillis() % 10000);
                adminToSave.setRole(role);
                adminToSave.setIsActive(true);
            }
        } else {
            throw new IllegalArgumentException("Must select an existing registered user or provide email");
        }

        AdminUser saved = adminUserRepository.save(adminToSave);

        Long currentAdminId = (Long) auth.getCredentials();
        String currentAdminEmail = auth.getName();
        auditLogService.log(currentAdminId, currentAdminEmail, "ASSIGN_STAFF", "admin_users", saved.getAdminId(),
                "Assigned staff role " + role.getRoleName() + " to " + saved.getFirstName() + " " + saved.getLastName(),
                Map.of("email", saved.getEmail(), "role", role.getRoleName()));

        return ResponseEntity.ok(new AdminStaffResponse(
                saved.getAdminId(), saved.getEmail(), saved.getFirstName(), saved.getLastName(),
                saved.getRole().getRoleName(), saved.getRole().getPermissionList(),
                saved.getIsActive(), saved.getEmployeeId()));
    }

    @CacheEvict(value = "cache:admin_roles", allEntries = true)
    @PostMapping("/roles")
    public ResponseEntity<RoleResponse> createRole(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");

        String roleName = (String) body.get("roleName");
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName.toUpperCase();
        }

        Object permsObj = body.get("permissions");
        String permissionsStr = "";
        if (permsObj instanceof List) {
            permissionsStr = String.join(",", (List<String>) permsObj);
        } else if (permsObj != null) {
            permissionsStr = permsObj.toString();
        }

        AdminRole newRole = new AdminRole();
        newRole.setRoleName(roleName);
        newRole.setPermissions(permissionsStr);

        AdminRole saved = adminRoleRepository.save(newRole);

        Long currentAdminId = (Long) auth.getCredentials();
        String currentAdminEmail = auth.getName();
        auditLogService.log(currentAdminId, currentAdminEmail, "CREATE_ROLE", "admin_roles", (long) saved.getRoleId(),
                "Created new role " + roleName,
                Map.of("roleName", roleName, "permissions", permissionsStr));

        return ResponseEntity.ok(new RoleResponse(saved.getRoleId(), saved.getRoleName(), saved.getPermissionList()));
    }

    @CacheEvict(value = "cache:loan_types", allEntries = true)
    @PostMapping("/loans/create")
    public ResponseEntity<LoanType> createLoanType(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");

        String typeName = (String) body.get("typeName");
        if (typeName == null || typeName.isBlank()) {
            throw new IllegalArgumentException("Loan product type name is required");
        }

        java.math.BigDecimal baseRate = java.math.BigDecimal.ZERO;
        if (body.get("baseInterestRate") != null) {
            baseRate = new java.math.BigDecimal(body.get("baseInterestRate").toString());
        }

        LoanType newType = new LoanType();
        newType.setTypeName(typeName.trim());
        newType.setBaseInterestRate(baseRate);

        LoanType saved = loanTypeRepository.save(newType);

        Long currentAdminId = (Long) auth.getCredentials();
        String currentAdminEmail = auth.getName();
        auditLogService.log(currentAdminId, currentAdminEmail, "CREATE_LOAN_TYPE", "loan_types", (long) saved.getLoanTypeId(),
                "Created new loan product type " + typeName + " with base rate " + baseRate + "%",
                Map.of("typeName", typeName, "baseInterestRate", baseRate.toString()));

        return ResponseEntity.ok(saved);
    }

    private static final int TIME_SKIP_BATCH = 2000;

    @PostMapping("/time-skip")
    @CacheEvict(value = {"cache:system_analytics", "cache:telemetry"}, allEntries = true)
    public ResponseEntity<Map<String, Object>> simulateTimeSkip(
            Authentication auth,
            @RequestParam(defaultValue = "1") int months) {
        permissionService.require(auth, "settings");

        if (months <= 0 || months > 60) {
            throw new IllegalArgumentException("Months must be between 1 and 60");
        }

        long simStart = System.nanoTime();
        log.info("=== Time skip START: {} month(s) ===", months);

        // ── Resolve transaction types once ───────────────────────────────────
            TransactionType interestType     = transactionTypeRepository.findByTypeName("interest").orElse(null);
            TransactionType feeType          = transactionTypeRepository.findByTypeName("fee").orElse(null);
            TransactionType transferType     = transactionTypeRepository.findByTypeName("transfer").orElse(null);
            TransactionType depositType      = transactionTypeRepository.findByTypeName("deposit").orElse(null);
            TransactionType loanRepayType    = transactionTypeRepository.findByTypeName("loan_repayment").orElse(null);
            TransactionType debitPurchaseType= transactionTypeRepository.findByTypeName("debit_purchase").orElse(null);
            TransactionType creditPurchaseType=transactionTypeRepository.findByTypeName("credit_purchase").orElse(null);
            int interestTypeId      = interestType      != null ? interestType.getTypeId()      : 1;
            int feeTypeId           = feeType           != null ? feeType.getTypeId()           : 2;
            int transferTypeId      = transferType      != null ? transferType.getTypeId()      : 3;
            int depositTypeId       = depositType       != null ? depositType.getTypeId()       : 1;
            int loanRepayTypeId     = loanRepayType     != null ? loanRepayType.getTypeId()     : 5;
            int debitPurchaseTypeId = debitPurchaseType != null ? debitPurchaseType.getTypeId() : 6;
            int creditPurchaseTypeId= creditPurchaseType!= null ? creditPurchaseType.getTypeId(): 7;

        // ── Cache all AccountTypes up-front (small table, safe to load once) ─
        Map<Integer, AccountType> acctTypeCache = new HashMap<>();
        accountTypeRepository.findAll().forEach(at -> acctTypeCache.put(at.getAccountTypeId(), at));

        // ── Cache all LoanTypes up-front ──────────────────────────────────────
        Map<Integer, LoanType> loanTypeCache = new HashMap<>();
        loanTypeRepository.findAll().forEach(lt -> loanTypeCache.put(lt.getLoanTypeId(), lt));

        java.math.BigDecimal totalInterestEarned      = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalFeesCharged         = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalLoanInterestAccrued = java.math.BigDecimal.ZERO;
        int totalTxCreated = 0;

        for (int m = 0; m < months; m++) {
            java.time.OffsetDateTime simulatedTime = java.time.OffsetDateTime.now().plusMonths(m + 1);
            long monthStart = System.nanoTime();
            log.info("--- Month {}/{} ---", m + 1, months);

            // ── Process Accounts in pages ─────────────────────────────────────
            int accountPage = 0;
            Page<Account> accountBatch;
            do {
                accountBatch = accountRepository.findAll(PageRequest.of(accountPage++, TIME_SKIP_BATCH));
                List<Account>     updatedAccounts = new ArrayList<>();
                List<Transaction> txBatch         = new ArrayList<>();

                for (Account account : accountBatch.getContent()) {
                    if (account.getAccountTypeId() == null) continue;
                    AccountType acctType = acctTypeCache.get(account.getAccountTypeId());
                    if (acctType == null) continue;
                    if ("Fixed Deposit".equals(acctType.getTypeName())) continue;

                    boolean dirty = false;

                    // Interest
                    if (acctType.getInterestRate() != null
                            && acctType.getInterestRate().compareTo(java.math.BigDecimal.ZERO) > 0
                            && account.getBalance().compareTo(java.math.BigDecimal.ZERO) > 0) {
                        java.math.BigDecimal monthlyRate = acctType.getInterestRate()
                                .divide(java.math.BigDecimal.valueOf(12), 10, java.math.RoundingMode.HALF_UP);
                        java.math.BigDecimal interest = account.getBalance()
                                .multiply(monthlyRate)
                                .setScale(2, java.math.RoundingMode.HALF_UP);
                        if (interest.compareTo(java.math.BigDecimal.ZERO) > 0) {
                            account.setBalance(account.getBalance().add(interest));
                            totalInterestEarned = totalInterestEarned.add(interest);
                            dirty = true;

                            Transaction tx = new Transaction();
                            tx.setReferenceNumber("SIM-INT-" + account.getAccountId() + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                            tx.setTypeId(interestTypeId);
                            tx.setTargetAccountId(account.getAccountId());
                            tx.setAmount(interest);
                            tx.setCurrency("USD");
                            tx.setStatus("completed");
                            tx.setDescription("Monthly Interest Payment (" + acctType.getTypeName() + ")");
                            tx.setTransactionDate(simulatedTime);
                            txBatch.add(tx);
                            totalTxCreated++;
                        }
                    }

                    // Maintenance Fee
                    if (acctType.getMaintenanceFee() != null
                            && acctType.getMaintenanceFee().compareTo(java.math.BigDecimal.ZERO) > 0
                            && account.getBalance().compareTo(acctType.getMaintenanceFee()) >= 0) {
                        java.math.BigDecimal fee = acctType.getMaintenanceFee();
                        account.setBalance(account.getBalance().subtract(fee));
                        totalFeesCharged = totalFeesCharged.add(fee);
                        dirty = true;

                        Transaction tx = new Transaction();
                        tx.setReferenceNumber("SIM-FEE-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                        tx.setTypeId(feeTypeId);
                        tx.setSourceAccountId(account.getAccountId());
                        tx.setAmount(fee);
                        tx.setCurrency("USD");
                        tx.setStatus("completed");
                        tx.setDescription("Monthly Maintenance Fee (" + acctType.getTypeName() + ")");
                        tx.setTransactionDate(simulatedTime);
                        txBatch.add(tx);
                        totalTxCreated++;
                    }

                    // Income simulation — payday for checking accounts (~90% per month)
                    if (account.getAccountTypeId() == 2
                            && "active".equals(account.getStatus())
                            && new java.util.Random().nextDouble() < 0.90) {
                        java.math.BigDecimal pay = java.math.BigDecimal.valueOf(2000 + new java.util.Random().nextDouble() * 6000)
                                .setScale(2, java.math.RoundingMode.HALF_UP);
                        account.setBalance(account.getBalance().add(pay));
                        dirty = true;
                        Transaction tx = new Transaction();
                        tx.setReferenceNumber("SIM-PAY-" + account.getAccountId() + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                        tx.setTypeId(depositTypeId);
                        tx.setTargetAccountId(account.getAccountId());
                        tx.setAmount(pay);
                        tx.setCurrency("USD");
                        tx.setStatus("completed");
                        tx.setDescription("Direct Deposit — Payroll");
                        tx.setTransactionDate(simulatedTime);
                        txBatch.add(tx);
                        totalTxCreated++;
                    }

                    if (dirty) updatedAccounts.add(account);
                }

                // Flush this page's changes in two batch writes
                if (!updatedAccounts.isEmpty()) accountRepository.saveAll(updatedAccounts);
                if (!txBatch.isEmpty())         batchTxns(txBatch);

                if (accountPage % 50 == 0) {
                    log.info("  Accounts page {}/{} ({}%), {} txns so far...",
                        accountPage, (int)Math.ceil(600000.0/TIME_SKIP_BATCH),
                        (accountPage * 100) / (int)Math.ceil(600000.0/TIME_SKIP_BATCH),
                        totalTxCreated);
                }
            } while (accountBatch.hasNext());

            log.info("  Accounts done: {} pages, ${} interest, ${} fees, {} txns in {}ms",
                accountPage, totalInterestEarned, totalFeesCharged, totalTxCreated,
                (System.nanoTime() - simStart) / 1_000_000);

            // ── Process Loans in pages ────────────────────────────────────────
            int loanPage = 0;
            Page<Loan> loanBatch;
            do {
                loanBatch = loanRepository.findAll(PageRequest.of(loanPage++, TIME_SKIP_BATCH));
                List<Loan>        updatedLoans = new ArrayList<>();
                List<Transaction> txBatch      = new ArrayList<>();

                for (Loan loan : loanBatch.getContent()) {
                    String status = loan.getStatus() != null ? loan.getStatus().toLowerCase() : "";
                    if (!status.equals("approved") && !status.equals("active")) continue;
                    if (loan.getOutstandingBalance() == null
                            || loan.getOutstandingBalance().compareTo(java.math.BigDecimal.ZERO) <= 0) continue;

                    LoanType lt = loan.getLoanTypeId() != null ? loanTypeCache.get(loan.getLoanTypeId()) : null;
                    java.math.BigDecimal rate = lt != null && lt.getBaseInterestRate() != null
                            ? lt.getBaseInterestRate()
                            : (loan.getInterestRate() != null ? loan.getInterestRate() : java.math.BigDecimal.valueOf(5.0));
                    java.math.BigDecimal monthlyRate = rate.divide(java.math.BigDecimal.valueOf(12), 10, java.math.RoundingMode.HALF_UP);

                    // Loan repayment simulation — ~65% of active loans repaid each month.
                    // Mirrors the real repayment engine (LoanService.repayLoan): interest is
                    // charged only at repayment time, pro-rated over the months elapsed since
                    // the last interest charge, and never compounded into the outstanding balance.
                    if (new java.util.Random().nextDouble() < 0.65
                            && loan.getMonthlyPaymentAmount() != null
                            && loan.getMonthlyPaymentAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                        java.util.List<Account> custAccts = accountRepository
                                .findByCustomer_CustomerId(loan.getCustomer().getCustomerId());
                        Account sourceAcct = null;
                        for (Account a : custAccts) {
                            if (a.getAccountTypeId() == 2 && "active".equals(a.getStatus())) {
                                sourceAcct = a; break;
                            }
                        }
                        if (sourceAcct != null) {
                            java.math.BigDecimal repayAmt = loan.getMonthlyPaymentAmount()
                                    .multiply(java.math.BigDecimal.valueOf(0.8 + new java.util.Random().nextDouble() * 0.4))
                                    .setScale(2, java.math.RoundingMode.HALF_UP);

                            java.math.BigDecimal lateFeesOwed = loan.getLateFeesOwed() != null
                                    ? loan.getLateFeesOwed() : java.math.BigDecimal.ZERO;
                            java.math.BigDecimal interestBase = loan.getOutstandingBalance().subtract(lateFeesOwed);
                            if (interestBase.compareTo(java.math.BigDecimal.ZERO) < 0) interestBase = java.math.BigDecimal.ZERO;

                            java.time.LocalDate lastCharge = loan.getLastInterestDate() != null
                                    ? loan.getLastInterestDate()
                                    : (loan.getApprovedAt() != null
                                        ? loan.getApprovedAt().toLocalDate()
                                        : simulatedTime.toLocalDate());
                            long monthsSinceCharge = Math.max(0, java.time.temporal.ChronoUnit.MONTHS.between(
                                    java.time.YearMonth.from(lastCharge),
                                    java.time.YearMonth.from(simulatedTime.toLocalDate())));
                            java.math.BigDecimal accruedInterest = interestBase.multiply(monthlyRate)
                                    .multiply(java.math.BigDecimal.valueOf(monthsSinceCharge))
                                    .setScale(2, java.math.RoundingMode.HALF_UP);

                            java.math.BigDecimal payoffAmount = loan.getOutstandingBalance().add(accruedInterest);
                            java.math.BigDecimal effectivePaid = repayAmt.min(payoffAmount);

                            if (sourceAcct.getBalance().compareTo(effectivePaid) >= 0) {
                                sourceAcct.setBalance(sourceAcct.getBalance().subtract(effectivePaid));

                                // Payments apply to late fees first, then interest, then principal.
                                java.math.BigDecimal lateFeePaid = effectivePaid.min(lateFeesOwed);
                                java.math.BigDecimal rest = effectivePaid.subtract(lateFeePaid);
                                java.math.BigDecimal interestPaid = rest.min(accruedInterest);
                                java.math.BigDecimal principalPaid = rest.subtract(interestPaid);

                                loan.setLateFeesOwed(lateFeesOwed.subtract(lateFeePaid));
                                loan.setOutstandingBalance(java.math.BigDecimal.ZERO.max(
                                        loan.getOutstandingBalance().subtract(principalPaid).subtract(lateFeePaid)));
                                if (loan.getOutstandingBalance().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                                    loan.setStatus("settled");
                                    loan.setNextPaymentDueDate(null);
                                } else if (loan.getNextPaymentDueDate() != null) {
                                    loan.setNextPaymentDueDate(loan.getNextPaymentDueDate().plusMonths(1));
                                }
                                loan.setLastInterestDate(simulatedTime.toLocalDate());
                                updatedLoans.add(loan);
                                totalLoanInterestAccrued = totalLoanInterestAccrued.add(interestPaid);

                                Transaction repayTx = new Transaction();
                                repayTx.setReferenceNumber("SIM-LNREP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                                repayTx.setTypeId(loanRepayTypeId);
                                repayTx.setSourceAccountId(sourceAcct.getAccountId());
                                repayTx.setAmount(effectivePaid);
                                repayTx.setCurrency("USD");
                                repayTx.setStatus("completed");
                                repayTx.setDescription("Loan Repayment — " + (lt != null ? lt.getTypeName() : "Loan")
                                        + " (interest $" + interestPaid + ")");
                                repayTx.setTransactionDate(simulatedTime);
                                txBatch.add(repayTx);
                                totalTxCreated++;
                            }
                        }
                    }
                }

                if (!updatedLoans.isEmpty()) loanRepository.saveAll(updatedLoans);
                if (!txBatch.isEmpty())      batchTxns(txBatch);

                if (loanPage % 20 == 0) {
                    log.info("  Loans page {}/{}", loanPage, (int)Math.ceil(40000.0/TIME_SKIP_BATCH));
                }
            } while (loanBatch.hasNext());

            log.info("  Loans done: {} pages, ${} interest accrued in {}ms",
                loanPage, totalLoanInterestAccrued,
                (System.nanoTime() - simStart) / 1_000_000);

            // ── Auto-pay bills ─────────────────────────────────────────────────
            java.time.YearMonth ym = java.time.YearMonth.from(simulatedTime);
            List<CustomerBill> autoPayBills = customerBillRepository.findByStatusAndAutoPayTrue("ACTIVE");
            log.info("  Auto-pay: {} active bills", autoPayBills.size());
            java.util.Map<Long, Account> acctsToUpdate = new java.util.HashMap<>();
            List<Transaction> autoPayTxBatch = new ArrayList<>();
            List<CustomerBill> paidBills = new ArrayList<>();
            for (CustomerBill bill : autoPayBills) {
                if (bill.getSourceAccountId() == null) continue;
                if (bill.getAmount() == null || bill.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) continue;

                boolean shouldPay = false;
                LocalDate billDue = bill.getDueDate();
                java.time.LocalDate simLocalDate = simulatedTime.toLocalDate();
                if ("MONTHLY".equals(bill.getFrequency())) {
                    if (billDue == null) continue;
                    LocalDate thisMonthDue = billDue.withDayOfMonth(Math.min(billDue.getDayOfMonth(), simLocalDate.lengthOfMonth()));
                    if (simLocalDate.isBefore(thisMonthDue)) { shouldPay = false; }
                    else if (bill.getLastPaidAt() == null) { shouldPay = true; }
                    else { shouldPay = !java.time.YearMonth.from(bill.getLastPaidAt()).equals(ym); }
                } else if (bill.getFrequency() == null || "ONE_TIME".equalsIgnoreCase(bill.getFrequency())) {
                    if (billDue != null && simLocalDate.isBefore(billDue)) { shouldPay = false; }
                    else { shouldPay = bill.getLastPaidAt() == null; }
                } else if ("YEARLY".equals(bill.getFrequency())) {
                    if (billDue == null) continue;
                    if (bill.getLastPaidAt() == null) {
                        shouldPay = !simLocalDate.isBefore(billDue);
                    } else {
                        java.time.YearMonth lastPaidYearMonth = java.time.YearMonth.from(bill.getLastPaidAt());
                        shouldPay = lastPaidYearMonth.getYear() != ym.getYear() && !simLocalDate.isBefore(billDue);
                    }
                } else if ("WEEKLY".equals(bill.getFrequency())) {
                    if (billDue == null) continue;
                    if (bill.getLastPaidAt() == null) {
                        shouldPay = !simLocalDate.isBefore(billDue);
                    } else {
                        shouldPay = bill.getLastPaidAt().toLocalDate().plusWeeks(1).isBefore(simLocalDate) && !simLocalDate.isBefore(billDue);
                    }
                }

                if (!shouldPay) continue;

                Account sourceAccount = acctsToUpdate.get(bill.getSourceAccountId());
                if (sourceAccount == null) {
                    sourceAccount = accountRepository.findById(bill.getSourceAccountId()).orElse(null);
                    if (sourceAccount == null) continue;
                    acctsToUpdate.put(bill.getSourceAccountId(), sourceAccount);
                }
                if (sourceAccount.getBalance().compareTo(bill.getAmount()) < 0) continue;

                if (bill.getTargetAccountId() != null) {
                    Account targetAcct = acctsToUpdate.get(bill.getTargetAccountId());
                    if (targetAcct == null) {
                        targetAcct = accountRepository.findById(bill.getTargetAccountId()).orElse(null);
                        if (targetAcct != null) {
                            acctsToUpdate.put(bill.getTargetAccountId(), targetAcct);
                        }
                    }
                    if (targetAcct != null) {
                        targetAcct.setBalance(targetAcct.getBalance().add(bill.getAmount()));
                    }
                }

                sourceAccount.setBalance(sourceAccount.getBalance().subtract(bill.getAmount()));

                Transaction tx = new Transaction();
                tx.setReferenceNumber("AUTO-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                tx.setTypeId(transferTypeId);
                tx.setSourceAccountId(bill.getSourceAccountId());
                tx.setTargetAccountId(bill.getTargetAccountId());
                tx.setAmount(bill.getAmount());
                tx.setCurrency("USD");
                tx.setStatus("completed");
                tx.setDescription("Auto Pay — " + bill.getBillerName());
                tx.setTransactionDate(simulatedTime);
                autoPayTxBatch.add(tx);

                bill.setLastPaidAt(simulatedTime);
                paidBills.add(bill);
                totalTxCreated++;
            }
            if (!acctsToUpdate.isEmpty()) accountRepository.saveAll(acctsToUpdate.values());
            if (!autoPayTxBatch.isEmpty()) batchTxns(autoPayTxBatch);
            if (!paidBills.isEmpty()) customerBillRepository.saveAll(paidBills);
            log.info("  Auto-pay done: {} paid, {} accounts in {}ms",
                paidBills.size(), acctsToUpdate.size(),
                (System.nanoTime() - simStart) / 1_000_000);

            // ── Credit card statement generation ──────────────────────────────
            java.time.LocalDate simDate = simulatedTime.toLocalDate();
            List<Card> creditCards = cardRepository.findByCreditLimitIsNotNull();
            log.info("  Card statements: {} credit cards...", creditCards.size());
            List<CardStatement> newStatements = new ArrayList<>();
            List<Card> updatedCards = new ArrayList<>();
            for (Card card : creditCards) {
                if (card.getOutstandingBalance() == null || card.getOutstandingBalance().compareTo(java.math.BigDecimal.ZERO) <= 0) continue;
                CardStatement stmt = new CardStatement();
                stmt.setCard(card);
                java.time.LocalDate periodStart = simDate.minusMonths(1).withDayOfMonth(1);
                java.time.LocalDate periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth());
                stmt.setPeriodStart(periodStart);
                stmt.setPeriodEnd(periodEnd);
                stmt.setDueDate(simDate.plusDays(21));
                stmt.setStartingBalance(card.getOutstandingBalance());
                if (card.getApr() != null && card.getApr().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    java.math.BigDecimal dailyRate = card.getApr().divide(java.math.BigDecimal.valueOf(365), 10, java.math.RoundingMode.HALF_UP);
                    java.math.BigDecimal interest = card.getOutstandingBalance().multiply(dailyRate).multiply(java.math.BigDecimal.valueOf(30)).setScale(4, java.math.RoundingMode.HALF_UP);
                    card.setOutstandingBalance(card.getOutstandingBalance().add(interest));
                }
                stmt.setEndingBalance(card.getOutstandingBalance());
                java.math.BigDecimal minPay = stmt.getEndingBalance().multiply(java.math.BigDecimal.valueOf(0.02)).setScale(4, java.math.RoundingMode.HALF_UP);
                if (minPay.compareTo(java.math.BigDecimal.valueOf(25)) < 0) minPay = stmt.getEndingBalance();
                stmt.setMinimumPayment(minPay);
                stmt.setPaid(false);
                newStatements.add(stmt);
                updatedCards.add(card);
            }
            if (!newStatements.isEmpty()) cardStatementRepository.saveAll(newStatements);
            if (!updatedCards.isEmpty()) cardRepository.saveAll(updatedCards);
            log.info("  Card statements done: {} generated in {}ms",
                newStatements.size(),
                (System.nanoTime() - simStart) / 1_000_000);

            // ── Card purchase simulation (credit only — 1-3 purchases per card) ──
            String[] SIM_MERCHANTS = {"Amazon","Walmart","Target","Costco","Starbucks","Uber","Netflix",
                "Spotify","Best Buy","Kroger","Shell Gas","Home Depot","Macy's","Nike Online","DoorDash"};
            java.util.Map<Long, CardLimit> limitCache = new java.util.HashMap<>();
            cardLimitRepository.findAll().forEach(cl -> limitCache.put(cl.getCardId(), cl));

            int cardPage = 0;
            Page<Card> cardBatch;
            do {
                cardBatch = cardRepository.findByCreditLimitIsNotNull(PageRequest.of(cardPage++, TIME_SKIP_BATCH));
                List<Card>     updatedSimCards = new ArrayList<>();
                List<Transaction> simTxBatch  = new ArrayList<>();
                List<CardTransaction> simCxnBatch = new ArrayList<>();

                for (Card card : cardBatch.getContent()) {
                    if (card.getOutstandingBalance() == null
                            || card.getOutstandingBalance().compareTo(card.getCreditLimit()) >= 0) continue;
                    CardLimit cl = limitCache.get(card.getCardId());
                    if (cl == null) continue;

                    int purchases = 3 + new java.util.Random().nextInt(4);
                    for (int p = 0; p < purchases; p++) {
                        java.math.BigDecimal maxAmt = card.getCreditLimit().subtract(card.getOutstandingBalance());
                        if (maxAmt.compareTo(java.math.BigDecimal.ONE) < 0) break;
                        java.math.BigDecimal amt = java.math.BigDecimal.valueOf(
                                5 + new java.util.Random().nextDouble() * Math.min(maxAmt.doubleValue(), 200))
                                .setScale(2, java.math.RoundingMode.HALF_UP);
                        if (amt.compareTo(java.math.BigDecimal.ZERO) <= 0) continue;

                        String merchant = SIM_MERCHANTS[new java.util.Random().nextInt(SIM_MERCHANTS.length)];
                        card.setOutstandingBalance(card.getOutstandingBalance().add(amt));
                        updatedSimCards.add(card);

                        java.time.LocalDateTime txnDate = simDate.atTime(
                                8 + new java.util.Random().nextInt(14), new java.util.Random().nextInt(60));
                        CardTransaction cxn = new CardTransaction();
                        cxn.setCardId(card.getCardId()); cxn.setAmount(amt); cxn.setMerchant(merchant);
                        cxn.setDescription("Purchase" + (new java.util.Random().nextBoolean() ? " [Online]" : ""));
                        cxn.setTransactionDate(txnDate);
                        simCxnBatch.add(cxn);

                        Transaction txn = new Transaction();
                        txn.setReferenceNumber("CRD-" + card.getCardId() + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                        txn.setTypeId(creditPurchaseTypeId);
                        txn.setAmount(amt); txn.setCurrency("USD"); txn.setStatus("completed");
                        txn.setDescription("Card purchase at " + merchant);
                        txn.setTransactionDate(txnDate.atOffset(java.time.ZoneOffset.UTC));
                        simTxBatch.add(txn);
                        totalTxCreated++;
                    }
                }
                if (!updatedSimCards.isEmpty()) cardRepository.saveAll(updatedSimCards);
                if (!simTxBatch.isEmpty())      batchTxns(simTxBatch);
                if (!simCxnBatch.isEmpty())     cardTransactionRepository.saveAll(simCxnBatch);
            } while (cardBatch.hasNext());
            log.info("  Card purchases done: {} credit cards in {}ms",
                cardPage, (System.nanoTime() - simStart) / 1_000_000);

            // ── Debit card purchases — one-shot native query, no lazy loading ──
            java.util.List<Object[]> debitData = cardRepository.findDebitCardPurchaseData();
            if (!debitData.isEmpty()) {
                java.util.List<Account> updatedDebitAccts = new java.util.ArrayList<>();
                java.util.List<Transaction> debitTxBatch = new java.util.ArrayList<>();
                java.util.List<CardTransaction> debitCxnBatch = new java.util.ArrayList<>();
                for (Object[] row : debitData) {
                    Long cardId = ((Number) row[0]).longValue();
                    Long acctId = ((Number) row[1]).longValue();
                    java.math.BigDecimal balance = (java.math.BigDecimal) row[2];
                    int purchases = 1 + new java.util.Random().nextInt(2);
                    for (int p = 0; p < purchases; p++) {
                        java.math.BigDecimal maxAmt = balance.subtract(java.math.BigDecimal.valueOf(5));
                        if (maxAmt.compareTo(java.math.BigDecimal.ONE) < 0) break;
                        java.math.BigDecimal amt = java.math.BigDecimal.valueOf(
                                5 + new java.util.Random().nextDouble() * Math.min(maxAmt.doubleValue(), 100))
                                .setScale(2, java.math.RoundingMode.HALF_UP);
                        if (amt.compareTo(java.math.BigDecimal.ZERO) <= 0) continue;
                        balance = balance.subtract(amt);
                        String merchant = SIM_MERCHANTS[new java.util.Random().nextInt(SIM_MERCHANTS.length)];
                        java.time.LocalDateTime txnDate = simDate.atTime(
                                8 + new java.util.Random().nextInt(14), new java.util.Random().nextInt(60));
                        CardTransaction cxn = new CardTransaction();
                        cxn.setCardId(cardId); cxn.setAmount(amt); cxn.setMerchant(merchant);
                        cxn.setDescription("Purchase" + (new java.util.Random().nextBoolean() ? " [Online]" : ""));
                        cxn.setTransactionDate(txnDate);
                        debitCxnBatch.add(cxn);
                        Transaction txn = new Transaction();
                        txn.setReferenceNumber("DBT-" + cardId + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                        txn.setTypeId(debitPurchaseTypeId);
                        txn.setSourceAccountId(acctId); txn.setAmount(amt);
                        txn.setCurrency("USD"); txn.setStatus("completed");
                        txn.setDescription("Card purchase at " + merchant);
                        txn.setTransactionDate(txnDate.atOffset(java.time.ZoneOffset.UTC));
                        debitTxBatch.add(txn);
                        totalTxCreated++;
                    }
                    Account debitAcct = accountRepository.findById(acctId).orElse(null);
                    if (debitAcct != null) { debitAcct.setBalance(balance); updatedDebitAccts.add(debitAcct); }
                }
                if (!updatedDebitAccts.isEmpty()) accountRepository.saveAll(updatedDebitAccts);
                if (!debitTxBatch.isEmpty())      batchTxns(debitTxBatch);
                if (!debitCxnBatch.isEmpty())     cardTransactionRepository.saveAll(debitCxnBatch);
                log.info("  Debit purchases done: {} cards in {}ms",
                    debitData.size(), (System.nanoTime() - simStart) / 1_000_000);
            }

            // ── Credit card payments — 70% of owing cards pay something ────────
            java.util.List<Card> cardsWithBalance = cardRepository.findByCreditLimitIsNotNull().stream()
                    .filter(c -> c.getOutstandingBalance() != null && c.getOutstandingBalance().compareTo(java.math.BigDecimal.ZERO) > 0)
                    .toList();
            if (!cardsWithBalance.isEmpty()) {
                java.util.List<Card> updatedPayCards = new java.util.ArrayList<>();
                java.util.List<Account> updatedPayAccts = new java.util.ArrayList<>();
                java.util.List<Transaction> payTxBatch = new java.util.ArrayList<>();
                java.util.Map<Long, Account> payAcctCache = new java.util.HashMap<>();
                for (Card card : cardsWithBalance) {
                    double roll = new java.util.Random().nextDouble();
                    if (roll >= 0.70) continue; // 30% skip (miss/delinquent)
                    Account linkedAcct = payAcctCache.computeIfAbsent(card.getAccount().getAccountId(),
                            id -> accountRepository.findById(id).orElse(null));
                    if (linkedAcct == null) continue;

                    java.math.BigDecimal payment;
                    if (roll < 0.50) { // 50%: pay in full
                        payment = card.getOutstandingBalance();
                    } else if (roll < 0.70) { // 20%: pay minimum (2%)
                        payment = card.getOutstandingBalance().multiply(java.math.BigDecimal.valueOf(0.02))
                                .setScale(2, java.math.RoundingMode.HALF_UP);
                        if (payment.compareTo(java.math.BigDecimal.valueOf(25)) < 0) payment = card.getOutstandingBalance();
                    } else { // 10%: pay partial (between min and full)
                        payment = card.getOutstandingBalance().multiply(
                                java.math.BigDecimal.valueOf(0.1 + new java.util.Random().nextDouble() * 0.6))
                                .setScale(2, java.math.RoundingMode.HALF_UP);
                    }
                    if (payment.compareTo(java.math.BigDecimal.ZERO) <= 0) continue;
                    if (linkedAcct.getBalance().compareTo(payment) < 0) continue;

                    linkedAcct.setBalance(linkedAcct.getBalance().subtract(payment));
                    updatedPayAccts.add(linkedAcct);

                    card.setOutstandingBalance(java.math.BigDecimal.ZERO.max(card.getOutstandingBalance().subtract(payment)));
                    updatedPayCards.add(card);

                    Transaction payTx = new Transaction();
                    payTx.setReferenceNumber("CCPAY-" + card.getCardId() + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                    payTx.setTypeId(transferTypeId);
                    payTx.setSourceAccountId(linkedAcct.getAccountId());
                    payTx.setAmount(payment); payTx.setCurrency("USD"); payTx.setStatus("completed");
                    payTx.setDescription("Credit Card Payment — " + (roll < 0.50 ? "Full" : roll < 0.70 ? "Minimum" : "Partial"));
                    payTx.setTransactionDate(simulatedTime);
                    payTxBatch.add(payTx);
                    totalTxCreated++;
                }
                if (!updatedPayCards.isEmpty()) cardRepository.saveAll(updatedPayCards);
                if (!updatedPayAccts.isEmpty()) accountRepository.saveAll(updatedPayAccts);
                if (!payTxBatch.isEmpty()) batchTxns(payTxBatch);
                log.info("  Card payments done: {} paid, {} txns in {}ms",
                    updatedPayCards.size(), payTxBatch.size(), (System.nanoTime() - simStart) / 1_000_000);
            }

            // ── Auto-release matured savings goals ────────────────────────────
            List<SavingsGoal> maturedGoals = savingsGoalRepository
                    .findByStatusAndAutoReleaseTrueAndTargetDateBefore("ACTIVE", simDate);
            if (!maturedGoals.isEmpty()) {
                log.info("  Savings goals: {} matured with auto-release...", maturedGoals.size());
                List<Account> goalAccountsToUpdate = new ArrayList<>();
                List<Transaction> goalTxBatch = new ArrayList<>();
                for (SavingsGoal goal : maturedGoals) {
                    if (goal.getCurrentAmount() == null || goal.getCurrentAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) continue;
                    Account goalAcct = accountRepository.findById(goal.getAccountId()).orElse(null);
                    if (goalAcct == null) continue;
                    goalAcct.setBalance(goalAcct.getBalance().add(goal.getCurrentAmount()));
                    goalAccountsToUpdate.add(goalAcct);
                    Transaction tx = new Transaction();
                    tx.setReferenceNumber("SGR-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    tx.setTypeId(transferTypeId);
                    tx.setTargetAccountId(goal.getAccountId());
                    tx.setAmount(goal.getCurrentAmount());
                    tx.setCurrency("USD");
                    tx.setStatus("completed");
                    tx.setDescription("Auto-release from matured goal: " + goal.getGoalName());
                    tx.setTransactionDate(simulatedTime);
                    goalTxBatch.add(tx);
                    goal.setCurrentAmount(java.math.BigDecimal.ZERO);
                    goal.setStatus("COMPLETED");
                    goal.setUpdatedAt(java.time.LocalDateTime.now());
                    totalTxCreated++;
                }
                savingsGoalRepository.saveAll(maturedGoals);
                if (!goalAccountsToUpdate.isEmpty()) accountRepository.saveAll(goalAccountsToUpdate);
                if (!goalTxBatch.isEmpty()) batchTxns(goalTxBatch);
                log.info("  Savings goals done: {} released, {} txns in {}ms",
                    maturedGoals.size(), goalTxBatch.size(),
                    (System.nanoTime() - monthStart) / 1_000_000);
            }

            // ── Assess late fees on past-due unpaid statements ────────────────
            List<CardStatement> pastDue = cardStatementRepository.findByPaidFalseAndDueDateBefore(simDate);
            List<Card> lateFeeCards = new ArrayList<>();
            for (CardStatement stmt : pastDue) {
                Card card = stmt.getCard();
                java.math.BigDecimal lateFee = java.math.BigDecimal.ZERO;
                if (card.getCardType() != null) {
                    CardType ct = cardTypeRepository.findById(card.getCardType().getCardTypeId()).orElse(null);
                    if (ct != null && ct.getLateFee() != null) lateFee = ct.getLateFee();
                }
                if (lateFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
                    card.setOutstandingBalance(card.getOutstandingBalance().add(lateFee));
                    lateFeeCards.add(card);
                }
            }
            if (!lateFeeCards.isEmpty()) cardRepository.saveAll(lateFeeCards);
            log.info("  Late fees done: {} past-due, {} fees applied in {}ms",
                pastDue.size(), lateFeeCards.size(),
                (System.nanoTime() - simStart) / 1_000_000);

            log.info("  Month {}/{} total: {} txns in {}ms",
                m + 1, months, totalTxCreated,
                (System.nanoTime() - monthStart) / 1_000_000);

        }

        // ── Recalculate credit scores (once after all months) ───────────
        log.info("Recalculating credit scores for all customers...");
        recalculateCreditScores(java.time.LocalDate.now().plusMonths(months));
        log.info("Credit scores done in {}ms", (System.nanoTime() - simStart) / 1_000_000);

        log.info("=== Time skip COMPLETE: {} months, {} txns, {}s ===",
            months, totalTxCreated, (System.nanoTime() - simStart) / 1_000_000_000);

        Long currentAdminId   = (Long) auth.getCredentials();
        String currentAdminEmail = auth.getName();
        auditLogService.log(currentAdminId, currentAdminEmail, "TIME_SKIP_SIMULATION", "system", (long) months,
                "Executed " + months + " month(s) time skip simulation across all accounts & loans",
                Map.of("monthsSkipped", months,
                       "interestPaid", totalInterestEarned.toString(),
                       "feesCharged", totalFeesCharged.toString(),
                       "loanInterestAccrued", totalLoanInterestAccrued.toString()));

        return ResponseEntity.ok(Map.of(
                "monthsSkipped", months,
                "interestEarned", totalInterestEarned,
                "feesCharged", totalFeesCharged,
                "loanInterestAccrued", totalLoanInterestAccrued,
                "transactionsCreated", totalTxCreated
        ));
    }

    private void recalculateCreditScores(java.time.LocalDate simulatedNow) {
        int pageSize = 500;
        int page = 0;
        int totalProcessed = 0;
        log.info("  Credit scores: recalculating...");
        long csStart = System.nanoTime();
        while (true) {
            List<Customer> batch = customerRepository.findAll(org.springframework.data.domain.PageRequest.of(page++, pageSize)).getContent();
            if (batch.isEmpty()) break;
            List<Customer> updated = new ArrayList<>();
            for (Customer c : batch) {
                int score = 300;

                if ("approved".equalsIgnoreCase(c.getKycStatus())) score += 80;

                List<Account> customerAccounts = accountRepository.findByCustomer_CustomerId(c.getCustomerId());
                boolean hasLoans = false;
                boolean hasCreditCards = false;
                java.math.BigDecimal totalBalance = java.math.BigDecimal.ZERO;

                if (!customerAccounts.isEmpty()) {
                    long maxAgeMonths = customerAccounts.stream()
                            .filter(a -> a.getCreatedAt() != null)
                            .mapToLong(a -> java.time.temporal.ChronoUnit.MONTHS.between(a.getCreatedAt().toLocalDate(), simulatedNow))
                            .max().orElse(0);
                    score += (int) Math.min(maxAgeMonths, 120);
                }

                for (Account a : customerAccounts) {
                    totalBalance = totalBalance.add(a.getBalance() != null ? a.getBalance() : java.math.BigDecimal.ZERO);
                }
                if (totalBalance.compareTo(java.math.BigDecimal.valueOf(1000)) >= 0) score += 30;

                List<Loan> customerLoans = loanRepository.findByCustomer_CustomerId(c.getCustomerId());
                for (Loan loan : customerLoans) {
                    hasLoans = true;
                    if (loan.getOutstandingBalance() != null
                            && loan.getOutstandingBalance().compareTo(java.math.BigDecimal.ZERO) > 0) {
                        score -= 50;
                    }
                }

                List<Card> cards = cardRepository.findByAccount_Customer_CustomerId(c.getCustomerId());
                for (Card card : cards) {
                    if (card.getCreditLimit() == null) continue;
                    hasCreditCards = true;
                    if (card.getCreditLimit().compareTo(java.math.BigDecimal.ZERO) > 0) {
                        java.math.BigDecimal utilization = card.getOutstandingBalance()
                                .divide(card.getCreditLimit(), 4, java.math.RoundingMode.HALF_UP);
                        if (utilization.compareTo(java.math.BigDecimal.valueOf(0.3)) < 0) {
                            score += 60;
                        } else if (utilization.compareTo(java.math.BigDecimal.valueOf(0.5)) > 0) {
                            score -= 40;
                        }
                    }
                }

                if (hasLoans && hasCreditCards) score += 40;

                c.setCreditScore(Math.max(300, Math.min(850, score)));
                updated.add(c);
            }
            customerRepository.saveAll(updated);
            totalProcessed += batch.size();
            log.info("  Credit scores: done {} customers ({}ms)", totalProcessed, (System.nanoTime() - csStart) / 1_000_000);
        }
        log.info("  Credit scores: complete, {} total customers in {}ms", totalProcessed, (System.nanoTime() - csStart) / 1_000_000);
    }

    @GetMapping("/card-types")
    public ResponseEntity<List<CardType>> getCardTypes(Authentication auth) {
        permissionService.require(auth, "settings");
        return ResponseEntity.ok(service.getAllCardTypes());
    }

    @CacheEvict(value = "cache:card_types", allEntries = true)
    @PutMapping("/card-types/{id}")
    public ResponseEntity<CardType> updateCardType(Authentication auth,
                                                    @PathVariable Integer id,
                                                    @RequestBody CardType updated) {
        permissionService.require(auth, "settings");
        CardType ct = cardTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Card type not found"));
        if (updated.getDefaultApr() != null) ct.setDefaultApr(updated.getDefaultApr());
        if (updated.getLateFee() != null) ct.setLateFee(updated.getLateFee());
        return ResponseEntity.ok(cardTypeRepository.save(ct));
    }

    @GetMapping("/credit-tiers")
    public ResponseEntity<List<CreditScoreTier>> getCreditTiers(Authentication auth) {
        permissionService.require(auth, "settings");
        return ResponseEntity.ok(service.getAllCreditTiers());
    }

    @CacheEvict(value = "cache:credit_tiers", allEntries = true)
    @PutMapping("/credit-tiers/{id}")
    public ResponseEntity<CreditScoreTier> updateCreditTier(Authentication auth,
                                                              @PathVariable Integer id,
                                                              @RequestBody CreditScoreTier updated) {
        permissionService.require(auth, "settings");
        CreditScoreTier tier = creditScoreTierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tier not found"));
        if (updated.getCreditLimit() != null) tier.setCreditLimit(updated.getCreditLimit());
        if (updated.getApr() != null) tier.setApr(updated.getApr());
        return ResponseEntity.ok(creditScoreTierRepository.save(tier));
    }

    // ── Transaction Categories ─────────────────────────────────────────

    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories(Authentication auth,
            @RequestParam(defaultValue = "8") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        permissionService.require(auth, "settings");
        List<TransactionCategory> page = transactionCategoryRepository.findAll(
                org.springframework.data.domain.PageRequest.of(
                        Math.max(0, offset / Math.max(1, limit)),
                        Math.max(1, limit),
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "categoryName")))
                .getContent();
        long total = transactionCategoryRepository.count();
        List<Map<String, Object>> items = page.stream().map(cat -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("categoryId", cat.getCategoryId());
            m.put("categoryName", cat.getCategoryName());
            m.put("usedCount", transactionRepository.countByCategoryId(cat.getCategoryId()));
            return m;
        }).toList();
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("categories", items);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        return ResponseEntity.ok(result);
    }

    @CacheEvict(value = "cache:tx_types", allEntries = true)
    @PostMapping("/categories")
    public ResponseEntity<TransactionCategory> createCategory(Authentication auth,
                                                              @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");
        String name = (String) body.get("categoryName");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Category name is required");
        }
        String trimmed = name.trim();
        if (transactionCategoryRepository.findByCategoryName(trimmed).isPresent()) {
            throw new IllegalArgumentException("Category '" + trimmed + "' already exists");
        }
        TransactionCategory cat = new TransactionCategory();
        cat.setCategoryName(trimmed);
        TransactionCategory saved = transactionCategoryRepository.save(cat);
        auditLogService.log((Long) auth.getCredentials(), auth.getName(),
                "CREATE_CATEGORY", "transaction_categories", (long) saved.getCategoryId(),
                "Created transaction category " + trimmed, Map.of("categoryName", trimmed));
        return ResponseEntity.ok(saved);
    }

    @CacheEvict(value = "cache:tx_types", allEntries = true)
    @PutMapping("/categories/{id}")
    public ResponseEntity<TransactionCategory> updateCategory(Authentication auth,
                                                              @PathVariable Integer id,
                                                              @RequestBody Map<String, Object> body) {
        permissionService.require(auth, "settings");
        TransactionCategory cat = transactionCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        String name = (String) body.get("categoryName");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Category name is required");
        }
        String trimmed = name.trim();
        transactionCategoryRepository.findByCategoryName(trimmed).ifPresent(existing -> {
            if (!existing.getCategoryId().equals(id)) {
                throw new IllegalArgumentException("Category '" + trimmed + "' already exists");
            }
        });
        cat.setCategoryName(trimmed);
        TransactionCategory saved = transactionCategoryRepository.save(cat);
        auditLogService.log((Long) auth.getCredentials(), auth.getName(),
                "UPDATE_CATEGORY", "transaction_categories", (long) saved.getCategoryId(),
                "Renamed transaction category to " + trimmed, Map.of("categoryName", trimmed));
        return ResponseEntity.ok(saved);
    }

    @CacheEvict(value = "cache:tx_types", allEntries = true)
    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(Authentication auth, @PathVariable Integer id) {
        permissionService.require(auth, "settings");
        TransactionCategory cat = transactionCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        long inUse = transactionRepository.countByCategoryId(id);
        if (inUse > 0) {
            throw new IllegalArgumentException("Cannot delete category '" + cat.getCategoryName()
                    + "' — it is used by " + inUse + " transaction(s)");
        }
        transactionCategoryRepository.delete(cat);
        auditLogService.log((Long) auth.getCredentials(), auth.getName(),
                "DELETE_CATEGORY", "transaction_categories", (long) id,
                "Deleted transaction category " + cat.getCategoryName(), Map.of("categoryName", cat.getCategoryName()));
        return ResponseEntity.noContent().build();
    }

    /** Batch-insert transactions via JDBC (converts OffsetDateTime→Timestamp for safety). */
    private void batchTxns(java.util.List<Transaction> list) {        if (list == null || list.isEmpty()) return;
        String sql = "INSERT INTO transactions (reference_number, type_id, source_account_id, target_account_id, amount, currency, status, description, transaction_date) VALUES (?,?,?,?,?,'USD','completed',?,?)";
        java.util.List<Object[]> batch = new java.util.ArrayList<>(list.size());
        for (Transaction t : list) {
            java.time.OffsetDateTime odt = t.getTransactionDate();
            java.sql.Timestamp ts = odt != null ? java.sql.Timestamp.from(odt.toInstant()) : null;
            batch.add(new Object[]{
                t.getReferenceNumber(), t.getTypeId(),
                t.getSourceAccountId(), t.getTargetAccountId(),
                t.getAmount(), t.getDescription(), ts
            });
        }
        jdbcTemplate.batchUpdate(sql, batch);
    }
}
