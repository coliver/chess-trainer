"""Apply all unapplied opening description batches from scripts/opening_descriptions_batch*.json.

Scans the scripts directory for batch files and applies them in order.
Safe to re-run—uses UPDATE...WHERE matching (idempotent).

Usage: DATABASE_URL=... python backend/scripts/apply_all_description_batches.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from psycopg import connect
from psycopg.rows import dict_row

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.config import load_env_file

load_env_file(".env")


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL env var is required")
    database_url = re.sub(r"^postgresql\+[^:]+://", "postgresql://", database_url)

    scripts_dir = Path(__file__).parent.parent.parent / "scripts"
    batch_files = sorted(scripts_dir.glob("opening_descriptions_batch*.json"))

    if not batch_files:
        print("No batch files found.")
        return

    conn = connect(database_url, row_factory=dict_row)
    try:
        total_matched = 0
        for batch_file in batch_files:
            entries = json.loads(batch_file.read_text(encoding="utf-8"))
            matched = 0
            with conn.cursor() as cur:
                for e in entries:
                    cur.execute(
                        "update openings set description = %s where eco = %s and name = %s",
                        (e["description"], e["eco"], e["name"]),
                    )
                    matched += cur.rowcount
            conn.commit()
            total_matched += matched
            print(f"{batch_file.name}: {matched}/{len(entries)} matched")

        print(f"\nTotal matched/updated: {total_matched}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
