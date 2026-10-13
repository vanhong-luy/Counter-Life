package com.equinox.admin.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "audit_logs")
public class AuditLogDocument {

    @Id
    private String id;

    @Indexed
    private Long adminId;

    @Indexed
    private String adminEmail;

    @Indexed
    private String actionType;

    @Indexed
    private String tableAffected;

    private Long recordId;

    private String description;

    private LocalDateTime timestamp;

    private Map<String, Object> payloadDiff;

    public AuditLogDocument() {}

    public AuditLogDocument(Long adminId, String adminEmail, String actionType, String tableAffected,
                            Long recordId, String description, Map<String, Object> payloadDiff) {
        this.adminId = adminId;
        this.adminEmail = adminEmail;
        this.actionType = actionType;
        this.tableAffected = tableAffected;
        this.recordId = recordId;
        this.description = description;
        this.timestamp = LocalDateTime.now();
        this.payloadDiff = payloadDiff;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }

    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getTableAffected() { return tableAffected; }
    public void setTableAffected(String tableAffected) { this.tableAffected = tableAffected; }

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long recordId) { this.recordId = recordId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Map<String, Object> getPayloadDiff() { return payloadDiff; }
    public void setPayloadDiff(Map<String, Object> payloadDiff) { this.payloadDiff = payloadDiff; }
}
