# tests/test_auth_router.py
import operator
import pytest
import os
import jwt
from fastapi import HTTPException
from backend.app.routers.auth import _jwt_secret

from backend.app.routers.auth import (
    register,
    login,
    get_current_user,
    RegisterRequest,
    LoginRequest,
    hash_password,
)

from backend.app.modules.users.models import User


class FakeQuery:
    def __init__(self, items):
        self._items = list(items)
        self._pred = None

    def _build_pred(self, clause):
        # OR/AND groups
        if hasattr(clause, "clauses") and isinstance(getattr(clause, "clauses"), (list, tuple)):
            sub_preds = [self._build_pred(c) for c in clause.clauses]
            op = getattr(clause, "operator", None)
            op_s = str(op)
            if op is operator.or_ or "or" in op_s.lower():
                return lambda obj: any(p(obj) for p in sub_preds)
            if op is operator.and_ or "and" in op_s.lower():
                return lambda obj: all(p(obj) for p in sub_preds)
            return lambda obj: any(p(obj) for p in sub_preds)

        # Simple binary comparisons: User.email == "x"
        left = getattr(clause, "left", None)
        right = getattr(clause, "right", None)
        if left is not None and right is not None:
            key = getattr(left, "key", None) or getattr(left, "name", None)
            if key is None:
                # fallback: try stringifying left
                key = str(left)
            val = getattr(right, "value", None)
            if val is None:
                val = right
            return lambda obj: getattr(obj, key) == val

        raise TypeError(f"Unsupported filter clause: {clause!r}")

    def filter(self, *clauses):
        clauses = list(clauses)
        if not clauses:
            return self

        def pred(obj):
            return all(self._build_pred(c)(obj) for c in clauses)

        self._pred = pred if self._pred is None else (lambda obj: self._pred(obj) and pred(obj))
        return self

    def first(self):
        items = self._items
        if self._pred is not None:
            items = [x for x in items if self._pred(x)]
        return items[0] if items else None


class FakeDB:
    def __init__(self, users=None):
        self.users = list(users or [])
        self._next_id = 1 + max([u.id for u in self.users], default=0)
        self._pending = []

    def query(self, model):
        if model is not User:
            raise TypeError("FakeDB only supports User queries")
        return FakeQuery(self.users)

    def add(self, obj):
        self._pending.append(obj)

    def commit(self):
        for obj in self._pending:
            if getattr(obj, "id", None) is None:
                obj.id = self._next_id
                self._next_id += 1
            if obj not in self.users:
                self.users.append(obj)
        self._pending.clear()

    def refresh(self, obj):
        return obj


@pytest.fixture
def jwt_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "testsecret")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    monkeypatch.setenv("JWT_EXPIRES_MINUTES", "60")


def test_register_creates_user_when_unique(jwt_env):
    db = FakeDB(users=[])

    req = RegisterRequest(email="a@example.com", username="alice", password="pw123")
    out = register(req, db=db)

    assert "id" in out and out["email"] == "a@example.com" and out["username"] == "alice"
    assert len(db.users) == 1
    assert db.users[0].email == "a@example.com"
    assert db.users[0].username == "alice"
    assert db.users[0].is_active is True
    assert db.users[0].password_hash != "pw123"


def test_register_duplicate_email_409(jwt_env):
    existing = User(
        id=1,
        email="a@example.com",
        username="bob",
        password_hash=hash_password("pw"),
        is_active=True,
    )
    db = FakeDB(users=[existing])

    req = RegisterRequest(email="a@example.com", username="alice", password="pw123")
    with pytest.raises(HTTPException) as e:
        register(req, db=db)

    assert e.value.status_code == 409
    assert e.value.detail == "Email or username already exists"


def test_login_requires_email_or_username_400(jwt_env):
    db = FakeDB(users=[])
    req = LoginRequest(email=None, username=None, password="pw123")

    with pytest.raises(HTTPException) as e:
        login(req, db=db)

    assert e.value.status_code == 400
    assert e.value.detail == "Provide email or username"


