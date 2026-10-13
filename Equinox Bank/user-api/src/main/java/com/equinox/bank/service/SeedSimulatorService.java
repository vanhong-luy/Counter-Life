package com.equinox.bank.service;

import com.equinox.bank.dto.*;
import com.equinox.bank.entity.Account;
import com.equinox.bank.entity.Card;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.KycDocument;
import com.equinox.bank.entity.Loan;
import com.equinox.bank.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.*;

@Service
public class SeedSimulatorService {

    private final AuthService authService;
    private final AccountService accountService;
    private final TransactionService transactionService;
    private final CardService cardService;
    private final LoanService loanService;
    private final CreditCardService creditCardService;
    private final AdminService adminService;
    private final TimeSkipService timeSkipService;
    private final R2StorageService r2StorageService;
    private final CustomerRepository customerRepository;
    private final KycDocumentRepository kycDocumentRepository;
    private final LoanRepository loanRepository;
    private final AdminUserRepository adminUserRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final CardRepository cardRepository;
    private final CardStatusHistoryRepository cardStatusHistoryRepository;
    private final CreditLimitRequestRepository creditLimitRequestRepository;
    private final CardStatementRepository cardStatementRepository;
    private final CustomerBillRepository customerBillRepository;

    private static final List<String> BILLERS = List.of(
        "Electric Co.", "Water Utility", "Internet Provider", "Phone Company",
        "Insurance Ltd", "Streaming Services", "Gas Company", "HOA Fees");

    @Value("${seed.samples.dir:./simulator/samples}")
    private String samplesDir;

    private final ConcurrentHashMap<UUID, SeedJobState> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private static final String SAMPLE_PASSWORD = "Test@12345";
    private static final String ADMIN_EMAIL = "admin@equinox.com";
    private static final List<String> FIRST_NAMES = List.of(
        "James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda",
        "David","Elizabeth","William","Sarah","Joseph","Jessica","Thomas","Emily");
    private static final List<String> LAST_NAMES = List.of(
        "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
        "Rodriguez","Martinez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson");
    private static final List<String> CITIES = List.of(
        "New York, NY","Los Angeles, CA","Chicago, IL","Houston, TX",
        "Phoenix, AZ","San Diego, CA","Dallas, TX","Austin, TX");
    private static final List<String> MERCHANTS = List.of(
        "Walmart","Costco","Amazon","Starbucks","Netflix","Uber","Shell","Target","Best Buy","Home Depot");
    private static final List<String> ASSET_TYPES = List.of("property", "vehicle", "gold", "stock", "bond");
    private static final List<String> LOAN_TYPES = List.of("Personal", "Home", "Auto", "Education");
    private static final List<String> REFUND_REASONS = List.of(
        "Duplicate Charge Detected", "Incorrect Amount Charged", "Merchant Order Cancelled", "Unauthorized Transaction");

    public SeedSimulatorService(AuthService authService, AccountService accountService,
                                 TransactionService transactionService, CardService cardService,
                                 LoanService loanService, CreditCardService creditCardService,
                                 AdminService adminService, TimeSkipService timeSkipService,
                                 R2StorageService r2StorageService,
                                 CustomerRepository customerRepository,
                                 KycDocumentRepository kycDocumentRepository,
                                 LoanRepository loanRepository, AdminUserRepository adminUserRepository,
                                 AccountRepository accountRepository,
                                 TransactionRepository transactionRepository,
                                 CardRepository cardRepository,
                                 CardStatusHistoryRepository cardStatusHistoryRepository,
                                 CreditLimitRequestRepository creditLimitRequestRepository,
                                 CardStatementRepository cardStatementRepository,
                                 CustomerBillRepository customerBillRepository) {
        this.authService = authService;
        this.accountService = accountService;
        this.transactionService = transactionService;
        this.cardService = cardService;
        this.loanService = loanService;
        this.creditCardService = creditCardService;
        this.adminService = adminService;
        this.timeSkipService = timeSkipService;
        this.r2StorageService = r2StorageService;
        this.customerRepository = customerRepository;
        this.kycDocumentRepository = kycDocumentRepository;
        this.loanRepository = loanRepository;
        this.adminUserRepository = adminUserRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.cardRepository = cardRepository;
        this.cardStatusHistoryRepository = cardStatusHistoryRepository;
        this.creditLimitRequestRepository = creditLimitRequestRepository;
        this.cardStatementRepository = cardStatementRepository;
        this.customerBillRepository = customerBillRepository;
    }

    public UUID startSimulation(SeedSimulationRequest request) {
        UUID jobId = UUID.randomUUID();
        SeedJobState state = new SeedJobState();
        state.request = request;
        state.status = "running";
        jobs.put(jobId, state);

        executor.submit(() -> runSimulation(jobId, request, state));
        return jobId;
    }

