package com.equinox.admin.service;

import com.equinox.admin.dto.KycBatchReviewRequest;
import com.equinox.admin.dto.KycDocumentResponse;
import com.equinox.admin.dto.KycReviewRequest;
import com.equinox.admin.entity.AdminUser;
import com.equinox.admin.entity.Customer;
import com.equinox.admin.entity.KycDocument;
import com.equinox.admin.exception.BusinessException;
import com.equinox.admin.exception.ResourceNotFoundException;
import com.equinox.admin.repository.AdminUserRepository;
import com.equinox.admin.repository.CustomerRepository;
import com.equinox.admin.repository.KycDocumentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class KycService {

    private final KycDocumentRepository kycDocumentRepository;
    private final AdminUserRepository adminUserRepository;
    private final CustomerRepository customerRepository;

    public KycService(KycDocumentRepository kycDocumentRepository,
                      AdminUserRepository adminUserRepository,
                      CustomerRepository customerRepository) {
        this.kycDocumentRepository = kycDocumentRepository;
        this.adminUserRepository = adminUserRepository;
        this.customerRepository = customerRepository;
    }

    public List<KycDocumentResponse> getAllDocuments() {
        return kycDocumentRepository.findAllWithCustomer().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getFilteredDocuments(String status, String search, int limit, int offset) {
        if (search != null && search.isBlank()) search = null;
        if (status != null && ("ALL".equalsIgnoreCase(status) || "ALL STATUSES".equalsIgnoreCase(status))) status = null;
        if (status != null) status = status.toLowerCase();
        PageRequest page = PageRequest.of(offset / limit, limit);
        List<KycDocument> docs = kycDocumentRepository.findFiltered(status, search, page);
        long total = kycDocumentRepository.countFiltered(status, search);
        List<KycDocumentResponse> documents = docs.stream().map(this::toResponse).toList();
        List<String> availableStatuses = kycDocumentRepository.findAllDistinctStatuses();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documents", documents);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        result.put("availableStatuses", availableStatuses);
        return result;
    }

    private KycDocumentResponse toResponse(KycDocument doc) {
        Customer customer = doc.getCustomer();
        String name = customer.getFirstName() + " " + customer.getLastName();
        String status = doc.getStatus() != null ? doc.getStatus().toUpperCase() : "PENDING";
        return new KycDocumentResponse(
                doc.getDocumentId(), customer.getCustomerId(), name,
                doc.getDocumentType(), status, doc.getUploadedAt(),
                doc.getDocumentUrl(), doc.getDocumentUrlBack(),
                customer.getProfilePhotoUrl()
        );
    }

    @Transactional
    public void reviewDocument(Long documentId, KycReviewRequest request, Long adminId) {
        KycDocument doc = kycDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        Customer customer = doc.getCustomer();
        if (!"pending".equalsIgnoreCase(customer.getKycStatus()) && !"pending".equalsIgnoreCase(doc.getStatus())) {
            throw new BusinessException("KYC document has already been reviewed");
        }

        doc.setStatus(request.getStatus().toLowerCase());
        doc.setRemarks(request.getRemarks());
        kycDocumentRepository.save(doc);

        customer.setKycStatus(request.getStatus().toLowerCase());
        customerRepository.save(customer);
    }

    @Transactional
    public List<Long> batchReviewDocuments(List<KycBatchReviewRequest> items, Long adminId) {
        adminUserRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        List<Long> reviewed = new ArrayList<>();
        List<KycDocument> docs = kycDocumentRepository.findAllById(
                items.stream().map(KycBatchReviewRequest::getDocumentId).toList());
        Map<Long, KycBatchReviewRequest> reqMap = items.stream()
                .collect(Collectors.toMap(KycBatchReviewRequest::getDocumentId, r -> r));
        List<Customer> updatedCustomers = new ArrayList<>();
        for (KycDocument d : docs) {
            KycBatchReviewRequest req = reqMap.get(d.getDocumentId());
            if (req == null) continue;
            Customer customer = d.getCustomer();
            if (!"pending".equalsIgnoreCase(customer.getKycStatus()) && !"pending".equalsIgnoreCase(d.getStatus())) continue;
            d.setStatus(req.getStatus().toLowerCase());
            d.setRemarks(req.getRemarks());
            customer.setKycStatus(req.getStatus().toLowerCase());
            updatedCustomers.add(customer);
            reviewed.add(d.getDocumentId());
        }
        kycDocumentRepository.saveAll(docs);
        customerRepository.saveAll(updatedCustomers);
        return reviewed;
    }
}
