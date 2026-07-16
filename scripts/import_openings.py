from __future__ import annotations
import re
import csv
import os
import urllib.request
from pathlib import Path
import io
import chess
import chess.pgn

from psycopg import connect
from psycopg.rows import dict_row

TSV_URLS = {
    "a": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/a.tsv",
    "b": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/b.tsv",
    "c": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/c.tsv",
    "d": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/d.tsv",
    "e": "https://raw.githubusercontent.com/lichess-org/chess-openings/master/e.tsv",
}

REQUIRED_COLS = {"eco", "name", "pgn"}


def load_env_file(path: str = ".env"):
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env_file(".env")


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest.as_posix())


def load_tsv(
    tsv_path: Path,
) -> list[tuple[str, str, str | None, str | None, str | None]]:
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
            epd = None
            pgn = (r.get("pgn") or "").strip() or None
            uci_moves = None

            if not eco or not name:
                continue
            rows.append((eco, name, epd, pgn, uci_moves))
        return rows


def upsert_openings(
    conn, rows: list[tuple[str, str, str | None, str | None, str | None]]
) -> None:
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
            cur.executemany(
                sql.replace("values %s", "values (%s,%s,%s,%s,%s)"), rows[i : i + chunk]
            )
    conn.commit()


def compute_epd_and_uci(pgn: str) -> tuple[str, str]:
    pgn_text = pgn.strip()
    if not pgn_text:
        return None, None

    # If TSV pgn has no tags, chess.pgn.read_game can fail.
    # Prepend minimal tags.
    if "[" not in pgn_text.splitlines()[0]:
        pgn_text = (
            '[Event "Opening"]\n'
            '[Site "?"]\n'
            '[Date "????.??.??"]\n'
            '[Round "?"]\n'
            '[White "-"]\n'
            '[Black "-"]\n'
            '[Result "*"]\n\n' + pgn_text
        )

    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        raise RuntimeError(f"Could not parse PGN: {pgn[:80]}...")

    board = game.board()
    uci_moves: list[str] = []
    for move in game.mainline_moves():
        uci_moves.append(move.uci())
        board.push(move)

    # EPD = FEN without move numbers => first 4 fields of FEN
    epd = " ".join(board.fen().split(" ")[:4])
    return epd, " ".join(uci_moves)


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL env var is required")

    database_url = re.sub(r"^postgresql\+[^:]+://", "postgresql://", database_url)

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

            enriched = []
            for eco, name, _, pgn, _ in rows:
                epd, uci_moves = compute_epd_and_uci(pgn)
                enriched.append((eco, name, epd, pgn, uci_moves))

            upsert_openings(conn, enriched)

            total += len(rows)

        with conn.cursor() as cur:
            cur.execute("select count(*) from openings;")
            after = cur.fetchone()["count"]

        print(f"Processed {total} rows. openings count: {before} -> {after}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
