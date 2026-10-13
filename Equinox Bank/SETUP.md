# Equinox Banking System — Setup Guide

## Architecture

```
┌──────────┐     ┌───────────┐     ┌───────────┐
│ Frontend │────▶│ Admin API │────▶│ PostgreSQL │
│ :3000    │     │ :8081     │     │ :5432     │
│          │     │           │     ├───────────┤
│ Next.js  │     │ Spring    │     │ MongoDB   │
│          │     │ Boot      │     │ :27017    │
│          │     │           │     ├───────────┤
│          │────▶│ User API  │────▶│ Redis     │
│          │     │ :8082     │     │ :6379     │
└──────────┘     └───────────┘     └───────────┘
```

- **Frontend**: Next.js 16 App Router (`/admin/*` + `/dashboard/*`)
- **Admin API**: Spring Boot 3.4, manages staff/admin operations
- **User API**: Spring Boot 3.4, manages customer operations
- **PostgreSQL**: Primary database (customers, accounts, transactions, loans, cards)
- **MongoDB**: Analytics snapshots + audit logs
- **Redis**: Token blacklist + analytics cache

---

## Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Windows**: WSL 2 with Docker Desktop backend

### 1. Clone & Configure

```bash
git clone <repo-url> adv-db
cd adv-db
```

### 2. Set Environment Variables

Copy the example env file and fill in at minimum `DB_PASSWORD` and `JWT_SECRET`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required — change these
DB_PASSWORD=your_secure_password
JWT_SECRET=your_base64_256bit_secret     # Generate: openssl rand -base64 32

# Optional — leave blank if you don't need KYC uploads
R2_ACCESS_KEY=
R2_SECRET_KEY=
```

### 3. Start Everything

```bash
docker compose up --build -d
```

This starts 6 containers:
- `postgres` (PostgreSQL 16)
- `redis` (Redis 7)
- `mongodb` (MongoDB 7)
- `admin-api` (Spring Boot, port 8081)
- `user-api` (Spring Boot, port 8082)
- `frontend` (Next.js, port 3000)

**Wait** for all health checks to pass (~30 seconds).

### 4. Seed Data (First Run Only)

The database schema is created automatically by Flyway migrations.

Seed data (customers, accounts, transactions) is created **automatically on first startup** when the admin-api starts. It includes:

- 8 customer accounts
- Multiple bank accounts per customer
- Sample transactions
- Loan applications (some pending, some approved)
- Admin user

### 5. Access the App

| URL | Description | Login |
|-----|-------------|-------|
| `http://localhost:3000/dashboard` | Customer dashboard | Customer email / `password` |
| `http://localhost:3000/admin/dashboard` | Admin dashboard | `admin@equinox.com` / `admin` |

### Default Login Credentials

**Admin:**
- Email: `admin@equinox.com`
- Password: `admin`

**Customers (all passwords: `password`):**
| Email | KYC Status |
|-------|-----------|
| `sarah.chen@email.com` | Approved |
| `marcus.vane@email.com` | Approved |
| `elena.rod@email.com` | Approved |
| `james.miller@email.com` | Pending |
| `amy.park@email.com` | Pending |
| `david.kim@email.com` | Approved |
| `lisa.t@email.com` | Rejected |
| `robert.n@email.com` | Approved |

---

## Environment Variables Reference

### `.env` (Root)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PASSWORD` | ✅ Yes | — | PostgreSQL password |
| `POSTGRES_USER` | No | `joelchan` | PostgreSQL username |
| `POSTGRES_DB` | No | `bank` | PostgreSQL database name |
| `JWT_SECRET` | ✅ Yes | — | Base64-encoded, ≥32 bytes. Generate: `openssl rand -base64 32` |
| `R2_ACCESS_KEY` | No | — | Cloudflare R2 for KYC uploads (app works without it) |
| `R2_SECRET_KEY` | No | — | Cloudflare R2 for KYC uploads |

### `frontend/.env` (Optional — for local dev only)

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_API_URL` | `http://admin-api:8081` | Admin API URL for Next.js rewrites |
| `USER_API_URL` | `http://user-api:8082` | User API URL for Next.js rewrites |
| `NEXT_PUBLIC_API_URL` | `''` (same origin) | API base URL for browser requests |

---

## Running Without Docker

Each component can be run independently:

### Backend (User API)

```bash
cd user-api
# Ensure PostgreSQL, Redis, MongoDB are running locally
# Set env vars or use application.properties defaults
./mvnw spring-boot:run -DskipTests
```

### Backend (Admin API)

```bash
cd admin-api
./mvnw spring-boot:run -DskipTests
```

### Frontend

```bash
cd frontend
cp .env.example .env.local    # Edit if needed
npm install
npm run dev
```

---

## Seeding More Data

After initial setup, you can seed additional historical transactions for analytics:

```bash
# Login as a customer first, get the token, then:
curl -X POST "http://localhost:3000/auth/seed/transactions?startMonth=2025-01&endMonth=2026-07" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This generates realistic transactions across all months with proper categories.

---

## Time Skip Simulation

To fast-forward time and see interest/fees/payroll effects:

```bash
curl -X POST "http://localhost:3000/auth/sim/time-skip?months=12" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This creates interest payments, maintenance fees, loan interest accrual, and payroll deposits for N future months.

---

## Reset Database (Get Fresh Seed Data)

If you've been testing and want to reset to the original seed state:

```bash
# Stop everything, destroy the database volume, and restart
docker compose down -v
docker compose up --build -d
```

The `-v` flag removes the PostgreSQL and MongoDB volumes. On next startup, Flyway recreates the schema and the SeedService creates fresh sample data.

> ⚠️ This destroys ALL data (accounts, transactions, users, analytics).

---

## Useful Commands

```bash
# View logs
docker compose logs -f admin-api
docker compose logs -f user-api
docker compose logs -f frontend

# Rebuild a single service
docker compose build --no-cache admin-api
docker compose up -d admin-api

# Restart everything
docker compose down && docker compose up --build -d

# Check container health
docker compose ps

# Enter PostgreSQL
docker exec -it adv-db-postgres-1 psql -U joelchan -d bank

# Enter MongoDB
docker exec -it adv-db-mongodb-1 mongosh bank_analytics

# Clear analytics cache (forces recomputation)
docker exec adv-db-mongodb-1 mongosh --quiet bank_analytics --eval "db.monthly_analytics.deleteMany({})"
```
