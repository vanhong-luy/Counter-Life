param(
    [int]$CustomerBatch = 50
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SEED PIPELINE" -ForegroundColor Cyan
Write-Host "  Batch: $CustomerBatch" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1 - Upload sample files to R2 (KYC, collateral, profile photos)
Write-Host "[1/6] Uploading sample files to R2..." -ForegroundColor Yellow
python "${PSScriptRoot}\simulator\seed_upload_samples.py"
if ($?) { Write-Host "  [OK] Sample files uploaded" -ForegroundColor Green }
else    { Write-Host "  [FAIL] Sample upload failed (non-critical, skipping)" -ForegroundColor Yellow }
Write-Host ""

# Step 2 - PostgreSQL bulk seed
Write-Host "[2/6] PostgreSQL bulk seed (customers, accounts, transactions...)" -ForegroundColor Yellow
docker cp "${PSScriptRoot}\user-api\src\main\resources\db\seed_mass.sql" adv-db-postgres-1:/seed.sql
if ($?) {
    docker exec -i adv-db-postgres-1 psql -U joelchan -d bank -f /seed.sql
    if ($?) { Write-Host "  [OK] PostgreSQL seed complete" -ForegroundColor Green }
    else    { Write-Host "  [FAIL] PostgreSQL seed failed" -ForegroundColor Red }
}
Write-Host ""

# Step 3 - PostgreSQL post-seed (empty tables: kyc_documents, collaterals, etc.)
Write-Host "[3/6] PostgreSQL post-seed (kyc docs, collaterals, card history...)" -ForegroundColor Yellow
docker cp "${PSScriptRoot}\user-api\src\main\resources\db\seed_mass_post.sql" adv-db-postgres-1:/seed_post.sql
if ($?) {
    docker exec -i adv-db-postgres-1 psql -U joelchan -d bank -f /seed_post.sql
    if ($?) { Write-Host "  [OK] Post-seed complete" -ForegroundColor Green }
    else    { Write-Host "  [FAIL] Post-seed failed" -ForegroundColor Red }
}
Write-Host ""

# Step 4 - MongoDB seed (audit logs mirroring real admin flow + analytics)
Write-Host "[4/6] MongoDB seed (audit logs + analytics)" -ForegroundColor Yellow
# Export real record IDs/statuses from PostgreSQL so audit logs reference real records
$refsSql = "SELECT json_build_object(" +
  "'admins', (SELECT json_agg(json_build_object('id', admin_id, 'email', email)) FROM admin_users), " +
  "'kyc', (SELECT json_agg(json_build_object('id', document_id, 'status', status)) FROM kyc_documents), " +
  "'loans', (SELECT json_agg(json_build_object('id', loan_id, 'status', status)) FROM loans), " +
  "'refunds', (SELECT json_agg(json_build_object('id', refund_id, 'status', status)) FROM refunds), " +
  "'clrs', (SELECT json_agg(json_build_object('id', request_id, 'status', status)) FROM credit_limit_requests), " +
  "'cards', (SELECT json_agg(card_id) FROM cards), " +
  "'customers', (SELECT json_agg(json_build_object('id', customer_id, 'name', first_name || ' ' || last_name)) FROM customers) " +
  ")::text"
$refsJson = docker exec adv-db-postgres-1 psql -U joelchan -d bank -t -A -c $refsSql
if ($?) {
    [System.IO.File]::WriteAllText("$env:TEMP\audit_refs.json", $refsJson, [System.Text.UTF8Encoding]::new($false))
    docker cp "$env:TEMP\audit_refs.json" adv-db-mongodb-1:/audit_refs.json
    if ($?) { Write-Host "  [OK] Exported real record refs for audit seed" -ForegroundColor Green }
}
docker cp "${PSScriptRoot}\user-api\src\main\resources\db\seed_mongo.js" adv-db-mongodb-1:/seed.js
if ($?) {
    docker exec -i adv-db-mongodb-1 mongosh bank_analytics /seed.js
    if ($?) { Write-Host "  [OK] MongoDB seed complete" -ForegroundColor Green }
    else    { Write-Host "  [FAIL] MongoDB seed failed" -ForegroundColor Red }
}
Write-Host ""

# Step 5 - API simulator (uses new server-side seed endpoint)
Write-Host "[5/6] API simulator (server-side seed)" -ForegroundColor Yellow
$env:BATCH_SIZE = $CustomerBatch
node "${PSScriptRoot}\simulator\simulate.js"
if ($?) { Write-Host "  [OK] Simulator complete" -ForegroundColor Green }
else    { Write-Host "  [FAIL] Simulator failed" -ForegroundColor Red }
Write-Host ""

# Step 6 - Time skip
Write-Host "[6/6] Time skip - accruing interest..." -ForegroundColor Yellow
$adminCred = @{email="admin@equinox.com";password="admin"} | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:8081/auth/login" -Method POST -Body $adminCred -ContentType "application/json"
$headers = @{Authorization = "Bearer $($login.token)"}
$result = Invoke-RestMethod -Uri "http://localhost:8081/auth/admin/settings/time-skip?months=3" -Method POST -Headers $headers -TimeoutSec 120
Write-Host "  [OK] $($result.transactionsCreated) interest transactions created" -ForegroundColor Green

$total = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DONE - ${total}s total" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
