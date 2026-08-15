"""Apply a batch of {eco, name, description} entries (JSON array) to the
openings table, matched on (eco, name).

Usage: DATABASE_URL=... python scripts/apply_opening_descriptions.py path/to/batch.json
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from psycopg import connect
from psycopg.rows import dict_row


def load_env_file(path: str = ".env"):
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env_file(".env")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: apply_opening_descriptions.py <batch.json>")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL env var is required")
    database_url = re.sub(r"^postgresql\+[^:]+://", "postgresql://", database_url)

    entries = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))

    conn = connect(database_url, row_factory=dict_row)
    try:
        matched = 0
        unmatched = []
        with conn.cursor() as cur:
            for e in entries:
                cur.execute(
                    "update openings set description = %s where eco = %s and name = %s",
                    (e["description"], e["eco"], e["name"]),
                )
                if cur.rowcount == 0:
                    unmatched.append((e["eco"], e["name"]))
                else:
                    matched += cur.rowcount
        conn.commit()
        print(f"Matched/updated {matched} of {len(entries)} entries.")
        if unmatched:
            print(f"Unmatched ({len(unmatched)}):")
            for eco, name in unmatched:
                print(f"  {eco} | {name}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
