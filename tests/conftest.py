from pathlib import Path
import sys
from backend.app.app import app
from backend.app.routers.auth import hash_password
from backend.app.modules.users.models import User

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest
from sqlalchemy.orm import sessionmaker
from backend.app.modules.shared.db import engine, get_db


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
    print(f"DEBUG: app type is {type(app)}")  # Should say <class 'fastapi.applications.FastAPI'>
    app.dependency_overrides[get_db] = lambda: db
    yield
    app.dependency_overrides.clear()


import pytest


@pytest.fixture
def test_user(db):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("password123"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user
