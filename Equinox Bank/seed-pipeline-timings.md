# Seed Pipeline Timings — 2026-07-31

| Phase | Description | Start | End | Duration |
|-------|-------------|-------|-----|----------|
| T1 | SQL mass seed (seed_mass.sql) | 10:37:42 UTC | ~10:46 UTC | ~9 min |
| T2 | Post-seed (seed_post.sql, crashed at 11:03; resumed, complete) | 10:47:05 UTC | ~11:05 UTC | ~18 min |
| T3 | Mongo seed (audit_logs 27,500 + monthly_analytics 30,000) | ~11:06 UTC | 11:08 UTC | ~2 min |
| T4 | Node simulator (50 customers, server-side) | 12:00:37 UTC | 12:01:55 UTC | 77.3s (82.2s wall) |
| T5 | Final time-skip, 3 months x 34 customers | 12:21 UTC | 12:21 UTC | ~1 min |
| T6 | Restore normal compose + restart | ~12:24 UTC | ~12:26 UTC | ~2 min |

## Final counts (verified after restore)

Postgres: customers 50,810 | accounts 162,081 | cards 35,622 |
transactions 1,684,441 | loans 12,440 | loan_repayments 24,924 |
kyc_documents 31,995 | collaterals 12,422 | card_limits 35,622 |
savings_goals 15,270 | refunds 857 | card_statements 9,856

Mongo (bank_analytics): audit_logs 27,500 | monthly_analytics 30,000

## Auth checks
- admin-api:8081 admin@equinox.com/admin -> token OK
- user-api:8082 sim customer Test@12345 -> token OK
- user-api seeded mass customers: login 400/403 (unknown BCrypt pw, expected)

## Bugs fixed this session
1. CreditCardService hang: generateStatementsForDate/assessLateFees now scoped to
   card lists; TimeSkipService passes only credit cards with creditLimit != null.
2. CardStatementRepository: added findByPaidFalseAndDueDateBeforeAndCard_CardIdIn.
3. SeedSimulatorService Step 20 now generates statements only for the specific card.
4. **Time-skip rollback root cause**: TransactionRepository.sumDepositsSince /
   sumDebtPaymentsSince accepted LocalDateTime while Transaction.transactionDate is
   OffsetDateTime -> Hibernate bind error thrown inside CreditScoreService.calculateScore,
   called from @Transactional simulate() -> EVERY time-skip rolled back silently
   (only earlier-run loan-interest txns survived). Fixed by using OffsetDateTime.
5. user-api rebuilt (image a3bd6a301b08), restart now 94s (was 106.5s -> 88s earlier).
