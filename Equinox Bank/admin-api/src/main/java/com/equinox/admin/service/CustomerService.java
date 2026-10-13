package com.equinox.admin.service;

import com.equinox.admin.dto.CustomerResponse;
import com.equinox.admin.dto.CustomerUpdateRequest;
import com.equinox.admin.entity.Customer;
import com.equinox.admin.repository.CustomerRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getFilteredCustomers(String search, int limit, int offset) {
        if (search != null && search.isBlank()) search = null;
        PageRequest page = PageRequest.of(offset / limit, limit);
        List<Customer> customers = customerRepository.findFiltered(search, page);
        long total = customerRepository.countFiltered(search);
        List<CustomerResponse> items = customers.stream().map(this::toResponse).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("customers", items);
        result.put("total", total);
        result.put("limit", limit);
        result.put("offset", offset);
        return result;
    }

    private CustomerResponse toResponse(Customer c) {
        return new CustomerResponse(
                c.getCustomerId(), c.getFirstName(), c.getLastName(),
                c.getEmail(), c.getPhoneNumber(), c.getKycStatus(),
                c.getCreditScore(), c.getCreatedAt(), c.getProfilePhotoUrl()
        );
    }

    public CustomerResponse getCustomer(Long customerId) {
        Customer c = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        return new CustomerResponse(
                c.getCustomerId(),
                c.getFirstName(),
                c.getLastName(),
                c.getEmail(),
                c.getPhoneNumber(),
                c.getKycStatus(),
                c.getCreditScore(),
                c.getCreatedAt(),
                c.getProfilePhotoUrl()
        );
    }

    @Transactional
    public CustomerResponse updateCustomer(Long customerId, CustomerUpdateRequest request) {
        Customer c = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        if (request.getKycStatus() != null) c.setKycStatus(request.getKycStatus());
        if (request.getCreditScore() != null) c.setCreditScore(request.getCreditScore());
        customerRepository.save(c);
        return new CustomerResponse(
                c.getCustomerId(),
                c.getFirstName(),
                c.getLastName(),
                c.getEmail(),
                c.getPhoneNumber(),
                c.getKycStatus(),
                c.getCreditScore(),
                c.getCreatedAt(),
                c.getProfilePhotoUrl()
        );
    }
}
