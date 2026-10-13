package com.equinox.bank.controller;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import com.equinox.bank.dto.CustomerRegistrationRequestDTO;
import com.equinox.bank.dto.CustomerResponseDTO;
import com.equinox.bank.dto.ForgotPasswordRequestDTO;
import com.equinox.bank.dto.JwtResponseDTO;
import com.equinox.bank.dto.KycDocumentResponseDTO;
import com.equinox.bank.dto.KycReviewHistoryDTO;
import com.equinox.bank.dto.ProfileUpdateRequestDTO;
import com.equinox.bank.dto.ResetPasswordRequestDTO;
import com.equinox.bank.entity.AuthRequest;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.entity.KycDocument;
import com.equinox.bank.repository.CustomerRepository;
import com.equinox.bank.repository.KycDocumentRepository;
import com.equinox.bank.exception.ResourceNotFoundException;
import com.equinox.bank.service.AuthService;
import com.equinox.bank.service.JwtService;
import com.equinox.bank.service.R2StorageService;
import com.equinox.bank.service.TokenBlacklistService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/auth")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final AuthService authService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TokenBlacklistService blacklistService;
    private final R2StorageService r2StorageService;
    private final KycDocumentRepository kycDocumentRepository;
    private final CustomerRepository customerRepository;

    public UserController(AuthService authService, JwtService jwtService,
                          AuthenticationManager authenticationManager,
                          TokenBlacklistService blacklistService,
                          R2StorageService r2StorageService,
                          KycDocumentRepository kycDocumentRepository,
                          CustomerRepository customerRepository) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.blacklistService = blacklistService;
        this.r2StorageService = r2StorageService;
        this.kycDocumentRepository = kycDocumentRepository;
        this.customerRepository = customerRepository;
    }

    @GetMapping("/welcome")
    public String welcome() {
        return "Welcome — this endpoint is not secure";
    }

    @PostMapping("/register")
    public ResponseEntity<JwtResponseDTO> registerUser(@Valid @RequestBody CustomerRegistrationRequestDTO dto) {
        CustomerResponseDTO saved = authService.registerCustomer(dto);
        String token = jwtService.generateToken(saved.email());
        String refreshToken = jwtService.generateRefreshToken(saved.email());
        blacklistService.storeRefreshToken(saved.email(), refreshToken);
        return new ResponseEntity<>(new JwtResponseDTO(token, refreshToken), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponseDTO> loginUser(@Valid @RequestBody AuthRequest authRequest) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(authRequest.getEmail(), authRequest.getPassword())
        );
        if (authentication.isAuthenticated()) {
            String token = jwtService.generateToken(authRequest.getEmail());
            String refreshToken = jwtService.generateRefreshToken(authRequest.getEmail());
            blacklistService.storeRefreshToken(authRequest.getEmail(), refreshToken);
            return ResponseEntity.ok(new JwtResponseDTO(token, refreshToken));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponseDTO> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        // Gate 1: must be on the whitelist (not revoked by logout)
        if (!blacklistService.isRefreshTokenValid(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            String email = jwtService.extractUsername(refreshToken);
            // Gate 2: JWT signature + expiry still valid
            String newToken = jwtService.generateToken(email);
            String newRefreshToken = jwtService.generateRefreshToken(email);
            // Rotate: old token out, new token in
            blacklistService.revokeRefreshToken(refreshToken);
            blacklistService.storeRefreshToken(email, newRefreshToken);
            return ResponseEntity.ok(new JwtResponseDTO(newToken, newRefreshToken));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            // Blacklist the access token for its remaining lifetime
            long remainingTtl = jwtService.getRemainingTtlMillis(token);
            if (remainingTtl > 0) {
                blacklistService.blacklistToken(token, Duration.ofMillis(remainingTtl));
            }
        }
        // Revoke the refresh token if the client sends it
        String refreshToken = request.getHeader("X-Refresh-Token");
        if (refreshToken != null && !refreshToken.isBlank()) {
            blacklistService.revokeRefreshToken(refreshToken);
        }
        return ResponseEntity.ok("Logged out successfully");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDTO request) {
        try {
            authService.loadUserByUsername(request.email());
        } catch (Exception e) {
            return ResponseEntity.ok(
                "If that email is registered, a reset token has been generated. Check your email."
            );
        }

        String resetToken = blacklistService.createResetToken(request.email());
        return ResponseEntity.ok(
            "If that email is registered, a reset token has been generated. " +
            "Reset token (dev only): " + resetToken
        );
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request) {
        String email = blacklistService.consumeResetToken(request.token());
        if (email == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Invalid or expired reset token. Please request a new one.");
        }

        boolean updated = authService.updatePassword(email, request.newPassword());
        if (!updated) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Password reset failed. Please try again.");
        }

        return ResponseEntity.ok("Password has been reset successfully. You may now log in.");
    }

    @GetMapping("/getAllUser")
    public ResponseEntity<List<CustomerResponseDTO>> getAllUser() {
        return ResponseEntity.ok(authService.getAllCustomers());
    }

    @GetMapping("/profile")
    public ResponseEntity<CustomerResponseDTO> getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(authService.getCustomerByEmail(email));
    }

    @PutMapping("/profile")
    public ResponseEntity<CustomerResponseDTO> updateProfile(@Valid @RequestBody ProfileUpdateRequestDTO dto) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(authService.updateProfile(email, dto));
    }

    @PostMapping("/kyc/profile-photo")
    public ResponseEntity<CustomerResponseDTO> uploadProfilePhoto(@RequestParam(value = "file", required = false) MultipartFile file,
                                                                   @RequestParam(value = "existingFileKey", required = false) String existingFileKey) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getProfilePhotoUrl() != null && !"rejected".equals(customer.getKycStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(null);
        }

        if (existingFileKey == null && (file == null || file.isEmpty())) {
            return ResponseEntity.badRequest().build();
        }

        String fileKey = existingFileKey != null
            ? existingFileKey
            : r2StorageService.uploadFile(file, customer.getCustomerId().intValue());
        customer.setProfilePhotoUrl(fileKey);
        Customer saved = customerRepository.save(customer);

        return ResponseEntity.ok(authService.getCustomerByEmail(email));
    }

    @PostMapping("/kyc/upload")
    public ResponseEntity<KycDocumentResponseDTO> uploadKyc(@RequestParam(value = "file", required = false) MultipartFile file,
                                                             @RequestParam(value = "backFile", required = false) MultipartFile backFile,
                                                             @RequestParam("documentType") String documentType,
                                                             @RequestParam(value = "existingFileKey", required = false) String existingFileKey,
                                                             @RequestParam(value = "existingFileKeyBack", required = false) String existingFileKeyBack,
                                                             @RequestParam(value = "documentId", required = false) Long documentId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (existingFileKey == null && (file == null || file.isEmpty())) {
            return ResponseEntity.badRequest().build();
        }

        // Try to find existing rejected doc to update, otherwise create new
        KycDocument doc = null;
        if (documentId != null) {
            doc = kycDocumentRepository.findById(documentId)
                .filter(d -> d.getCustomer().getCustomerId().equals(customer.getCustomerId()))
                .filter(d -> "rejected".equals(d.getStatus()))
                .orElse(null);
        }
        if (doc == null) {
            doc = kycDocumentRepository.findTopByCustomerOrderByUploadedAtDesc(customer)
                .filter(d -> "rejected".equals(d.getStatus()))
                .orElse(null);
        }
        if (doc == null) {
            doc = new KycDocument();
            doc.setCustomer(customer);
        }

        // Reset customer's KYC status to pending on resubmission
        if (!"pending".equals(customer.getKycStatus())) {
            customer.setKycStatus("pending");
            customerRepository.save(customer);
        }

        String fileKey = existingFileKey != null
            ? existingFileKey
            : r2StorageService.uploadFile(file, customer.getCustomerId().intValue());

        doc.setDocumentType(documentType);
        doc.setDocumentUrl(fileKey);
        doc.setStatus("pending");
        doc.setRemarks(null);
        doc.setUploadedAt(java.time.LocalDateTime.now());

        if (existingFileKeyBack != null) {
            doc.setDocumentUrlBack(existingFileKeyBack);
        } else if (backFile != null && !backFile.isEmpty()) {
            String backKey = r2StorageService.uploadFile(backFile, customer.getCustomerId().intValue());
            doc.setDocumentUrlBack(backKey);
        } else {
            doc.setDocumentUrlBack(null);
        }

        KycDocument saved = kycDocumentRepository.save(doc);

        return ResponseEntity.ok(new KycDocumentResponseDTO(
            saved.getDocumentId(),
            customer.getCustomerId(),
            saved.getDocumentType(),
            saved.getDocumentUrl(),
            saved.getDocumentUrlBack(),
            saved.getUploadedAt(),
            saved.getStatus(),
            saved.getRemarks()
        ));
    }

    @GetMapping("/kyc/documents")
    public ResponseEntity<List<KycDocumentResponseDTO>> getKycDocuments() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        List<KycDocumentResponseDTO> docs = kycDocumentRepository.findByCustomer(customer).stream()
            .map(doc -> new KycDocumentResponseDTO(
                doc.getDocumentId(),
                customer.getCustomerId(),
                doc.getDocumentType(),
                doc.getDocumentUrl(),
                doc.getDocumentUrlBack(),
                doc.getUploadedAt(),
                doc.getStatus(),
                doc.getRemarks()
            ))
            .toList();

        return ResponseEntity.ok(docs);
    }

    @GetMapping("/kyc/documents/{docId}/file")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getDocumentFile(@PathVariable Long docId,
                                             @RequestParam(defaultValue = "front") String side) {
        KycDocument doc = kycDocumentRepository.findById(docId)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                                 || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (!isAdmin && !doc.getCustomer().getEmail().equals(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if ("back".equalsIgnoreCase(side) && (doc.getDocumentUrlBack() == null || doc.getDocumentUrlBack().isBlank())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "No back file available for this document"));
        }

        String fileKey = "back".equalsIgnoreCase(side) ? doc.getDocumentUrlBack() : doc.getDocumentUrl();

        if (fileKey == null || fileKey.isBlank()) {
            log.error("Document {} has no file URL for side '{}'", docId, side);
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No file available for this document"));
        }

        try {
            ResponseInputStream<GetObjectResponse> s3Stream = r2StorageService.getFile(fileKey);
            String contentType = s3Stream.response().contentType();

            var resource = new org.springframework.core.io.InputStreamResource(s3Stream);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                    .body(resource);
        } catch (NoSuchKeyException e) {
            log.error("File not found in R2 for key '{}' (document {} side '{}')", fileKey, docId, side, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Document file not found"));
        } catch (RuntimeException e) {
            log.error("Failed to retrieve file for key '{}' (document {} side '{}')", fileKey, docId, side, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Failed to retrieve document file"));
        }
    }

    @GetMapping("/kyc/reviews")
    public ResponseEntity<List<KycReviewHistoryDTO>> getKycReviewHistory() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        List<KycDocument> docs = kycDocumentRepository.findByCustomer(customer);
        List<KycReviewHistoryDTO> reviews = docs.stream()
            .filter(doc -> doc.getStatus() != null && !"pending".equalsIgnoreCase(doc.getStatus()))
            .map(doc -> new KycReviewHistoryDTO(
                doc.getDocumentId(),
                doc.getDocumentType(),
                doc.getStatus(),
                doc.getRemarks(),
                "Compliance Officer",
                doc.getUploadedAt()
            ))
            .sorted((a, b) -> b.reviewedAt().compareTo(a.reviewedAt()))
            .toList();

        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/profile-photo")
    public ResponseEntity<?> getOwnProfilePhoto() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getProfilePhotoUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            ResponseInputStream<GetObjectResponse> s3Stream = r2StorageService.getFile(customer.getProfilePhotoUrl());
            String contentType = s3Stream.response().contentType();

            var resource = new org.springframework.core.io.InputStreamResource(s3Stream);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/jpeg"))
                    .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                    .body(resource);
        } catch (NoSuchKeyException e) {
            log.warn("Profile photo not found in R2 for key '{}'", customer.getProfilePhotoUrl());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Profile photo not found"));
        } catch (RuntimeException e) {
            log.error("Failed to retrieve profile photo for key '{}'", customer.getProfilePhotoUrl(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Failed to retrieve profile photo"));
        }
    }

    @GetMapping("/profile-photo/{customerId}/file")
    public ResponseEntity<?> getCustomerProfilePhoto(@PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                                 || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (!isAdmin && !customer.getEmail().equals(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (customer.getProfilePhotoUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            ResponseInputStream<GetObjectResponse> s3Stream = r2StorageService.getFile(customer.getProfilePhotoUrl());
            String contentType = s3Stream.response().contentType();

            var resource = new org.springframework.core.io.InputStreamResource(s3Stream);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/jpeg"))
                    .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                    .body(resource);
        } catch (NoSuchKeyException e) {
            log.warn("Profile photo not found in R2 for key '{}' (customer {})", customer.getProfilePhotoUrl(), customerId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Profile photo not found"));
        } catch (RuntimeException e) {
            log.error("Failed to retrieve profile photo for key '{}' (customer {})", customer.getProfilePhotoUrl(), customerId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Failed to retrieve profile photo"));
        }
    }
}
