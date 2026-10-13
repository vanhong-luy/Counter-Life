package com.equinox.admin.service;

import com.equinox.admin.dto.TransactionResponse;
import com.equinox.admin.entity.Account;
import com.equinox.admin.entity.Transaction;
import com.equinox.admin.entity.TransactionType;
import com.equinox.admin.repository.AccountRepository;
import com.equinox.admin.repository.TransactionRepository;
import com.equinox.admin.repository.TransactionTypeRepository;
import com.equinox.admin.service.SettingsService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final AccountRepository accountRepository;
    private final SettingsService settingsService;

    public TransactionService(TransactionRepository transactionRepository,
                              TransactionTypeRepository transactionTypeRepository,
                              AccountRepository accountRepository,
                              SettingsService settingsService) {
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.accountRepository = accountRepository;
        this.settingsService = settingsService;
    }

    public Map<String, Object> getAllTransactions(String type, String status,
                                                   LocalDate startDate, LocalDate endDate,
                                                   String search, int limit, int offset,
                                                   String sortBy, String sortDir) {
        OffsetDateTime start = startDate != null
                ? startDate.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime()
                : null;
        OffsetDateTime end = endDate != null
                ? endDate.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC)
                : null;

        if (search != null && search.isBlank()) search = null;
        if (type != null && "ALL".equalsIgnoreCase(type)) type = null;
        if (status != null && "ALL".equalsIgnoreCase(status)) status = null;
        if (type != null) type = type.toLowerCase();
        if (status != null) status = status.toLowerCase();
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(offset / limit, limit, sort);

        List<Transaction> transactions = transactionRepository.findAllFiltered(type, status, start, end, search, pageable);
        long total = transactionRepository.countFiltered(type, status, start, end, search);

        Set<Long> accountIds = new HashSet<>();
        for (Transaction tx : transactions) {
            if (tx.getSourceAccountId() != null) accountIds.add(tx.getSourceAccountId());
            if (tx.getTargetAccountId() != null) accountIds.add(tx.getTargetAccountId());
        }

        Map<Long, Account> accountMap = accountRepository.findAllById(accountIds).stream()
                .collect(Collectors.toMap(Account::getAccountId, Function.identity()));

        Map<Integer, String> typeMap = settingsService.getAllTransactionTypes().stream()
                .collect(Collectors.toMap(TransactionType::getTypeId, TransactionType::getTypeName));

        List<TransactionResponse> txns = transactions.stream()
                .map(tx -> {
                    String typeName = typeMap.getOrDefault(tx.getTypeId(), "Unknown");
                    Account src = tx.getSourceAccountId() != null ? accountMap.get(tx.getSourceAccountId()) : null;
                    Account tgt = tx.getTargetAccountId() != null ? accountMap.get(tx.getTargetAccountId()) : null;
                    return new TransactionResponse(
                            tx.getTransactionId(),
                            tx.getReferenceNumber(),
                            typeName, null, tx.getAmount(), tx.getCurrency(),
                            tx.getStatus(), tx.getDescription(), tx.getTransactionDate(),
                            tx.getSourceAccountId(), tx.getTargetAccountId(),
                            src != null ? src.getAccountNumber() : null,
                            tgt != null ? tgt.getAccountNumber() : null,
                            src != null ? src.getName() : null,
                            tgt != null ? tgt.getName() : null
                    );
                })
                .collect(Collectors.toList());

        List<String> availableTypes = typeMap.values().stream().distinct().sorted().toList();
        List<String> availableStatuses = transactionRepository.findAllDistinctStatuses();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transactions", txns);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        result.put("availableTypes", availableTypes);
        result.put("availableStatuses", availableStatuses);
        return result;
    }
}
