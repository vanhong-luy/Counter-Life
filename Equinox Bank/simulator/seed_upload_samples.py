#!/usr/bin/env python3
"""
Uploads sample KYC/collateral/profile-photo files to Cloudflare R2
with deterministic seed-samples/ keys so the SQL seed can reference them.

Secure: reads creds from environment variables or .env file only.
Uploads to a dedicated seed-samples/ prefix — no conflict with real user docs.
"""

import json
import os
import sys
import subprocess
from pathlib import Path

# ── ensure boto3 ──────────────────────────────────────────────────────────
try:
    import boto3
    from botocore.config import Config
except ImportError:
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "boto3", "--quiet"]
    )
    import boto3
    from botocore.config import Config

# ── load credentials ──────────────────────────────────────────────────────
def load_env(env_path: Path):
    """Minimal .env parser — no dependency needed."""
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())

# Try loading from .env relative to this script or project root
load_env(Path(__file__).resolve().parent.parent / ".env")

access_key = os.environ.get("R2_ACCESS_KEY") or os.environ.get("CLOUDFLARE_R2_ACCESS_KEY")
secret_key = os.environ.get("R2_SECRET_KEY") or os.environ.get("CLOUDFLARE_R2_SECRET_KEY")

if not access_key or not secret_key:
    print("ERROR: R2_ACCESS_KEY and R2_SECRET_KEY must be set", file=sys.stderr)
    sys.exit(1)

R2_ENDPOINT = "https://031f6633edce4e2aed10d0c9b80c1e68.r2.cloudflarestorage.com"
BUCKET = "bank"
PREFIX = "seed-samples"

client = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

# ── discover sample files ─────────────────────────────────────────────────
SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
assert SAMPLES_DIR.is_dir(), f"Samples directory not found: {SAMPLES_DIR}"

MIME_MAP = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

def mime_type(path: Path) -> str:
    return MIME_MAP.get(path.suffix.lower(), "application/octet-stream")

# ── upload ────────────────────────────────────────────────────────────────
mapping = {}

def upload(local_path: Path, s3_key: str):
    full_key = f"{PREFIX}/{s3_key}"
    client.put_object(
        Bucket=BUCKET,
        Key=full_key,
        Body=local_path.read_bytes(),
        ContentType=mime_type(local_path),
    )
    mapping[local_path.relative_to(SAMPLES_DIR).as_posix()] = full_key
    print(f"  OK  {full_key}")

print("=== Uploading KYC sample files ===")
kyc_dir = SAMPLES_DIR / "kyc"
for doc_type_dir in sorted(kyc_dir.iterdir()):
    if not doc_type_dir.is_dir():
        continue
    for f in sorted(doc_type_dir.iterdir()):
        upload(f, f"kyc/{doc_type_dir.name}/{f.name}")

print("\n=== Uploading collateral sample files ===")
coll_dir = SAMPLES_DIR / "collateral"
for f in sorted(coll_dir.iterdir()):
    upload(f, f"collateral/{f.name}")

print("\n=== Uploading profile-photo sample files ===")
photo_dir = SAMPLES_DIR / "profile-photos"
for f in sorted(photo_dir.iterdir()):
    upload(f, f"profile-photos/{f.name}")

# ── write mapping ─────────────────────────────────────────────────────────
output_path = SAMPLES_DIR / "sample_keys.json"
output_path.write_text(json.dumps(mapping, indent=2))
print(f"\nMapping written to {output_path}")
print(f"Total files uploaded: {len(mapping)}")
