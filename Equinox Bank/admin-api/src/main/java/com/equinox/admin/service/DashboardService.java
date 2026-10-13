package com.equinox.admin.service;

import com.equinox.admin.dto.DashboardResponse;
import com.equinox.admin.dto.TransactionVolumeResponse;
import com.equinox.admin.repository.AccountRepository;
import com.equinox.admin.repository.CustomerRepository;
import com.equinox.admin.repository.LoanRepository;
import com.equinox.admin.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final LoanRepository loanRepository;
    private final TransactionRepository transactionRepository;

    public DashboardService(CustomerRepository customerRepository,
                            AccountRepository accountRepository,
                            LoanRepository loanRepository,
                            TransactionRepository transactionRepository) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.loanRepository = loanRepository;
        this.transactionRepository = transactionRepository;
    }

    public DashboardResponse getDashboard() {
        DashboardResponse res = new DashboardResponse();
        res.setTotalCustomers(customerRepository.count());
        res.setTotalDeposits(transactionRepository.sumCompletedDeposits());
        res.setTotalAccounts(accountRepository.countByStatus("active"));
        res.setPendingKycCount(customerRepository.countByKycStatus("pending"));
        res.setPendingLoansCount(loanRepository.countByStatus("pending"));
        res.setTotalTransactions(transactionRepository.count());
        return res;
    }

    public TransactionVolumeResponse getTransactionVolume(String range) {
        if (range == null) range = "weekly";
        OffsetDateTime since = switch (range) {
            case "today" -> OffsetDateTime.now().minusHours(24);
            case "monthly" -> OffsetDateTime.now().minusDays(30);
            default -> OffsetDateTime.now().minusDays(7);
        };

        List<Object[]> rows = transactionRepository.aggregateVolume(range, since);
        Map<String, TransactionVolumeResponse.VolumeBucket> bucketMap = new LinkedHashMap<>();
        BigDecimal depositsSum = BigDecimal.ZERO;
        BigDecimal withdrawalsSum = BigDecimal.ZERO;
        BigDecimal transfersSum = BigDecimal.ZERO;

        for (Object[] row : rows) {
            String type = (String) row[0];
            String label = (String) row[1];
            BigDecimal amount = (BigDecimal) row[2];

            switch (type) {
                case "deposit" -> depositsSum = depositsSum.add(amount);
                case "withdrawal" -> withdrawalsSum = withdrawalsSum.add(amount);
                case "transfer" -> transfersSum = transfersSum.add(amount);
            }

            if ("deposit".equals(type) || "transfer".equals(type)) {
                TransactionVolumeResponse.VolumeBucket bucket = bucketMap.computeIfAbsent(label, k -> {
                    TransactionVolumeResponse.VolumeBucket b = new TransactionVolumeResponse.VolumeBucket();
                    b.setLabel(k);
                    b.setDeposit(BigDecimal.ZERO);
                    b.setTransfer(BigDecimal.ZERO);
                    return b;
                });
                if ("deposit".equals(type)) {
                    bucket.setDeposit(bucket.getDeposit().add(amount));
                } else {
                    bucket.setTransfer(bucket.getTransfer().add(amount));
                }
            }
        }

        TransactionVolumeResponse res = new TransactionVolumeResponse();
        res.setDepositsSum(depositsSum);
        res.setWithdrawalsSum(withdrawalsSum);
        res.setTransfersSum(transfersSum);
        res.setBuckets(new ArrayList<>(bucketMap.values()));
        return res;
    }
}
