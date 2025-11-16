#!/usr/bin/env python3
"""
Generates a batch of test markdown files for the Musings feature.
"""
import os
from pathlib import Path
import uuid

# --- Configuration ---
NUM_FILES = 100
# Note: This path is absolute. If you move the project, you might need to update it.
# It's often better to construct paths relative to the script's location.
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "misc_assets" / "musings_src"
DATE_STR = "2025-08-24T21:30:00"
PRIVACY = "private"
PINNED = "false"
CONTENT = "hahahahahahahah"
# ---

def create_musings_file():
    """Creates a single musing markdown file with a unique ID."""
    unique_id = f"testing-{uuid.uuid4().hex[:12]}"
    file_name = f"{unique_id}.md"
    file_path = OUTPUT_DIR / file_name

    frontmatter = f"""---
id: {unique_id}
date: {DATE_STR}
privacy: {PRIVACY}
pinned: {PINNED}
---"""

    content = f"{frontmatter}\n\n{CONTENT}\n"

    file_path.write_text(content, encoding="utf-8")
    return file_path

def main():
    """Generates a batch of test musing files."""
    if not OUTPUT_DIR.exists():
        print(f"Creating output directory: {OUTPUT_DIR}")
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Generating {NUM_FILES} test files in {OUTPUT_DIR}...")
    count = 0
    for _ in range(NUM_FILES):
        path = create_musings_file()
        count += 1
    print(f"Done. Created {count} files.")

if __name__ == "__main__":
    main()
