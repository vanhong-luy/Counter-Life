package com.equinox.bank.service;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.equinox.bank.dto.CustomerRegistrationRequestDTO;
import com.equinox.bank.dto.CustomerResponseDTO;
import com.equinox.bank.dto.ProfileUpdateRequestDTO;
import com.equinox.bank.entity.AdminUser;
import com.equinox.bank.exception.DuplicateResourceException;
import com.equinox.bank.entity.Customer;
import com.equinox.bank.repository.AdminRoleRepository;
import com.equinox.bank.repository.AdminUserRepository;
import com.equinox.bank.repository.CustomerRepository;

@Service
public class AuthService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final CustomerRepository customerRepository;
    private final AdminUserRepository adminUserRepository;
    private final AdminRoleRepository adminRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    public AuthService(CustomerRepository customerRepository,
                       AdminUserRepository adminUserRepository,
                       AdminRoleRepository adminRoleRepository,
                       PasswordEncoder passwordEncoder,
                       StringRedisTemplate redisTemplate) {
        this.customerRepository = customerRepository;
        this.adminUserRepository = adminUserRepository;
        this.adminRoleRepository = adminRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.redisTemplate = redisTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isPresent()) {
            Customer customer = customerOpt.get();
            String role = "approved".equals(customer.getKycStatus())
                ? "ROLE_CUSTOMER"
                : "ROLE_UNVERIFIED";
            return new User(customer.getEmail(), customer.getPasswordHash(),
                List.of(new SimpleGrantedAuthority(role)));
        }

        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            AdminUser admin = adminOpt.get();
            return new User(admin.getEmail(), admin.getPasswordHash(),
                List.of(new SimpleGrantedAuthority(admin.getRole().getRoleName())));
        }

        throw new UsernameNotFoundException("Invalid credentials");
    }

    @Transactional
    @CacheEvict(value = "customer_profiles", allEntries = true)
    public CustomerResponseDTO registerCustomer(CustomerRegistrationRequestDTO dto) {
        if (customerRepository.findByEmail(dto.email()).isPresent()) {
            throw new DuplicateResourceException("Email already registered");
        }

        Customer customer = new Customer();
        customer.setFirstName(dto.firstName());
        customer.setLastName(dto.lastName());
        customer.setEmail(dto.email());
        customer.setPasswordHash(passwordEncoder.encode(dto.password()));
        customer.setPhoneNumber(dto.phoneNumber());
        customer.setDateOfBirth(dto.dateOfBirth());
        customer.setAddress(dto.address());
        customer.setCreditScore(650); // baseline default for new-to-credit customers

        Customer saved;
        try {
            saved = customerRepository.save(customer);
        } catch (RuntimeException e) {
            log.error("Failed to register customer with email '{}': phoneNumber='{}', firstName='{}', lastName='{}'",
                    dto.email(), dto.phoneNumber(), dto.firstName(), dto.lastName(), e);
            throw e;
        }
        return mapToResponseDTO(saved);
    }

    @Transactional(readOnly = true)
    public CustomerResponseDTO getCustomerByEmail(String email) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Customer not found"));
        return mapToResponseDTO(customer);
    }

    @Transactional
    @CacheEvict(value = "customer_profiles", key = "#email")
    public CustomerResponseDTO updateProfile(String email, ProfileUpdateRequestDTO dto) {
        Customer customer = customerRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Customer not found"));

        if (dto.firstName() != null) customer.setFirstName(dto.firstName());
        if (dto.lastName() != null) customer.setLastName(dto.lastName());
        if (dto.phoneNumber() != null) customer.setPhoneNumber(dto.phoneNumber());
        if (dto.dateOfBirth() != null) customer.setDateOfBirth(dto.dateOfBirth());
        if (dto.address() != null) customer.setAddress(dto.address());

        Customer saved = customerRepository.save(customer);
        return mapToResponseDTO(saved);
    }

    public void evictCustomerProfile(String email) {
        redisTemplate.delete("customer_profiles::" + email);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponseDTO> getAllCustomers() {
        return customerRepository.findAll().stream()
            .map(this::mapToResponseDTO)
            .toList();
    }

    @Transactional
    @CacheEvict(value = "customer_profiles", key = "#email")
    public boolean updatePassword(String email, String newPassword) {
        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isPresent()) {
            Customer customer = customerOpt.get();
            customer.setPasswordHash(passwordEncoder.encode(newPassword));
            customerRepository.save(customer);
            return true;
        }

        Optional<AdminUser> adminOpt = adminUserRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            AdminUser admin = adminOpt.get();
            admin.setPasswordHash(passwordEncoder.encode(newPassword));
            adminUserRepository.save(admin);
            return true;
        }

        return false;
    }

    private CustomerResponseDTO mapToResponseDTO(Customer customer) {
        return new CustomerResponseDTO(
            customer.getCustomerId(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getEmail(),
            customer.getPhoneNumber(),
            customer.getDateOfBirth(),
            customer.getAddress(),
            customer.getKycStatus(),
            customer.getCreditScore(),
            customer.getCreatedAt(),
            customer.getProfilePhotoUrl()
        );
    }
}
