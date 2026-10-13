# Session Changelog — July 28, 2026

## July 31, 2026 — Full Page-by-Page Performance Sweep + Server Parity

### Frontend page audit (all measured via server frontend proxy, warm)
- **All admin pages fast:** dashboard 0.9s, users 0.14s, KYC 0.28s, loans/filtered 1.6s, cards 0.46s, transactions 2.0s, refunds 0.32s, audit 0.52s
- **All customer pages fast:** accounts 0.03s, cards 0.05s, transactions 0.06s, loans 0.07s, savings-goals 0.03s, bills 0.03s, profile 0.02s, KYC docs 0.02s, spending analytics 0.27s

### Analytics caching fixed on server (root cause: stale source)
- The server's admin-api was missing the entire `2630bef` caching commit — `SystemAnalyticsService`, `TelemetryService`, and `RedisConfig` had no `@Cacheable` / per-cache TTLs
- Synced all 9 stale files from local to server (verified byte-identical, LF-normalized): `RedisConfig.java`, `SettingsController.java`, `SystemAnalyticsService.java`, `TelemetryService.java`, `analytics.module.css`, `analytics/page.js`, `dashboard/transactions/page.js`, `MonthlyAnalyticsRepository.java`, `AnalyticsService.java`
- **Result:** `/system-analytics` 8–14s → **0.03s cached** (cold ~13.6s, 10-min Redis TTL); `/telemetry` 1.5s → **0.03s cached**
- Rebuilt + recreated admin-api and frontend on both server and local; verified caching works on both

### Frontend file transfer note
- Discovered `dashboard/transactions/page.js` contains a UTF-8 BOM; hash comparisons must be BOM-aware (strip `\xEF\xBB\xBF` + CRLF before diffing)

### Server OOM crash (root cause of "everything is slow")

## July 31, 2026 — Seed Pipeline, Time-Skip Fix, Server OOM Recovery

### Seed pipeline (server + local parity)
- `docker-compose.seed.yml` + `seed_mass.sql` + `seed_mass_post.sql` — 50,810 customers / 162,081 accounts / 35,622 cards / 1,684,441 transactions seeded on the server (~9 min mass seed, ~18 min post-seed, ~2 min Mongo, 77s simulator)
- `seed-pipeline-timings.md` — **NEW** — phase-by-phase timings + final verified counts
- `simulator/package.json` — **NEW** — `"type": "module"` so `simulator/simulate.js` (ESM) runs on Node 18 (server) and Node 24 (local); previously crashed with "Cannot use import statement outside a module"
- Verified all seed-pipeline files byte-identical between local and server (LF-normalized hashes match; working-tree CRLF is cosmetic)

### Time-skip rollback bug (user-api)
- `TransactionRepository.sumDepositsSince` / `sumDebtPaymentsSince` accepted `LocalDateTime` while `Transaction.transactionDate` is `OffsetDateTime` → Hibernate bind error thrown inside `CreditScoreService.calculateScore` (called from `@Transactional simulate()`) rolled back every per-customer time-skip
- Fixed by using `OffsetDateTime` in both query params and the DTI caller in `CreditScoreService`
- `CreditCardService` statement/late-fee generation now scoped to explicit card lists (`generateStatementsForCards`, `assessLateFeesForCards`); `TimeSkipService` passes only credit cards with `creditLimit != null`
- `CardStatementRepository` added `findByPaidFalseAndDueDateBeforeAndCard_CardIdIn`
- `SeedSimulatorService` Step 20 generates statements per card; Step 21 runs per-customer time-skip (34 OK, 16 skipped — those lack approved KYC so have no `ROLE_CUSTOMER`)

### Server OOM crash (root cause of "everything is slow")
- `user-api` was OOM-killed at ~1.02GB anon-RSS against a `mem_limit: 1024M` cgroup with `-Xmx768m` heap (heap + metaspace + threads + off-heap R2/Mongo/Redis SDKs exceeded the limit); restart policy was `no`, so it stayed down and all `/auth/*` customer routes hung
- `docker-compose.yml` — `user-api` + `admin-api` `mem_limit` raised `1024M → 2048M`; added `restart: unless-stopped` to all 6 services so crashes self-heal
- `UserController` — `getOwnProfilePhoto` / `getCustomerProfilePhoto` now catch `NoSuchKeyException` from R2 and return 404 instead of 500 (missing profile-photo keys were producing stack-trace spam)

