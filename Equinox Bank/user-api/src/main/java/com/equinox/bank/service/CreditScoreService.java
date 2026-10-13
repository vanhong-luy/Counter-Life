package com.equinox.bank.service;

import com.equinox.bank.entity.*;
import com.equinox.bank.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class CreditScoreService {

    private static final Logger log = LoggerFactory.getLogger(CreditScoreService.class);

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final TransactionRepository transactionRepository;
    private final CollateralRepository collateralRepository;

    public CreditScoreService(CustomerRepository customerRepository,
                              AccountRepository accountRepository,
                              CardRepository cardRepository,
                              LoanRepository loanRepository,
                              LoanRepaymentRepository loanRepaymentRepository,
                              TransactionRepository transactionRepository,
                              CollateralRepository collateralRepository) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.loanRepository = loanRepository;
        this.loanRepaymentRepository = loanRepaymentRepository;
        this.transactionRepository = transactionRepository;
        this.collateralRepository = collateralRepository;
    }

    @Scheduled(cron = "0 0 4 1 * ?")
    @Transactional
    public void recalculateAllScores() {
        log.info("Starting monthly credit score recalculation");
        List<Customer> customers = customerRepository.findAll();
        for (Customer c : customers) {
            int score = calculateScore(c);
            c.setCreditScore(score);
            customerRepository.save(c);
        }
        log.info("Credit scores updated for {} customers", customers.size());
    }

    @Transactional
    public void recalculateScore(Customer customer) {
        int score = calculateScore(customer);
        customer.setCreditScore(score);
        customerRepository.save(customer);
    }

    public int calculateScore(Customer customer) {
        int score = 300;

        // 1. KYC verification (+80)
        if ("approved".equalsIgnoreCase(customer.getKycStatus())) {
            score += 80;
        }

        List<Account> accounts = accountRepository.findByCustomer(customer);
        boolean hasLoans = false;
        boolean hasCreditCards = false;
        BigDecimal totalBalance = BigDecimal.ZERO;

        // 2. Account age — longest-held account (up to 10 years = +100)
        if (!accounts.isEmpty()) {
            long maxAgeMonths = accounts.stream()
                    .filter(a -> a.getCreatedAt() != null)
                    .mapToLong(a -> ChronoUnit.MONTHS.between(a.getCreatedAt().toLocalDate(), LocalDate.now()))
                    .max().orElse(0);
            score += (int) Math.min(maxAgeMonths, 120);
        }

        // 3. Healthy balances — total across accounts > $1000 (+30)
        for (Account a : accounts) {
            totalBalance = totalBalance.add(a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO);
        }
        if (totalBalance.compareTo(BigDecimal.valueOf(1000)) >= 0) {
            score += 30;
        }

        // 4. DTI — Debt-to-Income ratio
        if (!accounts.isEmpty()) {
            OffsetDateTime threeMonthsAgo = OffsetDateTime.now().minusMonths(3);
            BigDecimal monthlyIncome = transactionRepository.sumDepositsSince(accounts, threeMonthsAgo)
                    .divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            BigDecimal monthlyDebt = transactionRepository.sumDebtPaymentsSince(accounts, threeMonthsAgo)
                    .divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);

            if (monthlyIncome.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal dti = monthlyDebt.divide(monthlyIncome, 4, RoundingMode.HALF_UP);
                if (dti.compareTo(BigDecimal.valueOf(0.36)) < 0) {
                    score += 40; // Low DTI
                } else if (dti.compareTo(BigDecimal.valueOf(0.43)) > 0) {
                    score -= 30; // High DTI
                }
            }
        }

        // 5. Loans
        List<Loan> loans = loanRepository.findByCustomer(customer);
        for (Loan loan : loans) {
            hasLoans = true;
            List<LoanRepayment> repayments = loanRepaymentRepository.findByLoan(loan);
            long paymentCount = repayments.size();
            score += (int) Math.min(paymentCount * 5, 100);
            if (loan.getOutstandingBalance() != null
                    && loan.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0) {
                score -= 50;
            }
        }

        // 6. LTV — Loan-to-Value ratio
        if (!loans.isEmpty()) {
            List<Collateral> collaterals = collateralRepository.findByLoanIn(loans);
            if (!collaterals.isEmpty()) {
                BigDecimal totalLoanBalance = loans.stream()
                        .map(Loan::getOutstandingBalance)
                        .filter(b -> b != null)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalCollateralValue = collaterals.stream()
                        .map(Collateral::getEstimatedValue)
                        .filter(v -> v != null)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (totalCollateralValue.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal ltv = totalLoanBalance.divide(totalCollateralValue, 4, RoundingMode.HALF_UP);
                    if (ltv.compareTo(BigDecimal.valueOf(0.8)) < 0) {
                        score += 30; // Low LTV
                    } else if (ltv.compareTo(BigDecimal.valueOf(1.0)) > 0) {
                        score -= 50; // Over 100% LTV
                    }
                }
            }
        }

        // 7. Credit cards
        for (Account acct : accounts) {
            List<Card> cards = cardRepository.findByAccount(acct);
            for (Card card : cards) {
                if (card.getCreditLimit() == null) continue;
                hasCreditCards = true;
                if (card.getCreditLimit().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal utilization = card.getOutstandingBalance()
                            .divide(card.getCreditLimit(), 4, RoundingMode.HALF_UP);
                    if (utilization.compareTo(BigDecimal.valueOf(0.3)) < 0) {
                        score += 60;
                    } else if (utilization.compareTo(BigDecimal.valueOf(0.5)) > 0) {
                        score -= 40;
                    }
                }
            }
        }

        // 8. Credit mix — having both loans AND credit cards (+40)
        if (hasLoans && hasCreditCards) {
            score += 40;
        }

        return Math.max(300, Math.min(850, score));
    }
}
