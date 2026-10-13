# Seeding Pipeline

## Prerequisites

1. Drop sample documents into:
   - `simulator/samples/kyc/passport/` — name files with `front` / `back`
   - `simulator/samples/kyc/national_id/` — name files with `front` / `back`
   - `simulator/samples/collateral/` — any proof documents
   - `simulator/samples/profile-photos/` — any headshots

2. Ensure `.env` has your DB password and R2 credentials set.

3. All Docker containers must be running (`docker-compose up -d`).

## One-command seed

```powershell
.\seed.ps1                         # default batch = 50 customers
.\seed.ps1 -CustomerBatch 200      # override batch size
```

Runs in order:
1. `seed_mass.sql` — PostgreSQL bulk (200K customers, 600K accounts, 4.6M transactions)
2. `simulate.js` — **server-side seed** (calls a single in-process endpoint that registers customers, uploads KYC, creates accounts, issues cards, applies loans, etc.)
3. Time skip — 3 months interest accrual

## What the server-side seed does

The seed now runs **in-process on the user-api** instead of making 15+ HTTP calls per customer. It:

- Registers `BATCH_SIZE` customers
- Uploads KYC documents (reads real files from `simulator/samples/` and uploads to R2, deduped per file path)
- Uploads profile photos for first 20 customers (same dedup)
- Creates checking + savings accounts
- Deposits initial funds
- Issues debit cards
- Simulates card purchases (2-7 per customer)
- Applies for loans (60% of customers)
- Uploads collateral documents to R2 (deduped)
- Approves all loans
- Requests refunds (30% of customers)
- Makes loan repayments (50% of loans)
- Pays credit cards (30% of customers — only if credit cards exist)
- Skips 3 months via TimeSkipService

Progress is polled every second and displayed with a live progress bar.

## Configuration env vars

```powershell
$env:BATCH_SIZE=200                # Customers to simulate (default 50)
$env:SKIP_CARD_PURCHASES=true      # Skip card purchases for speed
```

## Manual steps (if needed)

```powershell
# Step 1 — PostgreSQL bulk
docker cp user-api/src/main/resources/db/seed_mass.sql adv-db-postgres-1:/seed.sql
docker exec -i adv-db-postgres-1 psql -U joelchan -d bank -f /seed.sql

# Step 2 — Server-side simulator (single endpoint)
$env:BATCH_SIZE=50; node simulator/simulate.js

# Step 3 — Time skip (optional, for interest accrual)
$cred = @{email="admin@equinox.com";password="admin"} | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:8081/auth/login" -Method POST -Body $cred -ContentType "application/json"
$headers = @{Authorization = "Bearer $($login.token)"}
Invoke-RestMethod -Uri "http://localhost:8081/auth/admin/settings/time-skip?months=3" -Method POST -Headers $headers -TimeoutSec 120
```

## What gets created

| Layer | Data | Source |
|-------|------|--------|
| Volume | 200K customers, 600K accounts, 4.6M transactions | SQL bulk |
| Business process | KYC docs, cards, purchases, loans, collateral, refunds, repayments | Server-side seed |
| Interest accrual | ~88K interest/fee transactions | Time skip |