### Verified after recovery
- user-api boots in ~49s, stable at ~783MiB/2GiB (was crashing at 1GiB)
- All real FE endpoints fast via proxy: dashboard 0.7s, KYC queue 1.4s, pending loans 0.05s, txn volume 0.36s, loans/filtered 0.6s, cards 0.37s
- Postgres queries 0.1–0.3ms, 99% cache-hit; admin login 0.1s steady-state
- Mongo `bank_analytics`: audit_logs 27,500 (8 action types), monthly_analytics 30,000

---

## Seeding & Data Pipeline

### New: `seed.ps1`
One-command PowerShell pipeline with `-Step` flag to run individual stages:
```
.\seed.ps1                          # Full pipeline
.\seed.ps1 -Step 2                  # API simulator only
.\seed.ps1 -CustomerBatch 200       # Override batch size
```

### Removed
- `seed_mass.sh` / `seed_mongo.sh` — Windows-incompatible bash scripts
- `seed_mongo.js` — Fake MongoDB seed (audit logs now come from real API calls)
- `POST /auth/admin/seed` (admin-api) — Fake 8-customer seed with made-up R2 URLs
- `POST /auth/seed/transactions` + `POST /auth/seed/categories` (user-api) — Fake transaction generator

### Kept
- `seed_mass.sql` — PostgreSQL bulk seed (volume layer: 200K customers, 600K accounts, 4.6M transactions)

### Created
- `simulator/simulate.js` — API-driven simulator with verbose debug output, batch endpoints, file de-duplication
- `simulator/samples/kyc/{passport,national_id}/` — Drop KYC sample images with `front`/`back` naming
- `simulator/samples/collateral/` — Drop collateral proof docs
- `simulator/samples/profile-photos/` — Drop headshots

---

## Backend N+1 Query Fixes

### Admin LoanService (`admin-api`)
- **Before**: `getPendingLoans()` / `getAllLoans()` called `toResponse()` per loan, which ran 6+ individual DB queries (DTI, LTV, collateral loading) per loan
- **After**: JOIN FETCH queries batch-load customer + loanType. Collaterals loaded via `findByLoanIn` in one query. Added lightweight `toResponseLight()` that skips DTI for dashboard list view
- **Batch-review**: Added `PUT /auth/admin/loans/batch-review` endpoint

### User CardService (`user-api`)
- **Before**: `getCustomerCards()` looped over accounts calling `cardRepository.findByAccount()` per account
- **After**: Single `cardRepository.findByAccountIn(accounts)` query

### Admin TransactionService (`admin-api`)
- **Before**: `transactionTypeRepository.findById()` called per transaction in stream
- **After**: Pre-load all transaction types into a `Map<Integer, String>` via `findAll()`

---

## Batch Endpoints Added

| Endpoint | Purpose |
|----------|---------|
| `PUT /auth/admin/kyc/batch-review` | Approve/reject multiple KYC docs at once |
| `PUT /auth/admin/loans/batch-review` | Approve/reject multiple loans at once |
| `PUT /auth/admin/refunds/batch-review` | Process multiple refunds at once |

---

## Pagination Added

### Transaction List (`GET /auth/admin/transactions`)
- Added `limit`, `offset`, `search` query params
- Uses `Pageable` so LIMIT/OFFSET are sent to PostgreSQL (prevents OOM on 4.7M rows)
- Search filters by `referenceNumber` and `description` server-side
- Returns `{ transactions, total, limit, offset, availableTypes, availableStatuses }`

### KYC Queue (`GET /auth/admin/kyc/filtered`)
- Same pattern: `limit`, `offset`, `status`, `search` params
- Search by customer name and document type
- Returns `{ documents, total, availableStatuses }`

### Users List (`GET /auth/admin/users/filtered`)
- Same pattern: `limit`, `offset`, `search` params
- Search by name or email
- Returns `{ customers, total }`

### Loans List (`GET /auth/admin/loans/filtered`)
- Same pattern: `limit`, `offset`, `status`, `loanType`, `sortBy`, `sortDir`
- Returns `{ loans, total, availableTypes, availableStatuses }`
- Statuses now server-driven (via `SELECT DISTINCT status FROM loans`) not hardcoded

