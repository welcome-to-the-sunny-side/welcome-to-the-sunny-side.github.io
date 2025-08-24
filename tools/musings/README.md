# Musings CLI

Builds encrypted/public blobs and a manifest for the single-page Musings stream.

- Source (gitignored): `misc_assets/musings_src/`
  - `key.txt` — passphrase (UTF-8). One line. Used for all private posts.
  - `*.md` — one file per post with YAML frontmatter + Markdown body.

Frontmatter example (authored in IST):

```yaml
---
id: my-first-musing
date: 2025-08-24T21:30:00
privacy: private   # or public
title: Optional Title
tags: [foo, bar]
pinned: false
---
Body in Markdown...
```

Output (committed): `src/content/musings/`
- `manifest.json` — ordered list of posts `{ id, ts (UTC ISO), tier, path, size, hash }`
- `data/<id>.json` — per-post blob
  - `tier: "public"` → `{ v, id, ts, tier, md, meta }`
  - `tier: "master"` → `{ v, id, ts, tier, kdf, alg, iv, ad, ct }` (AES-256-GCM; scrypt derived key)

Notes
- Only timestamp is visible for private posts until unlocked.
- Public posts also go through the blob pipeline, so they are not `grep`-indexed.
- Single passphrase across all posts (strong/long is recommended).
- Author in IST; times are normalized to UTC in blobs, then rendered as local time in UI.

## Install

JavaScript (for client-side scrypt):

```bash
npm install
```

Python (for the CLI):

```bash
python3 -m pip install -r tools/musings/requirements.txt
```

## Commands

```bash
# Build all posts from source directory → blobs + manifest (preserves old blobs by default)
python3 tools/musings/main.py build --src misc_assets/musings_src --out public/musings

# Add or update a single file
python3 tools/musings/main.py add my-post.md --src misc_assets/musings_src --out public/musings

# Validate blobs/manifest; optionally verify decryption with a key
python3 tools/musings/main.py validate --out public/musings --key-file misc_assets/musings_src/key.txt
```

Use `--prune` with `build` to remove blobs that no longer exist in the source dir.
