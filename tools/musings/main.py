#!/usr/bin/env python3
"""
Musings CLI: build encrypted/public blobs and manifest for the Musings page.

- Source directory (default: misc_assets/musings_src/) contains:
  - key.txt            (single passphrase line, UTF-8)
  - *.md               (one per post, with YAML frontmatter)

- Output directory (default: src/content/musings/) will contain:
  - manifest.json
  - data/<id>.json

Frontmatter schema (authoring):
---
id: <slug>                   # optional (derived from filename if absent)
date: 2025-08-24T21:30:00    # IST local; will be normalized to UTC
privacy: public | private
tags: [foo, bar]             # optional
pinned: false                # optional
---

Security:
- Single passphrase across all posts; derive per-post 32-byte key with scrypt (N=32768,r=8,p=1),
  new random 16-byte salt for each post. AES-256-GCM with 12-byte random IV.
- AAD binds ciphertext to id+version: f"musings:{id}:v1".

Usage:
  python tools/musings/main.py build --src misc_assets/musings_src --out src/content/musings
  python tools/musings/main.py add path/to/file.md --src misc_assets/musings_src --out src/content/musings
  python tools/musings/main.py validate --out src/content/musings [--key-file misc_assets/musings_src/key.txt]
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import frontmatter
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.backends import default_backend
from dateutil import parser as dtparser
from zoneinfo import ZoneInfo
from datetime import timezone

IST = ZoneInfo("Asia/Kolkata")


@dataclass
class ManifestEntry:
    id: str
    ts: str
    tier: str  # 'public' or 'master'
    path: str  # 'data/<id>.json'
    size: Optional[int] = None
    hash: Optional[str] = None


SLUG_RE = re.compile(r"[^a-z0-9\-]+")


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"\s+", "-", text)
    text = SLUG_RE.sub("", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-") or "post"


def read_key(key_file: Path) -> bytes:
    if not key_file.exists():
        raise FileNotFoundError(f"key file not found: {key_file}")
    key = key_file.read_text(encoding="utf-8").strip()
    if not key:
        raise ValueError("key file is empty")
    return key.encode("utf-8")


def parse_ts_ist_to_utc_iso(ts_in: str) -> str:
    if not ts_in:
        raise ValueError("date is required in frontmatter")
    dt = dtparser.parse(ts_in)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    # Normalize to UTC
    dt_utc = dt.astimezone(timezone.utc)
    iso = dt_utc.isoformat().replace("+00:00", "Z")
    return iso


def ensure_dirs(out_dir: Path) -> Path:
    data_dir = out_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def write_json(path: Path, obj: Dict[str, Any]) -> bytes:
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    # pretty can be added if desired; compact keeps file small
    path.write_text(data, encoding="utf-8")
    return data.encode("utf-8")


def file_sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def derive_key_scrypt(passphrase: bytes, salt: bytes, n: int = 32768, r: int = 8, p: int = 1, length: int = 32) -> bytes:
    kdf = Scrypt(salt=salt, length=length, n=n, r=r, p=p, backend=default_backend())
    return kdf.derive(passphrase)


def encrypt_private_blob(post: frontmatter.Post, post_id: str, ts_iso: str, passphrase: bytes) -> Dict[str, Any]:
    import os
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key_scrypt(passphrase, salt)
    aesgcm = AESGCM(key)

    ad_str = f"musings:{post_id}:v1"
    payload = {
        "md": post.content,
    }
    pt = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ct = aesgcm.encrypt(iv, pt, ad_str.encode("utf-8"))

    blob = {
        "v": 1,
        "id": post_id,
        "ts": ts_iso,
        "tier": "master",
        "kdf": {"name": "scrypt", "N": 32768, "r": 8, "p": 1, "salt": base64.b64encode(salt).decode("ascii")},
        "alg": "AES-256-GCM",
        "iv": base64.b64encode(iv).decode("ascii"),
        "ad": ad_str,
        "ct": base64.b64encode(ct).decode("ascii"),
    }
    return blob


def public_blob(post: frontmatter.Post, post_id: str, ts_iso: str) -> Dict[str, Any]:
    return {
        "v": 1,
        "id": post_id,
        "ts": ts_iso,
        "tier": "public",
        "md": post.content,
    }


def load_manifest(manifest_path: Path) -> List[Dict[str, Any]]:
    if not manifest_path.exists():
        return []
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []


def save_manifest(manifest_path: Path, entries: List[Dict[str, Any]]):
    # sort by ts desc
    entries_sorted = sorted(entries, key=lambda e: e.get("ts", ""), reverse=True)
    manifest_path.write_text(json.dumps(entries_sorted, ensure_ascii=False, indent=2), encoding="utf-8")


def process_post_file(md_path: Path, src_dir: Path, out_dir: Path, passphrase: Optional[bytes]) -> ManifestEntry:
    post = frontmatter.load(md_path)
    fm = post.metadata or {}

    # id
    post_id = fm.get("id") or slugify(md_path.stem)

    # ts (date) normalization
    ts_input = fm.get("date") or fm.get("ts")
    ts_iso = parse_ts_ist_to_utc_iso(str(ts_input))

    # privacy
    privacy = (fm.get("privacy") or "private").strip().lower()
    if privacy not in {"public", "private"}:
        raise ValueError(f"privacy must be 'public' or 'private' in {md_path}")

    data_dir = ensure_dirs(out_dir)
    blob_path = data_dir / f"{post_id}.json"

    if privacy == "public":
        blob = public_blob(post, post_id, ts_iso)
    else:
        if passphrase is None:
            raise ValueError("passphrase required for private posts")
        blob = encrypt_private_blob(post, post_id, ts_iso, passphrase)

    # write blob
    raw = json.dumps(blob, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    blob_path.write_bytes(raw)

    entry = ManifestEntry(
        id=post_id,
        ts=ts_iso,
        tier="public" if privacy == "public" else "master",
        path=f"data/{post_id}.json",
        size=len(raw),
        hash=file_sha256_bytes(raw),
    )
    return entry


def cmd_build(args: argparse.Namespace) -> int:
    src_dir = Path(args.src)
    out_dir = Path(args.out)
    key_file = src_dir / "key.txt"

    passphrase = None
    # Only read key if there will be private posts
    if any(p.suffix.lower() == ".md" for p in src_dir.glob("*.md")):
        if key_file.exists():
            passphrase = read_key(key_file)

    manifest_path = out_dir / "manifest.json"
    existing = load_manifest(manifest_path)
    by_id: Dict[str, Dict[str, Any]] = {e.get("id"): e for e in existing if isinstance(e, dict) and e.get("id")}

    processed_ids: set[str] = set()
    for md_path in sorted(src_dir.glob("*.md")):
        entry = process_post_file(md_path, src_dir, out_dir, passphrase)
        by_id[entry.id] = {
            "id": entry.id,
            "ts": entry.ts,
            "tier": entry.tier,
            "path": entry.path,
            "size": entry.size,
            "hash": entry.hash,
        }
        processed_ids.add(entry.id)

    # Preserve older blobs in manifest unless prune
    if args.prune:
        final_entries = [by_id[i] for i in processed_ids]
    else:
        final_entries = list(by_id.values())

    save_manifest(manifest_path, final_entries)
    print(f"Wrote manifest with {len(final_entries)} entries → {manifest_path}")
    return 0


def cmd_add(args: argparse.Namespace) -> int:
    src_dir = Path(args.src)
    out_dir = Path(args.out)
    md_path = Path(args.file)
    if not md_path.exists():
        md_path = src_dir / md_path
    if not md_path.exists():
        raise FileNotFoundError(f"markdown file not found: {args.file}")

    key_file = src_dir / "key.txt"
    passphrase = read_key(key_file) if key_file.exists() else None

    manifest_path = out_dir / "manifest.json"
    existing = load_manifest(manifest_path)
    by_id: Dict[str, Dict[str, Any]] = {e.get("id"): e for e in existing if isinstance(e, dict) and e.get("id")}

    entry = process_post_file(md_path, src_dir, out_dir, passphrase)
    by_id[entry.id] = {
        "id": entry.id,
        "ts": entry.ts,
        "tier": entry.tier,
        "path": entry.path,
        "size": entry.size,
        "hash": entry.hash,
    }

    save_manifest(manifest_path, list(by_id.values()))
    print(f"Added/updated entry {entry.id}")
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    out_dir = Path(args.out)
    manifest_path = out_dir / "manifest.json"
    entries = load_manifest(manifest_path)
    data_dir = out_dir / "data"

    # Optional decryption check
    passphrase: Optional[bytes] = None
    if args.key_file:
        passphrase = read_key(Path(args.key_file))

    failures: List[str] = []

    for e in entries:
        try:
            blob_path = out_dir / e.get("path", "")
            if not blob_path.exists():
                failures.append(f"missing blob: {e.get('id')} -> {blob_path}")
                continue
            obj = json.loads(blob_path.read_text(encoding="utf-8"))
            if obj.get("tier") == "master" and passphrase is not None:
                # Try decrypt
                salt = base64.b64decode(obj["kdf"]["salt"])  # type: ignore
                iv = base64.b64decode(obj["iv"])  # type: ignore
                ct = base64.b64decode(obj["ct"])  # type: ignore
                key = derive_key_scrypt(passphrase, salt)
                ad = (obj.get("ad") or f"musings:{obj['id']}:v{obj.get('v',1)}").encode("utf-8")  # type: ignore
                AESGCM(key).decrypt(iv, ct, ad)
        except Exception as ex:
            failures.append(f"{e.get('id')}: {ex}")

    if failures:
        print("Validation failures:")
        for f in failures:
            print(" -", f)
        return 2
    print(f"Validated {len(entries)} entries successfully.")
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Musings builder")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_build = sub.add_parser("build", help="Build blobs and manifest from source directory")
    p_build.add_argument("--src", default="misc_assets/musings_src", help="Source directory with *.md and key.txt")
    p_build.add_argument('--out', required=True, help='Output directory for blobs and manifest')
    p_build.add_argument('--prune', action='store_true', help='Remove blobs not in source dir')
    p_build.set_defaults(func=cmd_build)

    p_add = sub.add_parser("add", help="Add/update a single markdown file")
    p_add.add_argument("file", help="Path to markdown file (relative to --src allowed)")
    p_add.add_argument("--src", default="misc_assets/musings_src", help="Source directory with key.txt")
    p_add.add_argument("--out", default="public/musings", help="Output musings directory")
    p_add.set_defaults(func=cmd_add)

    p_val = sub.add_parser("validate", help="Validate manifest and blobs; optionally decrypt with key")
    p_val.add_argument("--out", default="public/musings", help="Output musings directory")
    p_val.add_argument("--key-file", help="Optional key file to attempt decryption")
    p_val.set_defaults(func=cmd_validate)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