### Audit Logs (`GET /auth/admin/audit-logs/filtered`)
- Same pattern: `limit`, `offset`, `table`, `search`
- Search across `adminEmail`, `actionType`, `description`, `tableAffected` via MongoDB `$regex`
- Returns `{ logs, total, availableTables }`
- **Bug fixed**: `availableTables` was derived from filtered results (collapsed dropdown on selection)

---

## New Aggregation Endpoint

### `GET /auth/admin/dashboard/transaction-volume?range=weekly`
- **Before**: Dashboard loaded ALL 4.7M transactions into browser to draw bar chart
- **After**: Single SQL `GROUP BY` + `SUM` query returns aggregated data
- Supports `range=today` (6 hourly buckets), `weekly` (7 daily), `monthly` (5 weekly)
- Returns `{ depositsSum, withdrawalsSum, transfersSum, buckets: [{ label, deposit, transfer }] }`

---

## Frontend Changes

### Dashboard (`/admin/dashboard`)
- Replaced `api.admin.getAllTransactions()` (4.7M rows) with `api.admin.getTransactionVolume()` (aggregated)
- Removed all client-side chart computation (moved to SQL)
- Added `WEEKLY_DAYS`, `TODAY_BLOCKS`, `MONTHLY_WEEKS` constants back for reference

### Transactions (`/admin/transactions`)
- Full pagination with Prev/Next, page counter
- Server-side type/status/date/search filtering
- Type/status dropdowns populated from full dataset, not current page

### KYC (`/admin/kyc`)
- Pagination with Prev/Next
- Server-side status/search filtering
- Search triggers on Enter key

### Users (`/admin/users`)
- Pagination with Prev/Next
- Server-side search on Enter

### Loans (`/admin/loans`)
- Pagination with Prev/Next
- Loan type filter from server (`availableTypes`)
- Loan status filter from server (`availableStatuses`)

### Audit (`/admin/audit`)
- Pagination with Prev/Next
- Table filter + search from server
- Uses `api.getFilteredAuditLogs()` instead of raw `fetch`

### Settings (`/admin/settings`)
- **Audit logs sidebar**: `GET /auth/admin/audit-logs/filtered?limit=7` instead of loading 120K docs
- **Assign Staff dropdown**: Replaced 211K-item `<select>` with searchable input. Shows first 10 users by default, searches on keypress via `/auth/admin/users/filtered?search=...`
- **Telemetry**: Fixed `Transaction silently rolled back` error by removing non-existent `loan_payment_schedule` table from PG_TABLES list

### Register (`/register`)
- Fixed garbled Unicode character `Γû╝` → `▼` on phone prefix dropdown

---

## SaveAll Optimizations

### AccountService (`user-api`)
- **Before**: `setPrimaryAccount()` called `accountRepository.save()` per account in a loop
- **After**: Single `accountRepository.saveAll()` call
- **Bug fix**: `target` entity was a different Hibernate instance from the one in `allAccounts` — now modifies the entity from the collection directly

### CreditCardService (`user-api`)
- **Before**: `generateMonthlyStatements()` called `cardRepository.save()` and `cardStatementRepository.save()` per card in loop
- **After**: Collect all into lists, single `saveAll()` calls at end
- **Before**: `payCard()` loop with `break` to find unpaid statement
- **After**: `stream().filter().findFirst().ifPresent()`

### KycService (`admin-api`)
- **Before**: `batchReviewDocuments()` called `customerRepository.save()` per customer in loop
- **After**: Single `customerRepository.saveAll()` at end

---

## @Transactional Annotations Added

### AccountService (`user-api`)
- Added `@Transactional` to `setPrimaryAccount()` and `deleteAccount()` (both modify multiple entities)

---

## Dashboard Performance Fix

### LoanService.getPendingLoans() (`admin-api`)
- **Before**: Loaded ALL ~1,900 pending loans with full DTI computation (5,700+ aggregate queries)
- **After**: Limited to 10 results, uses `toResponseLight()` that skips DTI calculation
- Dashboard was waiting 10+ seconds for this single call

---

## Files Modified

