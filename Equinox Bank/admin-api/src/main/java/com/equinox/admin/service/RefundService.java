package com.equinox.admin.service;

import com.equinox.admin.dto.RefundBatchReviewRequest;
import com.equinox.admin.dto.RefundResponse;
import com.equinox.admin.dto.RefundReviewRequest;
import com.equinox.admin.entity.Account;
import com.equinox.admin.entity.Refund;
import com.equinox.admin.entity.Transaction;
import com.equinox.admin.entity.TransactionType;
import com.equinox.admin.repository.AccountRepository;
import com.equinox.admin.repository.RefundRepository;
import com.equinox.admin.repository.TransactionRepository;
import com.equinox.admin.repository.TransactionTypeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RefundService {

    private final RefundRepository refundRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final TransactionTypeRepository transactionTypeRepository;

    public RefundService(RefundRepository refundRepository,
                         TransactionRepository transactionRepository,
                         AccountRepository accountRepository,
                         TransactionTypeRepository transactionTypeRepository) {
        this.refundRepository = refundRepository;
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.transactionTypeRepository = transactionTypeRepository;
    }

    public List<RefundResponse> getAllRefunds() {
        return refundRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<RefundResponse> getPendingRefunds() {
        return refundRepository.findByStatus("pending").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getRefundsPage(String status, int page, int size) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        Page<Refund> result;
        if (status != null && !"all".equalsIgnoreCase(status) && !status.isBlank()) {
            result = refundRepository.findByStatusOrderByRefundIdDesc(status, pageable);
        } else {
            result = refundRepository.findAllByOrderByRefundIdDesc(pageable);
        }
        List<RefundResponse> items = result.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("items", items);
        body.put("totalItems", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        body.put("page", page);
        body.put("size", size);
        return body;
    }

    @Transactional
    public void reviewRefund(Long refundId, RefundReviewRequest request, Long adminId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));

        if (!"pending".equals(refund.getStatus())) {
            throw new RuntimeException("Refund is already reviewed");
        }

        refund.setRemarks(request.getRemarks());
        refund.setAdminId(adminId);
        refund.setReviewedAt(OffsetDateTime.now());

        if ("completed".equals(request.getStatus())) {
            executeRefund(refund);
        } else {
            refund.setStatus("rejected");
            refundRepository.save(refund);
        }
    }

    @Transactional
    public List<Long> batchReviewRefunds(List<RefundBatchReviewRequest> items, Long adminId) {
        List<Long> ids = items.stream().map(RefundBatchReviewRequest::getRefundId).toList();
        Map<Long, RefundBatchReviewRequest> reqMap = items.stream()
                .collect(Collectors.toMap(RefundBatchReviewRequest::getRefundId, r -> r));
        List<Refund> refunds = refundRepository.findAllById(ids);
        List<Long> reviewed = new ArrayList<>();
        for (Refund r : refunds) {
            RefundBatchReviewRequest req = reqMap.get(r.getRefundId());
            if (req == null || !"pending".equals(r.getStatus())) continue;
            r.setRemarks(req.getRemarks());
            r.setAdminId(adminId);
            r.setReviewedAt(OffsetDateTime.now());
            if ("completed".equals(req.getStatus())) {
                executeRefund(r);
            } else {
                r.setStatus("rejected");
            }
            reviewed.add(r.getRefundId());
        }
        refundRepository.saveAll(refunds);
        return reviewed;
    }

    private void executeRefund(Refund refund) {
        Transaction originalTx = refund.getOriginalTransaction();
        if (originalTx == null) {
            throw new RuntimeException("Original transaction not found for refund " + refund.getRefundId());
        }

        Transaction reverseTx = new Transaction();
        reverseTx.setTypeId(findRefundTypeId());
        reverseTx.setSourceAccountId(originalTx.getTargetAccountId());
        reverseTx.setTargetAccountId(originalTx.getSourceAccountId());
        reverseTx.setAmount(refund.getRefundAmount());
        reverseTx.setCurrency(originalTx.getCurrency() != null ? originalTx.getCurrency() : "USD");
        reverseTx.setStatus("completed");
        reverseTx.setDescription("Refund for transaction " + (originalTx.getReferenceNumber() != null ? originalTx.getReferenceNumber() : "")
            + ": " + (refund.getReason() != null ? refund.getReason() : ""));
        reverseTx.setReferenceNumber("REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        reverseTx.setTransactionDate(OffsetDateTime.now());
        transactionRepository.save(reverseTx);

        if (originalTx.getTargetAccountId() != null) {
            accountRepository.findById(originalTx.getTargetAccountId()).ifPresent(targetAccount -> {
                targetAccount.setBalance(targetAccount.getBalance().subtract(refund.getRefundAmount()));
                accountRepository.save(targetAccount);
            });
        }
        if (originalTx.getSourceAccountId() != null) {
            accountRepository.findById(originalTx.getSourceAccountId()).ifPresent(sourceAccount -> {
                sourceAccount.setBalance(sourceAccount.getBalance().add(refund.getRefundAmount()));
                accountRepository.save(sourceAccount);
            });
        }

        refund.setStatus("completed");
    }

    private Integer findRefundTypeId() {
        return transactionTypeRepository.findByTypeName("refund")
                .map(TransactionType::getTypeId)
                .orElseThrow(() -> new RuntimeException("Transaction type 'refund' not found"));
    }

    private RefundResponse mapToResponse(Refund r) {
        String[] customerInfo = new String[2];
        if (r.getOriginalTransaction() != null && r.getOriginalTransaction().getSourceAccountId() != null) {
            accountRepository.findById(r.getOriginalTransaction().getSourceAccountId()).ifPresent(account -> {
                if (account.getCustomer() != null) {
                    String name = (account.getCustomer().getFirstName() != null ? account.getCustomer().getFirstName() : "")
                        + " " + (account.getCustomer().getLastName() != null ? account.getCustomer().getLastName() : "");
                    customerInfo[0] = name.trim();
                    customerInfo[1] = account.getCustomer().getEmail();
                }
            });
        }
        return new RefundResponse(
                r.getRefundId(),
                r.getOriginalTransaction() != null ? r.getOriginalTransaction().getTransactionId() : null,
                r.getRefundAmount(),
                r.getReason(),
                r.getComment(),
                r.getStatus(),
                r.getRemarks(),
                customerInfo[0],
                customerInfo[1],
                r.getProcessedAt(),
                r.getReviewedAt()
        );
    }
}
