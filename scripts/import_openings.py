from __future__ import annotations

import csv
import os
import urllib.request
from pathlib import Path

from psycopg import connect
from psycopg.rows import dict_row


TSV_URLS = {
    "a": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/a.tsv",
    "b": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/b.tsv",
    "c": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/c.tsv",
    "d": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/d.tsv",
    "e": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/e.tsv",
}

REQUIRED_COLS = {"eco", "name", "pgn", "uci", "epd"}


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest.as_posix())


def load_tsv(tsv_path: Path) -> list[tuple[str, str, str | None, str | None, str | None]]:
    with tsv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        if not reader.fieldnames:
            raise RuntimeError(f"No headers in {tsv_path}")

        missing = REQUIRED_COLS - set(reader.fieldnames)
        if missing:
            raise RuntimeError(f"{tsv_path.name} missing columns: {sorted(missing)}")

        rows: list[tuple[str, str, str | None, str | None, str | None]] = []
        for r in reader:
            eco = (r.get("eco") or "").strip()
            name = (r.get("name") or "").strip()
            epd = (r.get("epd") or "").strip() or None
            pgn = (r.get("pgn") or "").strip() or None
            uci_moves = (r.get("uci") or "").strip() or None

            if not eco or not name:
                continue
            rows.append((eco, name, epd, pgn, uci_moves))
        return rows


def upsert_openings(conn, rows: list[tuple[str, str, str | None, str | None, str | None]]) -> None:
    sql = """
      insert into openings (eco, name, epd, pgn, uci_moves)
      values %s
      on conflict (eco, name) do update set
        epd = excluded.epd,
        pgn = excluded.pgn,
        uci_moves = excluded.uci_moves
    """
    # psycopg (v3) supports passing arrays/values via executemany
    with conn.cursor() as cur:
        # chunk to keep memory sane
        chunk = 2000
        for i in range(0, len(rows), chunk):
            cur.executemany(sql.replace("values %s", "values (%s,%s,%s,%s,%s)"), rows[i:i+chunk])
    conn.commit()


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL env var is required")

    workdir = Path(os.environ.get("TSV_WORKDIR", "./tmp_openings_tsv"))
    conn = connect(database_url, row_factory=dict_row)
    try:
        with conn.cursor() as cur:
            cur.execute("select count(*) from openings;")
            before = cur.fetchone()["count"]

        total = 0
        for key, url in TSV_URLS.items():
            tsv_path = workdir / f"{key}.tsv"
            if not tsv_path.exists():
                print(f"Downloading {key}.tsv ...")
                download(url, tsv_path)

            rows = load_tsv(tsv_path)
            print(f"{key}.tsv: {len(rows)} rows")
            upsert_openings(conn, rows)
            total += len(rows)

        with conn.cursor() as cur:
            cur.execute("select count(*) from openings;")
            after = cur.fetchone()["count"]

        print(f"Processed {total} rows. openings count: {before} -> {after}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
