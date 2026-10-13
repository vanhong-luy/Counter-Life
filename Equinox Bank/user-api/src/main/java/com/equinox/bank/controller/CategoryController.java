package com.equinox.bank.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.equinox.bank.entity.TransactionCategory;
import com.equinox.bank.repository.TransactionCategoryRepository;

@RestController
@RequestMapping("/auth/categories")
public class CategoryController {

    private final TransactionCategoryRepository transactionCategoryRepository;

    public CategoryController(TransactionCategoryRepository transactionCategoryRepository) {
        this.transactionCategoryRepository = transactionCategoryRepository;
    }

    @GetMapping
    public ResponseEntity<List<TransactionCategory>> getCategories(Authentication authentication) {
        return ResponseEntity.ok(transactionCategoryRepository.findAll());
    }
}
