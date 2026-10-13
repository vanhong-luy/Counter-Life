# Admin API: Caching + Bug Fixes

## Files Changed

### 1. NEW: `admin-api/src/main/java/com/equinox/admin/config/RedisConfig.java`
- `@EnableCaching` + `RedisCacheConfiguration` bean
- 60-min TTL, `GenericJackson2JsonRedisSerializer` with `JavaTimeModule`
- Enables `@Cacheable` / `@CacheEvict` across admin-api

### 2. EDITED: `admin-api/src/main/resources/application.properties`
Added 3 lines:
```properties
spring.cache.type=redis
spring.cache.redis.time-to-live=3600000
spring.cache.redis.cache-null-values=false
```

### 3. EDITED: `admin-api/src/main/java/com/equinox/admin/service/SettingsService.java`
**New repos injected:** `TransactionTypeRepository`, `CardTypeRepository`, `CreditScoreTierRepository`, `AdminRoleRepository`, `AdminUserRepository`

**New cached read methods:**
| Method | Cache Key |
|---|---|
| `getAllAccountTypes()` (existing) | `@Cacheable("cache:account_types")` |
| `getAllLoanTypes()` (existing) | `@Cacheable("cache:loan_types")` |
| `getAllTransactionTypes()` (new) | `@Cacheable("cache:tx_types")` |
| `getAllCardTypes()` (new) | `@Cacheable("cache:card_types")` |
| `getAllCreditTiers()` (new) | `@Cacheable("cache:credit_tiers")` |
| `getAllRoles()` (new) | `@Cacheable("cache:admin_roles")` |
| `getAllAdmins()` (new) | `@Cacheable("cache:admin_staff")` |

**Eviction on existing writes:**
| Method | Evicts |
|---|---|
| `updateAccountTypeSettings()` | `@CacheEvict(value = "cache:account_types", allEntries = true)` |
| `updateLoanTypeSettings()` | `@CacheEvict(value = "cache:loan_types", allEntries = true)` |

### 4. EDITED: `admin-api/src/main/java/com/equinox/admin/controller/SettingsController.java`
**4 GET endpoints delegated to SettingsService (instead of direct repository.findAll()):**
- `GET /card-types` → `service.getAllCardTypes()`
- `GET /credit-tiers` → `service.getAllCreditTiers()`
- `GET /roles` → `service.getAllRoles()`
- `GET /admins` → `service.getAllAdmins()`

**7 mutation endpoints with `@CacheEvict(value = "...", allEntries = true)`:**
| Endpoint | Evicts |
|---|---|
| `PUT /card-types/{id}` | `cache:card_types` |
| `PUT /credit-tiers/{id}` | `cache:credit_tiers` |
| `POST /loans/create` | `cache:loan_types` |
| `POST /roles` | `cache:admin_roles` |
| `PUT /admins/{adminId}/role` | `cache:admin_staff` |
| `DELETE /admins/{adminId}` | `cache:admin_staff` |
| `POST /admins` | `cache:admin_staff` |

### 5. EDITED: `admin-api/src/main/java/com/equinox/admin/service/TransactionService.java`
- **Bug 2 fix:** Line 92 changed from hardcoded `List.of("pending", "completed", "failed", "reversed")` to `transactionRepository.findAllDistinctStatuses()` (query already existed at `TransactionRepository.java:63`)
- **Cache integration:** Line 69 changed from `transactionTypeRepository.findAll()` to `settingsService.getAllTransactionTypes()` (hits `cache:tx_types`)
- Injected `SettingsService`

### 6. EDITED: `admin-api/src/main/java/com/equinox/admin/service/AuditLogService.java`
**Bug 1 fix:** Changed `availableTables` derivation from filtered/paginated results to entire MongoDB collection.
- Before: `logs.stream().map(AuditLogDocument::getTableAffected)` — only shows tables present in the current 20-log page
- After: `mongoTemplate.findDistinct(new Query(), "tableAffected", AuditLogDocument.class, String.class)` — shows ALL distinct tables in the entire 120K+ log collection
- Injected `MongoTemplate`

## Cache Key Reference

| Cache Key | Returns | TTL | Evicted By |
|---|---|---|---|
| `cache:account_types` | `List<AccountType>` | 1hr | `PUT /settings/accounts` |
| `cache:loan_types` | `List<LoanType>` | 1hr | `PUT /settings/loans`, `POST /settings/loans/create` |
| `cache:tx_types` | `List<TransactionType>` | 1hr | never (data never changes) |
| `cache:card_types` | `List<CardType>` | 1hr | `PUT /settings/card-types/{id}` |
| `cache:credit_tiers` | `List<CreditScoreTier>` | 1hr | `PUT /settings/credit-tiers/{id}` |
| `cache:admin_roles` | `List<AdminRole>` | 1hr | `POST /settings/roles` |
| `cache:admin_staff` | `List<AdminUser>` | 1hr | `POST/PUT/DELETE /settings/admins/*` |

## Verified Working

- `GET /auth/admin/settings/accounts` — caches, evicts on PUT, re-caches
- `GET /auth/admin/settings/loans` — caches, evicts on POST create, re-caches
- `GET /auth/admin/settings/card-types` — caches, evicts on PUT
- `GET /auth/admin/settings/credit-tiers` — caches, evicts on PUT
- `GET /auth/admin/settings/roles` — caches, evicts on POST create
- `GET /auth/admin/settings/admins` — caches
- `GET /auth/admin/transactions` — uses cached tx_types + real statuses from DB
- `GET /auth/admin/audit-logs/filtered` — availableTables shows ALL distinct tables

## Known Issue (User-API, not from these changes)

`Could not initialize proxy [com.equinox.bank.entity.AccountType#2] - no session`

**Cause:** `Account.java:30` has `@ManyToOne(fetch = FetchType.LAZY)` on `accountType`. With `spring.jpa.open-in-view=false`, the Hibernate session closes after each repository call. When Jackson serializes an `Account` (for HTTP response or Redis caching), accessing `accountType` triggers a lazy proxy initialization with no open session.

**Fix:** Change `user-api/.../entity/Account.java:30` to `FetchType.EAGER`:
```java
@ManyToOne(fetch = FetchType.EAGER)
@JoinColumn(name = "account_type_id", nullable = false)
private AccountType accountType;
```
