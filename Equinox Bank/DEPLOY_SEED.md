# Deploy & Seed Guide

## Server Specs
- **CPU:** 4 cores
- **RAM:** 8 GB

## Resource Allocation (Normal Operation)

| Service | CPU | RAM | Notes |
|---------|-----|-----|-------|
| postgres | 1.0 | 1.5 GB | `shared_buffers=512MB`, `work_mem=32MB` |
| admin-api | 1.0 | 1.0 GB | Heap: -Xmx768m |
| user-api | 1.0 | 1.0 GB | Heap: -Xmx768m |
| mongodb | 0.5 | 512 MB | |
| redis | 0.5 | 128 MB | |
| frontend | 0.5 | 256 MB | |
| **Total** | **~4.5** | **~4.4 GB** | Leaves ~3.6 GB for OS |

## Resource Allocation (Seeding Phase)

| Service | CPU | RAM | Notes |
|---------|-----|-----|-------|
| postgres | **2.0** | **2 GB** | `maintenance_work_mem=512MB` for fast indexes |
| admin-api | 0.25 | 512 MB | Idle during seed |
| user-api | 0.5 | 768 MB | Needed for simulate.js |
| mongodb | 0.25 | 384 MB | |
| redis | 0.25 | 96 MB | |
| frontend | 0.25 | 256 MB | |
| **Total** | **~3.5** | **~4 GB** | Leaves ~4 GB for OS |

---

## Normal Operation

Start all services with standard resources:

```powershell
docker compose up -d
```

Check everything is healthy:

```powershell
docker compose ps
```

---

## Seeding the Database

The seeding override boosts postgres to 2 CPUs / 2 GB RAM so bulk inserts and index creation run faster.

### Step 1 — Start with seed overrides

```powershell
docker compose -f docker-compose.yml -f docker-compose.seed.yml up -d
```

### Step 2 — Run the seed pipeline

```powershell
.\seed.ps1
```

### Step 3 — Switch back to normal operation

```powershell
docker compose down
docker compose up -d
```

---

## Why two compose files?

`docker-compose.yml` defines the **normal** resource limits. `docker-compose.seed.yml` is a **partial override** — Docker Compose merges it on top of the base file. Only the values you specify in `seed.yml` change; everything else stays the same.

This avoids duplicating the entire compose file just for seeding.

---

## Quick Reference

```
# Normal
docker compose up -d

# Seed
docker compose -f docker-compose.yml -f docker-compose.seed.yml up -d
.\seed.ps1
docker compose down
docker compose up -d

# Stop everything
docker compose down

# View resource usage
docker stats
```
