package com.equinox.admin.repository;

import com.equinox.admin.document.AuditLogDocument;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogMongoRepository extends MongoRepository<AuditLogDocument, String> {
    List<AuditLogDocument> findByAdminEmail(String adminEmail);
    List<AuditLogDocument> findByActionType(String actionType);
    List<AuditLogDocument> findByTableAffected(String tableAffected);
    List<AuditLogDocument> findByTableAffectedAndRecordId(String tableAffected, Long recordId);

    @Query("{ $and: [ " +
           "{ 'tableAffected': { $regex: ?0, $options: 'i' } }, " +
           "{ $or: [ " +
           "{ 'adminEmail': { $regex: ?1, $options: 'i' } }, " +
           "{ 'actionType': { $regex: ?1, $options: 'i' } }, " +
           "{ 'description': { $regex: ?1, $options: 'i' } }, " +
           "{ 'tableAffected': { $regex: ?1, $options: 'i' } } " +
           "] } " +
           "] }")
    List<AuditLogDocument> findFiltered(String tableRegex, String searchRegex, Pageable pageable);

    @Query(value = "{ $and: [ " +
           "{ 'tableAffected': { $regex: ?0, $options: 'i' } }, " +
           "{ $or: [ " +
           "{ 'adminEmail': { $regex: ?1, $options: 'i' } }, " +
           "{ 'actionType': { $regex: ?1, $options: 'i' } }, " +
           "{ 'description': { $regex: ?1, $options: 'i' } }, " +
           "{ 'tableAffected': { $regex: ?1, $options: 'i' } } " +
           "] } " +
           "] }", count = true)
    long countFiltered(String tableRegex, String searchRegex);

    @Query(value = "{}", fields = "{ 'tableAffected': 1 }")
    List<AuditLogDocument> findAllProjected();
}
