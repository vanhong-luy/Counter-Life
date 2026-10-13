package com.equinox.admin.service;

import com.equinox.admin.document.AuditLogDocument;
import com.equinox.admin.repository.AuditLogMongoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogMongoRepository repository;
    private final MongoTemplate mongoTemplate;

    public AuditLogService(AuditLogMongoRepository repository, MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.mongoTemplate = mongoTemplate;
    }

    public void log(Long adminId, String adminEmail, String actionType, String tableAffected,
                    Long recordId, String description, Map<String, Object> payloadDiff) {
        AuditLogDocument doc = new AuditLogDocument(adminId, adminEmail, actionType, tableAffected,
                recordId, description, payloadDiff);
        repository.save(doc);
    }

    public List<AuditLogDocument> getAllLogs() {
        return repository.findAll();
    }

    public List<AuditLogDocument> getLogsByEmail(String email) {
        return repository.findByAdminEmail(email);
    }

    public List<AuditLogDocument> getLogsByAction(String action) {
        return repository.findByActionType(action);
    }

    public List<AuditLogDocument> getLogsByTable(String table) {
        return repository.findByTableAffected(table);
    }

    public List<AuditLogDocument> getLogsByTableAndRecordId(String table, Long recordId) {
        return repository.findByTableAffectedAndRecordId(table, recordId);
    }

    public Map<String, Object> getFilteredLogs(String table, String search, int limit, int offset) {
        String tableRegex = (table == null || "ALL".equalsIgnoreCase(table)) ? ".*" : table;
        String searchRegex = (search == null || search.isBlank()) ? ".*" : search;
        PageRequest page = PageRequest.of(offset / limit, limit);

        List<AuditLogDocument> logs = repository.findFiltered(tableRegex, searchRegex, page);
        long total = repository.countFiltered(tableRegex, searchRegex);

        List<String> availableTables = mongoTemplate.findDistinct(
                new org.springframework.data.mongodb.core.query.Query(),
                "tableAffected",
                AuditLogDocument.class,
                String.class
        ).stream()
        .filter(Objects::nonNull)
        .sorted()
        .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("logs", logs);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        result.put("availableTables", availableTables);
        return result;
    }
}