    public Optional<SeedSimulationStatus> getStatus(UUID jobId) {
        SeedJobState state = jobs.get(jobId);
        if (state == null) return Optional.empty();

        SeedSimulationStatus status = new SeedSimulationStatus();
        status.setJobId(jobId);
        status.setStatus(state.status);
        status.setCurrentStep(state.currentStep);
        status.setCurrentItem(state.currentItem);
        status.setTotalItems(state.totalItems);
        status.setResult(state.result);
        status.setErrorMessage(state.errorMessage);
        return Optional.of(status);
    }

    private void runSimulation(UUID jobId, SeedSimulationRequest request, SeedJobState state) {
        SeedSimulationResult result = new SeedSimulationResult();
        long startTime = System.currentTimeMillis();
        Random rnd = new Random();

        // Load sample files from disk
        var fileCache = loadSamples();
        var kycGroups = fileCache.kycGroups;
        var photoFiles = fileCache.photoFiles;
        var collatFiles = fileCache.collatFiles;
        var uploadedKeys = new ConcurrentHashMap<String, String>();

        int userIdCounter = 1000000;

        try {
            // === Step 1: Register customers ===
            updateStep(state, "registering customers", 0, request.getBatchSize());
            List<SeedCustomer> customers = new ArrayList<>();
            for (int i = 0; i < request.getBatchSize(); i++) {
                String firstName = pick(FIRST_NAMES, rnd);
                String lastName = pick(LAST_NAMES, rnd);
                long num = System.currentTimeMillis() + rnd.nextInt(100000) + i;
                String email = "sim_" + num + "@seed.local";

                CustomerRegistrationRequestDTO regDto = new CustomerRegistrationRequestDTO(
                    firstName, lastName, email, SAMPLE_PASSWORD, null, null, pick(CITIES, rnd));

                CustomerResponseDTO registered = authService.registerCustomer(regDto);
                Customer customer = customerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found after registration"));

                customers.add(new SeedCustomer(email, customer));
                state.currentItem = i + 1;
            }
            result.setCustomers(customers.size());

            // Set random credit scores
            for (SeedCustomer sc : customers) {
                sc.customer.setCreditScore(300 + rnd.nextInt(551));
                customerRepository.save(sc.customer);
            }

            // === Step 2: Create KYC documents (real uploads with dedup) ===
            updateStep(state, "uploading KYC documents", 0, customers.size());
            int uid = userIdCounter;
            for (int i = 0; i < customers.size(); i++) {
                SeedCustomer sc = customers.get(i);
                int custId = uid + i;
                List<SampleFile> group = pick(kycGroups, rnd);
                String docType = group.isEmpty() ? "passport" : Paths.get(group.get(0).relativePath).getParent().getFileName().toString();

                String frontKey = null;
                String backKey = null;

                if (!group.isEmpty()) {
                    SampleFile front = group.get(0);
                    frontKey = uploadedKeys.computeIfAbsent(front.relativePath,
                        k -> r2StorageService.uploadFile(front.bytes, custId, front.filename, front.contentType));
                    if (group.size() > 1) {
                        SampleFile back = group.get(1);
                        backKey = uploadedKeys.computeIfAbsent(back.relativePath,
                            k -> r2StorageService.uploadFile(back.bytes, custId, back.filename, back.contentType));
                    }
                }

                KycDocument doc = new KycDocument();
                doc.setCustomer(sc.customer);
                doc.setDocumentType(docType);
                doc.setDocumentUrl(frontKey != null ? frontKey : "seed://kyc/" + docType + "/front");
                if (backKey != null) doc.setDocumentUrlBack(backKey);
                doc.setStatus("pending");
                kycDocumentRepository.save(doc);
                state.currentItem = i + 1;
            }
            result.setKycDocuments(customers.size());

            // === Step 3: Profile photos (first 20, real uploads with dedup) ===
            int photoCount = Math.min(20, customers.size());
            updateStep(state, "uploading profile photos", 0, photoCount);
            for (int i = 0; i < photoCount; i++) {
                SeedCustomer sc = customers.get(i);
                int custId = uid + i;
                if (sc.customer.getProfilePhotoUrl() != null) continue;
                if (photoFiles.isEmpty()) {
                    sc.customer.setProfilePhotoUrl("seed://profile/" + sc.customer.getCustomerId());
                } else {
                    SampleFile photo = pick(photoFiles, rnd);
                    String key = uploadedKeys.computeIfAbsent(photo.relativePath,
                        k -> r2StorageService.uploadFile(photo.bytes, custId, photo.filename, photo.contentType));
                    sc.customer.setProfilePhotoUrl(key);
                }
                customerRepository.save(sc.customer);
                state.currentItem = i + 1;
            }

            // === Step 4: Approve/Reject KYC (70% approved, 10% rejected, 20% pending) ===
            updateStep(state, "reviewing KYC documents", 0, customers.size());
            List<KycDocument> pendingDocs = kycDocumentRepository.findAll().stream()
                .filter(d -> d.getStatus() == null || "pending".equals(d.getStatus()))
                .limit(customers.size())
                .toList();
            int kycApproved = 0;
            for (int i = 0; i < pendingDocs.size(); i++) {
                KycDocument doc = pendingDocs.get(i);
                double roll = rnd.nextDouble();
                String kycStatus;
                double kycApprove = request.getKycApproveRate() / 100.0;
                double kycReject = kycApprove + request.getKycRejectRate() / 100.0;
                if (roll < kycApprove) {
                    kycStatus = "approved";
                    kycApproved++;
                } else if (roll < kycReject) {
                    kycStatus = "rejected";
                } else {
                    kycStatus = "pending";
                }
                adminService.reviewKyc(doc.getDocumentId(), ADMIN_EMAIL,
                    new KycReviewRequestDTO(kycStatus, "Auto-" + kycStatus + " via seed simulator"));
                // Mark seed customer for pipeline eligibility
                customers.get(i).kycApproved = "approved".equals(kycStatus);
                state.currentItem = i + 1;
            }

            // === Step 5: Create checking accounts (only KYC-approved) ===
            int kycOkCount = (int) customers.stream().filter(c -> c.kycApproved).count();
            updateStep(state, "creating checking accounts", 0, kycOkCount);
            int stepIdx = 0;
            for (int i = 0; i < customers.size(); i++) {
                SeedCustomer sc = customers.get(i);
                if (!sc.kycApproved) continue;
                try {
                    AccountCreationRequestDTO acctDto = new AccountCreationRequestDTO(2, "Everyday Checking", null, null, null, null, null);
                    AccountResponseDTO checking = accountService.createAccount(sc.email, acctDto);
                    sc.checkingId = checking.accountId();
                    result.setAccounts(result.getAccounts() + 1);

                    if (rnd.nextInt(100) < request.getSavingsAccountRate()) {
                        AccountCreationRequestDTO savingsDto = new AccountCreationRequestDTO(1, "High Yield Savings", null, null, null, null, null);
                        AccountResponseDTO savings = accountService.createAccount(sc.email, savingsDto);
                        sc.savingsId = savings.accountId();
                        result.setAccounts(result.getAccounts() + 1);
                    }
                    // Fixed Deposit (funded from checking after deposit step)
                } catch (Exception ignored) {}
                stepIdx++;
                state.currentItem = stepIdx;
            }

            // === Step 6: Deposit initial funds ===
            updateStep(state, "depositing initial funds", 0, customers.size());
            for (int i = 0; i < customers.size(); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.checkingId == null) continue;
                BigDecimal amount = BigDecimal.valueOf(1000 + rnd.nextDouble() * 9000).setScale(2, java.math.RoundingMode.HALF_UP);
                transactionService.deposit(sc.email,
                    new DepositWithdrawRequestDTO(sc.checkingId, amount, null, "Initial deposit", null));
                result.setDeposits(result.getDeposits() + 1);
                state.currentItem = i + 1;
            }

            // === Step 7: Fixed deposits (configurable rate) ===
            int fdRate = request.getFixedDepositRate();
            int fdCount = (int) (kycOkCount * fdRate / 100.0);
            updateStep(state, "opening fixed deposits", 0, fdCount);
            int fdIdx = 0;
            for (int i = 0; i < customers.size() && fdIdx < fdCount; i++) {
                SeedCustomer sc = customers.get(i);
                if (!sc.kycApproved || sc.checkingId == null) continue;
                try {
                    BigDecimal fdAmount = BigDecimal.valueOf(500 + rnd.nextDouble() * 3000).setScale(2, java.math.RoundingMode.HALF_UP);
                    String disposition = rnd.nextBoolean() ? "REINVEST" : "TRANSFER_TO_PRIMARY";
                    AccountCreationRequestDTO fdDto = new AccountCreationRequestDTO(3, "Fixed Deposit", fdAmount, sc.checkingId, disposition, 12, null);
                    AccountResponseDTO fd = accountService.createAccount(sc.email, fdDto);
                    result.setAccounts(result.getAccounts() + 1);
                } catch (Exception ignored) {}
                fdIdx++;
                state.currentItem = fdIdx;
            }

            // === Step 8: Withdrawals ===
            int withdrawalCount = (int) (customers.size() * request.getWithdrawalRate() / 100.0);
            updateStep(state, "processing withdrawals", 0, withdrawalCount);
            for (int i = 0; i < Math.min(withdrawalCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.checkingId == null) continue;
                int wCount = 1 + rnd.nextInt(2);
                    for (int w = 0; w < wCount; w++) {
                        try {
                            BigDecimal amt = BigDecimal.valueOf(40 + rnd.nextDouble() * 160).setScale(2, java.math.RoundingMode.HALF_UP);
                            transactionService.withdraw(sc.email,
                                new DepositWithdrawRequestDTO(sc.checkingId, amt, null, "ATM Withdrawal", null));
                            result.setWithdrawals(result.getWithdrawals() + 1);
                        } catch (Exception ignored) {}
                    }
                state.currentItem = i + 1;
            }

            // === Step 9: Transfers ===
            int transferCount = (int) (customers.size() * request.getTransferRate() / 100.0);
            updateStep(state, "processing transfers", 0, transferCount);
            for (int i = 0; i < Math.min(transferCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.checkingId == null || sc.savingsId == null) continue;
                int tCount = 1 + rnd.nextInt(3);
                for (int t = 0; t < tCount; t++) {
                    try {
                        BigDecimal amt = BigDecimal.valueOf(50 + rnd.nextDouble() * 450).setScale(2, java.math.RoundingMode.HALF_UP);
                        Long from = rnd.nextBoolean() ? sc.checkingId : sc.savingsId;
                        Long to = from.equals(sc.checkingId) ? sc.savingsId : sc.checkingId;
                        transactionService.transfer(sc.email,
                            new TransferRequestDTO(from, to, amt, null, "Transfer between accounts", false, null, null));
                        result.setTransfers(result.getTransfers() + 1);
                    } catch (Exception ignored) {}
                }
                state.currentItem = i + 1;
            }

            // === Step 10: Issue debit cards ===
            updateStep(state, "issuing debit cards", 0, customers.size());
            for (int i = 0; i < customers.size(); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.checkingId == null) continue;
                try {
                    CardResponseDTO card = cardService.issueCard(sc.email, new CardIssueRequestDTO(1, sc.checkingId, null, null));
                    sc.cardId = card.cardId();
                    result.setCards(result.getCards() + 1);
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 11: Issue credit cards (configurable rate) ===
            int ccIssueCount = (int) (customers.size() * request.getCreditCardRate() / 100.0);
            updateStep(state, "issuing credit cards", 0, ccIssueCount);
            for (int i = 0; i < Math.min(ccIssueCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.checkingId == null) continue;
                try {
                    int creditTypeId = rnd.nextBoolean() ? 2 : 4;
                    CardResponseDTO card = cardService.issueCard(sc.email, new CardIssueRequestDTO(creditTypeId, sc.checkingId, null, null));
                    sc.creditCardId = card.cardId();
                    result.setCards(result.getCards() + 1);
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 11b: Card status history (freeze/unfreeze some cards) ===
            int statusChangeCount = (int) (customers.size() * 0.1);
            updateStep(state, "creating card status history", 0, statusChangeCount);
            int statusIdx = 0;
            for (int i = 0; i < customers.size() && statusIdx < statusChangeCount; i++) {
                SeedCustomer sc = customers.get(i);
                List<com.equinox.bank.entity.Card> custCards = cardRepository.findByAccountIn(accountRepository.findByCustomer(sc.customer));
                if (custCards.isEmpty()) continue;
                com.equinox.bank.entity.Card targetCard = custCards.get(rnd.nextInt(custCards.size()));
                try {
                    com.equinox.bank.entity.CardStatusHistory hist = new com.equinox.bank.entity.CardStatusHistory();
                    hist.setCard(targetCard);
                    hist.setOldStatus("active");
                    hist.setNewStatus("frozen");
                    hist.setChangedByCustomer(sc.customer);
                    hist.setChangedAt(java.time.LocalDateTime.now().minusDays(rnd.nextInt(30)));
                    cardStatusHistoryRepository.save(hist);

                    com.equinox.bank.entity.CardStatusHistory hist2 = new com.equinox.bank.entity.CardStatusHistory();
                    hist2.setCard(targetCard);
                    hist2.setOldStatus("frozen");
                    hist2.setNewStatus("active");
                    hist2.setChangedByCustomer(sc.customer);
                    hist2.setChangedAt(java.time.LocalDateTime.now().minusDays(rnd.nextInt(15)));
                    cardStatusHistoryRepository.save(hist2);

                    result.setCardStatusChanges(result.getCardStatusChanges() + 2);
                } catch (Exception ignored) {}
                statusIdx++;
                state.currentItem = statusIdx;
            }

            // === Step 11c: Credit limit increase requests ===
            int reqCount = (int) (customers.size() * 0.2);
            updateStep(state, "creating credit limit increase requests", 0, reqCount);
            int reqIdx = 0;
            List<com.equinox.bank.entity.Card> allCreditCards = cardRepository.findByCreditLimitIsNotNull();
            for (int i = 0; i < Math.min(reqCount, allCreditCards.size()); i++) {
                com.equinox.bank.entity.Card cc = allCreditCards.get(i);
                try {
                    com.equinox.bank.entity.CreditLimitRequest req = new com.equinox.bank.entity.CreditLimitRequest();
                    req.setCard(cc);
                    req.setCurrentLimit(cc.getCreditLimit());
                    BigDecimal increase = BigDecimal.valueOf(1000 + rnd.nextDouble() * 9000).setScale(2, java.math.RoundingMode.HALF_UP);
                    req.setRequestedLimit(cc.getCreditLimit().add(increase));
                    req.setReason("Automatic seed request for higher limit");
                    double roll = rnd.nextDouble();
                    if (roll < 0.5) {
                        req.setStatus("PENDING");
                    } else if (roll < 0.8) {
                        req.setStatus("APPROVED");
                        cc.setCreditLimit(req.getRequestedLimit());
                        cardRepository.save(cc);
                    } else {
                        req.setStatus("REJECTED");
                    }
                    req.setCreatedAt(java.time.OffsetDateTime.now().minusDays(rnd.nextInt(30)));
                    creditLimitRequestRepository.save(req);
                    result.setCreditRequests(result.getCreditRequests() + 1);
                } catch (Exception ignored) {}
                reqIdx++;
                state.currentItem = reqIdx;
            }

            // === Step 11d: Debit card purchases ===
            if (!request.isSkipCardPurchases()) {
                updateStep(state, "simulating card purchases", 0, customers.size());
                for (int i = 0; i < customers.size(); i++) {
                    SeedCustomer sc = customers.get(i);
                    if (sc.cardId == null) continue;
                    int txCount = 2 + rnd.nextInt(6);
                    for (int p = 0; p < txCount; p++) {
                        try {
                            BigDecimal amt = BigDecimal.valueOf(3 + rnd.nextDouble() * 150).setScale(2, java.math.RoundingMode.HALF_UP);
                            cardService.simulatePurchase(sc.email, sc.cardId,
                                new CardPurchaseRequestDTO(amt, pick(MERCHANTS, rnd), "Card purchase",
                                    rnd.nextBoolean(), false));
                            result.setPurchases(result.getPurchases() + 1);
                        } catch (Exception ignored) {}
                    }
                    state.currentItem = i + 1;
                }
            }

            // === Step 12: Credit card purchases ===
            if (!request.isSkipCardPurchases()) {
                int ccCustCount = (int) (customers.size() * 0.3);
                updateStep(state, "simulating credit card purchases", 0, ccCustCount);
                for (int i = 0; i < Math.min(ccCustCount, customers.size()); i++) {
                    SeedCustomer sc = customers.get(i);
                    if (sc.creditCardId == null) continue;
                    int txCount = 1 + rnd.nextInt(3);
                    for (int p = 0; p < txCount; p++) {
                        try {
                            BigDecimal amt = BigDecimal.valueOf(20 + rnd.nextDouble() * 300).setScale(2, java.math.RoundingMode.HALF_UP);
                            cardService.simulatePurchase(sc.email, sc.creditCardId,
                                new CardPurchaseRequestDTO(amt, pick(MERCHANTS, rnd), "Credit card purchase",
                                    rnd.nextBoolean(), false));
                            result.setPurchases(result.getPurchases() + 1);
                        } catch (Exception ignored) {}
                    }
                    state.currentItem = i + 1;
                }
            }

            // === Step 13: Apply for loans ===
            int loanCount = (int) (customers.size() * request.getLoanApplyRate() / 100.0);
            updateStep(state, "applying for loans", 0, loanCount);
            List<SeedLoan> seedLoans = new ArrayList<>();
            for (int i = 0; i < Math.min(loanCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                try {
                    String loanType = pick(LOAN_TYPES, rnd);
                    int loanTypeId = switch (loanType) {
                        case "Personal" -> 1; case "Home" -> 2; case "Auto" -> 3; default -> 4;
                    };
                    BigDecimal principal = BigDecimal.valueOf(5000 + rnd.nextDouble() * 45000).setScale(2, java.math.RoundingMode.HALF_UP);
                    BigDecimal rate = BigDecimal.valueOf(3.5 + rnd.nextDouble() * 6).setScale(2, java.math.RoundingMode.HALF_UP);
                    int term = 12 + rnd.nextInt(48);

                    LoanResponseDTO loan = loanService.applyForLoan(sc.email,
                        new LoanApplicationRequestDTO(loanTypeId, principal, rate, term, null));
                    seedLoans.add(new SeedLoan(loan.loanId(), sc, loan.principalAmount()));
                    result.setLoans(result.getLoans() + 1);
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 14: Add collateral ===
            int collatCount = (int) (seedLoans.size() * request.getCollateralRate() / 100.0);
            updateStep(state, "adding collateral", 0, collatCount);
            for (int i = 0; i < Math.min(collatCount, seedLoans.size()); i++) {
                SeedLoan sl = seedLoans.get(i);
                int custId = uid + i;
                try {
                    String proofUrl;
                    if (collatFiles.isEmpty()) {
                        proofUrl = "seed://collateral/" + pick(ASSET_TYPES, rnd);
                    } else {
                        SampleFile collatFile = pick(collatFiles, rnd);
                        proofUrl = uploadedKeys.computeIfAbsent(collatFile.relativePath,
                            k -> r2StorageService.uploadFile(collatFile.bytes, custId, collatFile.filename, collatFile.contentType));
                    }
                    loanService.addCollateral(sl.customer.email, sl.loanId,
                        new CollateralRequestDTO(pick(ASSET_TYPES, rnd),
                            BigDecimal.valueOf(10000 + rnd.nextDouble() * 90000).setScale(2, java.math.RoundingMode.HALF_UP),
                            proofUrl));
                    result.setCollaterals(result.getCollaterals() + 1);
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 15: Approve/Reject loans ===
            updateStep(state, "reviewing loans", 0, seedLoans.size());
            for (int i = 0; i < seedLoans.size(); i++) {
                SeedLoan sl = seedLoans.get(i);
                double roll = rnd.nextDouble();
                double loanApprove = request.getLoanApproveRate() / 100.0;
                double loanReject = loanApprove + request.getLoanRejectRate() / 100.0;
                String loanStatus;
                if (roll < loanApprove) {
                    loanStatus = "approved";
                    sl.approved = true;
                } else if (roll < loanReject) {
                    loanStatus = "rejected";
                } else {
                    loanStatus = "pending";
                }
                try {
                    adminService.approveRejectLoan(sl.loanId, ADMIN_EMAIL,
                        new LoanApprovalRequestDTO(loanStatus, "Auto-" + loanStatus + " via seed simulator"));
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 16: Request refunds ===
            int refundCount = (int) (customers.size() * request.getRefundRate() / 100.0);
            updateStep(state, "requesting refunds", 0, refundCount);
            for (int i = 0; i < Math.min(refundCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                try {
                    var accts = accountRepository.findByCustomer(sc.customer);
                    if (accts.isEmpty()) continue;
                    var acct = accts.get(0);
                    var txs = transactionRepository.findBySourceAccountOrTargetAccount(acct, acct);
                    if (txs.isEmpty()) continue;
                    var tx = txs.get(rnd.nextInt(txs.size()));
                    BigDecimal refundAmt = tx.getAmount().multiply(BigDecimal.valueOf(0.2 + rnd.nextDouble() * 0.6))
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                    transactionService.refund(sc.email, tx.getTransactionId(),
                        new RefundRequestDTO(refundAmt, pick(REFUND_REASONS, rnd), "Auto-generated seed refund"));
                    result.setRefunds(result.getRefunds() + 1);
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 17: Loan repayments (only approved loans, varied) ===
            List<SeedLoan> approvedLoans = seedLoans.stream().filter(sl -> sl.approved).toList();
            updateStep(state, "making loan repayments", 0, approvedLoans.size());
            for (int i = 0; i < approvedLoans.size(); i++) {
                SeedLoan sl = approvedLoans.get(i);
                double roll = rnd.nextDouble();
                double repayFull = request.getRepayFullRate() / 100.0;
                double repayPartial = repayFull + request.getRepayPartialRate() / 100.0;
                if (roll < repayFull) {
                    // Fully repay: lump sum close to principal
                    BigDecimal repayAmt = sl.principalAmount.multiply(BigDecimal.valueOf(0.95 + rnd.nextDouble() * 0.05))
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                    try {
                        var accts = accountRepository.findByCustomer(sl.customer.customer);
                        BigDecimal amtFinal = repayAmt;
                        var src = accts.stream()
                            .filter(a -> a.getBalance().compareTo(amtFinal) > 0)
                            .findFirst();
                        Long acctId = src.map(Account::getAccountId).orElse(sl.customer.checkingId);
                        if (acctId != null) {
                            loanService.repayLoan(sl.customer.email, sl.loanId,
                                new LoanRepaymentRequestDTO(amtFinal), acctId);
                            result.setRepayments(result.getRepayments() + 1);
                        }
                    } catch (Exception ignored) {}
                } else if (roll < repayPartial) {
                    // Partial repayments: 2-3 small payments
                    int rCount = 2 + rnd.nextInt(2);
                    for (int r = 0; r < rCount; r++) {
                        try {
                            var accts = accountRepository.findByCustomer(sl.customer.customer);
                            var src = accts.stream()
                                .filter(a -> !a.getAccountId().equals(sl.customer.checkingId) && a.getBalance().compareTo(BigDecimal.valueOf(100)) > 0)
                                .findFirst();
                            Long acctId = src.map(Account::getAccountId).orElse(sl.customer.checkingId);
                            if (acctId != null) {
                                BigDecimal repayAmt = BigDecimal.valueOf(50 + rnd.nextDouble() * 200).setScale(2, java.math.RoundingMode.HALF_UP);
                                loanService.repayLoan(sl.customer.email, sl.loanId,
                                    new LoanRepaymentRequestDTO(repayAmt), acctId);
                                result.setRepayments(result.getRepayments() + 1);
                            }
                        } catch (Exception ignored) {}
                    }
                }
                // else: 30% get no repayments (stay active with full balance)
                state.currentItem = i + 1;
            }

            // === Step 18: Pay credit cards ===
            int ccPayCount = (int) (customers.size() * request.getCreditPayRate() / 100.0);
            updateStep(state, "paying credit cards", 0, ccPayCount);
            for (int i = 0; i < Math.min(ccPayCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                try {
                    var accts = accountRepository.findByCustomer(sc.customer);
                    var creditCards = cardRepository.findByAccountIn(accts).stream()
                        .filter(c -> c.getCreditLimit() != null)
                        .toList();
                    if (creditCards.isEmpty()) continue;
                    Card creditCard = creditCards.get(rnd.nextInt(creditCards.size()));
                    var src = accts.stream()
                        .filter(a -> a.getBalance().compareTo(BigDecimal.valueOf(200)) > 0)
                        .findFirst();
                    if (src.isPresent()) {
                        Long srcId = src.get().getAccountId();
                        BigDecimal amt = BigDecimal.valueOf(50 + rnd.nextDouble() * 500).setScale(2, java.math.RoundingMode.HALF_UP);
                        creditCardService.payCard(creditCard.getCardId(), sc.email, srcId, amt);
                        result.setCreditPayments(result.getCreditPayments() + 1);
                    }
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 19: Bill payments ===
            int billCount = (int) (customers.size() * 0.3);
            updateStep(state, "creating bill payments", 0, billCount);
            for (int i = 0; i < Math.min(billCount, customers.size()); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.checkingId == null) continue;
                try {
                    com.equinox.bank.entity.CustomerBill bill = new com.equinox.bank.entity.CustomerBill();
                    bill.setCustomer(sc.customer);
                    bill.setBillerName(pick(BILLERS, rnd));
                    bill.setBillType("UTILITY");
                    bill.setAmount(BigDecimal.valueOf(30 + rnd.nextDouble() * 200).setScale(2, java.math.RoundingMode.HALF_UP));
                    bill.setDueDate(java.time.LocalDate.now().plusDays(5 + rnd.nextInt(25)));
                    bill.setFrequency("MONTHLY");
                    bill.setAutoPay(rnd.nextBoolean());
                    com.equinox.bank.entity.Account srcAcct = accountRepository.findById(sc.checkingId).orElse(null);
                    if (srcAcct != null) bill.setSourceAccount(srcAcct);
                    bill.setStatus("ACTIVE");
                    customerBillRepository.save(bill);
                    result.setBillPayments(result.getBillPayments() + 1);
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }

            // === Step 20: Credit card statements ===
            updateStep(state, "generating credit card statements", 0, customers.size());
            int stmtCount = 0;
            for (int i = 0; i < customers.size(); i++) {
                SeedCustomer sc = customers.get(i);
                if (sc.creditCardId == null) continue;
                try {
                    com.equinox.bank.entity.Card cc = cardRepository.findById(sc.creditCardId).orElse(null);
                    if (cc != null) {
                        creditCardService.generateStatementsForCards(List.of(cc), java.time.LocalDate.now().minusDays(1));
                        stmtCount++;
                    }
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }
            result.setCardStatements(stmtCount);

            // === Step 21: Time skip ===
            updateStep(state, "accruing interest (time skip)", 0, customers.size());
            int totalInterestTx = 0;
            for (int i = 0; i < customers.size(); i++) {
                SeedCustomer sc = customers.get(i);
                try {
                    TimeSkipService.SimulationResult simResult = timeSkipService.simulate(sc.email, 3);
                    totalInterestTx += simResult.transactionsCreated();
                } catch (Exception ignored) {}
                state.currentItem = i + 1;
            }
            result.setInterestTransactions(totalInterestTx);

            result.setTimeTakenMs(System.currentTimeMillis() - startTime);
            state.status = "done";
            state.result = result;

        } catch (Exception e) {
            state.status = "error";
            state.errorMessage = e.getMessage() + " - " + Arrays.toString(e.getStackTrace()).substring(0, 500);
            result.setTimeTakenMs(System.currentTimeMillis() - startTime);
            state.result = result;
        }
    }

    private void updateStep(SeedJobState state, String step, int current, int total) {
        state.currentStep = step;
        state.currentItem = current;
        state.totalItems = total;
    }

    @SuppressWarnings("unchecked")
    private static <T> T pick(List<T> list, Random rnd) {
        return list.get(rnd.nextInt(list.size()));
    }

    private SampleFiles loadSamples() {
        Path base = Paths.get(samplesDir);
        List<List<SampleFile>> kycGroups = new ArrayList<>();
        List<SampleFile> photoFiles = new ArrayList<>();
        List<SampleFile> collatFiles = new ArrayList<>();

        try {
            Path kycDir = base.resolve("kyc");
            if (Files.isDirectory(kycDir)) {
                try (var types = Files.list(kycDir)) {
                    types.filter(Files::isDirectory).forEach(typeDir -> {
                        List<SampleFile> group = new ArrayList<>();
                        try (var files = Files.list(typeDir)) {
                            files.filter(f -> !f.getFileName().toString().startsWith("."))
                                .sorted().forEach(f -> {
                                    try {
                                        group.add(loadFile(f));
                                    } catch (IOException ignored) {}
                                });
                        } catch (IOException ignored) {}
                        if (!group.isEmpty()) kycGroups.add(group);
                    });
                }
            }
        } catch (IOException ignored) {}

        try {
            Path photoDir = base.resolve("profile-photos");
            if (Files.isDirectory(photoDir)) {
                try (var files = Files.list(photoDir)) {
                    files.filter(f -> !f.getFileName().toString().startsWith("."))
                        .forEach(f -> { try { photoFiles.add(loadFile(f)); } catch (IOException ignored) {} });
                }
            }
        } catch (IOException ignored) {}

        try {
            Path collatDir = base.resolve("collateral");
            if (Files.isDirectory(collatDir)) {
                try (var files = Files.list(collatDir)) {
                    files.filter(f -> !f.getFileName().toString().startsWith("."))
                        .forEach(f -> { try { collatFiles.add(loadFile(f)); } catch (IOException ignored) {} });
                }
            }
        } catch (IOException ignored) {}

        return new SampleFiles(kycGroups, photoFiles, collatFiles);
    }

    private SampleFile loadFile(Path filePath) throws IOException {
        String relativePath = Paths.get(samplesDir).relativize(filePath).toString().replace("\\", "/");
        String filename = filePath.getFileName().toString();
        byte[] bytes = Files.readAllBytes(filePath);
        String ext = filename.contains(".") ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase() : "bin";
        String mime = switch (ext) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "pdf" -> "application/pdf";
            default -> "application/octet-stream";
        };
        return new SampleFile(relativePath, bytes, filename, mime);
    }

    private record SampleFile(String relativePath, byte[] bytes, String filename, String contentType) {}
    private record SampleFiles(List<List<SampleFile>> kycGroups, List<SampleFile> photoFiles, List<SampleFile> collatFiles) {}

    private static class SeedJobState {
        SeedSimulationRequest request;
        String status;
        String currentStep;
        int currentItem;
        int totalItems;
        SeedSimulationResult result;
        String errorMessage;
    }

    private static class SeedCustomer {
        final String email;
        final Customer customer;
        boolean kycApproved;
        Long checkingId;
        Long savingsId;
        Long cardId;
        Long creditCardId;

        SeedCustomer(String email, Customer customer) {
            this.email = email;
            this.customer = customer;
        }
    }

    private static class SeedLoan {
        final Long loanId;
        final SeedCustomer customer;
        final BigDecimal principalAmount;
        boolean approved;

        SeedLoan(Long loanId, SeedCustomer customer, BigDecimal principalAmount) {
            this.loanId = loanId;
            this.customer = customer;
            this.principalAmount = principalAmount;
        }
    }
}