### admin-api (Java)
- `repository/LoanRepository.java` — JOIN FETCH queries, paginated variants, `findAllLoanTypes()`, `findAllStatuses()`
- `repository/TransactionRepository.java` — `Pageable` variant, `countFiltered`, search param, `aggregateVolume` native query
- `repository/KycDocumentRepository.java` — JOIN FETCH, paginated filtered+counter, distinct statuses
- `repository/CustomerRepository.java` — Paginated filtered+counter with search
- `repository/CollateralRepository.java` — Added `findByLoanIn`
- `repository/AuditLogMongoRepository.java` — `findFiltered`, `countFiltered` with regex
- `controller/DashboardController.java` — Added `/dashboard/transaction-volume` endpoint
- `controller/KycController.java` — Added `/kyc/filtered` endpoint
- `controller/LoanController.java` — Added `/loans/filtered` + `/loans/batch-review`
- `controller/RefundController.java` — Added `/refunds/batch-review`
- `controller/TransactionController.java` — Pagination params + search
- `controller/UserController.java` — Added `/users/filtered` endpoint
- `controller/AuditLogController.java` — Added `/audit-logs/filtered` endpoint
- `service/LoanService.java` — JOIN FETCH, batch collaterals, `toResponseLight()`, `getFilteredLoans()`, `batchReviewLoans()`
- `service/KycService.java` — `getFilteredDocuments()`, `batchReviewDocuments()`, `toResponse()` extracted
- `service/RefundService.java` — `batchReviewRefunds()`
- `service/TransactionService.java` — Pagination, search, pre-loaded type map, `availableStatuses`
- `service/DashboardService.java` — `getTransactionVolume()` aggregation method
- `service/CustomerService.java` — `getFilteredCustomers()` with pagination
- `service/AuditLogService.java` — `getFilteredLogs()` with pagination + regex search + `availableTables`
- `service/TelemetryService.java` — Removed non-existent `loan_payment_schedule` from table list
- `dto/TransactionVolumeResponse.java` — **NEW** — Aggregated volume response DTO
- `dto/KycBatchReviewRequest.java` — **NEW**
- `dto/LoanBatchReviewRequest.java` — **NEW**
- `dto/RefundBatchReviewRequest.java` — **NEW**

### user-api (Java)
- `repository/CardRepository.java` — Added `findByAccountIn`
- `service/CardService.java` — Batch query for `getCustomerCards()`
- `service/AccountService.java` — `saveAll` in `setPrimaryAccount()`, added `@Transactional`
- `service/CreditCardService.java` — `saveAll` in `generateMonthlyStatements()`, stream in `payCard()`

### frontend (Next.js)
- `lib/api.js` — New methods: `getFilteredUsers`, `getFilteredAuditLogs`, `getTransactionVolume`, `getFilteredKycQueue`, `getFilteredLoans`
- `app/admin/dashboard/page.js` — Uses `getTransactionVolume` instead of `getAllTransactions` (4.7M rows)
- `app/admin/transactions/page.js` — Full pagination + server-side filters + type/status from server
- `app/admin/kyc/page.js` — Pagination + server-side status/search filter + removed `sortOrder` bug
- `app/admin/users/page.js` — Pagination + server-side search
- `app/admin/loans/page.js` — Pagination + type/status from server
- `app/admin/audit/page.js` — Pagination + table/search filter + uses API library instead of raw fetch
- `app/admin/settings/page.js` — Audit sidebar uses filtered endpoint (7 docs), staff assignment uses searchable input instead of 211K dropdown
- `app/register/page.js` — Fixed garbled Unicode character on phone prefix

### scripts
- `seed.ps1` — **NEW** — PowerShell pipeline with `-Step` flag
- `simulator/simulate.js` — **NEW** — API-driven simulator with verbose debug output

---

## Remaining Items for Next Session

1. **Redis caching** for filterable data (loan types, transaction types, statuses, etc.) — plan documented in session, needs `@EnableCaching` in admin-api + `@Cacheable` annotations
2. **Dashboard KYC page** (`/dashboard/kyc`) — Upload buttons hide after submission (blocks re-upload unless rejected), review history shows empty (uses deleted `kyc_reviews` table), profile photo section needs cleanup
3. **Audit `availableTables`** — still derived from filtered MongoDB results (minor — needs distinct query fix)
4. **Transaction `availableStatuses`** — hardcoded instead of from DB (minor)
