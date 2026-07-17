from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest
from sqlalchemy.orm import sessionmaker
from backend.app.modules.shared.db import engine, get_db
from backend.app.app import app


@pytest.fixture()
def db():
    print("DB FIXTURE")
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    connection = engine.connect()
    trans = connection.begin()

    session = SessionLocal(bind=connection)
    try:
        print("DB TRY")
        yield session
    finally:
        print("DB Finally")
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture(autouse=True)
def override_get_db(db):
    print("OVERRIDE GET DB")
    app.dependency_overrides[get_db] = lambda: db
    yield
    app.dependency_overrides.clear()