def test_login_unknown_user_401(jwt_env):
    db = FakeDB(users=[])

    req = LoginRequest(email="missing@example.com", username=None, password="pw123")
    with pytest.raises(HTTPException) as e:
        login(req, db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Invalid credentials"


def test_login_wrong_password_401(jwt_env):
    u = User(
        id=1,
        email="a@example.com",
        username="alice",
        password_hash=hash_password("correct"),
        is_active=True,
    )
    db = FakeDB(users=[u])

    req = LoginRequest(email="a@example.com", username=None, password="wrong")
    with pytest.raises(HTTPException) as e:
        login(req, db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Invalid credentials"


def test_login_success_returns_access_token(jwt_env):
    u = User(
        id=1,
        email="a@example.com",
        username="alice",
        password_hash=hash_password("correct"),
        is_active=True,
    )
    db = FakeDB(users=[u])

    req = LoginRequest(email="a@example.com", username=None, password="correct")
    out = login(req, db=db)

    assert out["id"] == 1
    assert out["email"] == "a@example.com"
    assert out["username"] == "alice"
    assert out["token_type"] == "Bearer"
    assert isinstance(out["access_token"], str) and out["access_token"]

    # Verify token payload
    payload = jwt.decode(
        out["access_token"],
        os.environ["JWT_SECRET"],
        algorithms=[os.environ.get("JWT_ALGORITHM", "HS256")],
    )
    assert payload["sub"] == "1"


def test_login_by_username_success_returns_access_token(jwt_env):
    u = User(
        id=1,
        email="a@example.com",
        username="alice",
        password_hash=hash_password("correct"),
        is_active=True,
    )
    db = FakeDB(users=[u])

    req = LoginRequest(email=None, username="alice", password="correct")
    out = login(req, db=db)

    assert out["id"] == 1
    assert out["username"] == "alice"
    assert out["token_type"] == "Bearer"
    assert isinstance(out["access_token"], str) and out["access_token"]


def test_get_current_user_missing_bearer_401(jwt_env):
    db = FakeDB(users=[])
    with pytest.raises(HTTPException) as e:
        get_current_user(authorization=None, db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Missing Bearer token"


def test_get_current_user_invalid_token_401(jwt_env):
    db = FakeDB(users=[])
    with pytest.raises(HTTPException) as e:
        get_current_user(authorization="Bearer not-a-real-token", db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Invalid token"


def test_get_current_user_missing_sub_raises_401(jwt_env, monkeypatch):
    db = FakeDB(users=[])

    # Force jwt.decode to succeed but return payload without "sub"
    import backend.app.routers.auth as auth_mod

    monkeypatch.setattr(auth_mod.jwt, "decode", lambda *args, **kwargs: {})

    with pytest.raises(HTTPException) as e:
        get_current_user(authorization="Bearer any-token", db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Invalid token"


def test_get_current_user_inactive_user_401(jwt_env):
    inactive = User(
        id=1,
        email="a@example.com",
        username="alice",
        password_hash=hash_password("pw"),
        is_active=False,
    )
    db = FakeDB(users=[inactive])

    token = jwt.encode(
        {"sub": "1", "iat": 0, "exp": 9_999_999_999},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as e:
        get_current_user(authorization=f"Bearer {token}", db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Invalid token"


def test_get_current_user_success(jwt_env):
    active = User(
        id=1,
        email="a@example.com",
        username="alice",
        password_hash=hash_password("pw"),
        is_active=True,
    )
    db = FakeDB(users=[active])

    token = jwt.encode(
        {"sub": "1", "iat": 0, "exp": 9_999_999_999},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    out = get_current_user(authorization=f"Bearer {token}", db=db)

    assert out.id == 1
    assert out.email == "a@example.com"
    assert out.is_active is True


def test_jwt_secret_not_configured_raises_500(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(HTTPException) as e:
        _jwt_secret()

    assert e.value.status_code == 500
    assert e.value.detail == "JWT_SECRET not configured"


def test_get_current_user_invalid_token_raises_401(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "testsecret")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")

    db = FakeDB(users=[])  # should fail before DB is used

    with pytest.raises(HTTPException) as e:
        get_current_user(authorization="Bearer definitely-not-a-jwt", db=db)

    assert e.value.status_code == 401
    assert e.value.detail == "Invalid token"
