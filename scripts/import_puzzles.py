"""Import a curated subset of the Lichess puzzle database (CC0).

Source: https://database.lichess.org/#puzzles (lichess_db_puzzle.csv.zst)

The full file is ~4M rows / several GB, so this script downloads it once,
streams it decompressed (never materializing the whole CSV in memory), and
keeps only a curated subset: the most popular puzzles spread evenly across
rating buckets, so training covers a range of difficulty.
"""

from __future__ import annotations

import csv
import io
import os
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

import zstandard
from psycopg import connect
from psycopg.rows import dict_row

PUZZLE_DB_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"

RATING_BUCKET_SIZE = 200
RATING_MIN = 600
RATING_MAX = 2600
PER_BUCKET = 800  # ~10 buckets * 800 = ~8000 puzzles

REQUIRED_COLS = {"PuzzleId", "FEN", "Moves", "Rating", "Popularity", "NbPlays", "Themes"}


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


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest.as_posix())


def bucket_of(rating: int) -> int:
    return max(RATING_MIN, min(RATING_MAX, (rating // RATING_BUCKET_SIZE) * RATING_BUCKET_SIZE))


def select_subset(csv_path: Path) -> list[tuple]:
    """Stream the decompressed CSV and keep the top-N-by-popularity rows per
    rating bucket, without ever loading the full file into memory."""
    buckets: dict[int, list[tuple]] = defaultdict(list)

    dctx = zstandard.ZstdDecompressor()
    with csv_path.open("rb") as fh, dctx.stream_reader(fh) as reader:
        text_stream = io.TextIOWrapper(reader, encoding="utf-8", newline="")
        csv_reader = csv.DictReader(text_stream)
        if not csv_reader.fieldnames:
            raise RuntimeError(f"No headers in {csv_path}")
        missing = REQUIRED_COLS - set(csv_reader.fieldnames)
        if missing:
            raise RuntimeError(f"puzzle csv missing columns: {sorted(missing)}")

        for row in csv_reader:
            try:
                rating = int(row["Rating"])
                popularity = int(row["Popularity"])
                nb_plays = int(row["NbPlays"])
            except (ValueError, KeyError):
                continue

            if rating < RATING_MIN or rating > RATING_MAX:
                continue

            bucket = bucket_of(rating)
            entry = (
                row["PuzzleId"],
                row["FEN"],
                row["Moves"],
                rating,
                popularity,
                nb_plays,
                row.get("Themes") or None,
            )

            bucket_list = buckets[bucket]
            if len(bucket_list) < PER_BUCKET:
                bucket_list.append(entry)
            else:
                # replace the least-popular kept row if this one is more popular
                min_idx = min(range(len(bucket_list)), key=lambda i: bucket_list[i][4])
                if bucket_list[min_idx][4] < popularity:
                    bucket_list[min_idx] = entry

    rows: list[tuple] = []
    for bucket_list in buckets.values():
        rows.extend(bucket_list)
    return rows


def upsert_puzzles(conn, rows: list[tuple]) -> None:
    sql = """
      insert into puzzles (id, fen, moves, rating, popularity, nb_plays, themes)
      values (%s,%s,%s,%s,%s,%s,%s)
      on conflict (id) do update set
        fen = excluded.fen,
        moves = excluded.moves,
        rating = excluded.rating,
        popularity = excluded.popularity,
        nb_plays = excluded.nb_plays,
        themes = excluded.themes
    """
    with conn.cursor() as cur:
        chunk = 2000
        for i in range(0, len(rows), chunk):
            cur.executemany(sql, rows[i : i + chunk])
    conn.commit()


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL env var is required")
    database_url = re.sub(r"^postgresql\+[^:]+://", "postgresql://", database_url)

    workdir = Path(os.environ.get("PUZZLE_WORKDIR", "./tmp_puzzles"))
    csv_zst_path = workdir / "lichess_db_puzzle.csv.zst"

    if not csv_zst_path.exists():
        print("Downloading lichess_db_puzzle.csv.zst (this is several GB, one-time)...")
        download(PUZZLE_DB_URL, csv_zst_path)

    print("Selecting curated subset by rating bucket...")
    rows = select_subset(csv_zst_path)
    bucket_count = len({r[3] // RATING_BUCKET_SIZE for r in rows})
    print(f"Selected {len(rows)} puzzles across {bucket_count} rating buckets")

    conn = connect(database_url, row_factory=dict_row)
    try:
        with conn.cursor() as cur:
            cur.execute("select count(*) from puzzles;")
            before = cur.fetchone()["count"]

        upsert_puzzles(conn, rows)

        with conn.cursor() as cur:
            cur.execute("select count(*) from puzzles;")
            after = cur.fetchone()["count"]

        print(f"puzzles count: {before} -> {after}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
