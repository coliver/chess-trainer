# tests/test_routers_openings.py
#
# Note: the dev DB carries a real seeded openings dataset that this module's
# transaction-rollback `db` fixture doesn't hide (it was committed outside
# any test), so these tests use ECO codes unlikely to collide ("ZZ9x") and
# assert on membership/relative order rather than exact/empty result sets.
from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.modules.openings.models import Opening


def test_list_openings_includes_rows_with_uci_moves_and_name(db):
    # The autouse seed_openings fixture adds C00/D10/D30/B20 with no
    # uci_moves — the endpoint must filter those out, but should surface
    # a real row that does have both uci_moves and a name.
    db.add(
        Opening(
            eco="ZZ90",
            name="Anderssen's Opening (test)",
            epd="fen-zz90",
            pgn="1. a3",
            uci_moves="a2a3",
            description="A quiet flank opening.",
        )
    )
    db.commit()

    with TestClient(app) as client:
        r = client.get("/openings")

    assert r.status_code == 200
    body = r.json()
    assert {
        "eco": "ZZ90",
        "name": "Anderssen's Opening (test)",
        "epd": "fen-zz90",
        "pgn": "1. a3",
        "uci_moves": "a2a3",
        "description": "A quiet flank opening.",
    } in body
    # Openings with no uci_moves (like the autouse-seeded ones) never appear.
    assert all(row["uci_moves"] is not None for row in body)


def test_list_openings_orders_by_eco_then_name(db):
    db.add_all(
        [
            Opening(eco="ZZ91", name="Scandinavian Defense (test)", uci_moves="e2e4 d7d5"),
            Opening(eco="ZZ90", name="Van't Kruijs Opening (test)", uci_moves="e2e3"),
            Opening(eco="ZZ90", name="Anderssen's Opening (test)", uci_moves="a2a3"),
        ]
    )
    db.commit()

    with TestClient(app) as client:
        r = client.get("/openings")

    assert r.status_code == 200
    names = [row["name"] for row in r.json() if row["eco"] in ("ZZ90", "ZZ91")]
    assert names == [
        "Anderssen's Opening (test)",
        "Van't Kruijs Opening (test)",
        "Scandinavian Defense (test)",
    ]
