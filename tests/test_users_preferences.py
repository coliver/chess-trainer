# tests/test_users_preferences.py
import operator

import pytest
from fastapi import HTTPException

from backend.app.modules.users.models import User
from backend.app.routers.users import (
    PreferencesOut,
    PreferencesUpdate,
    get_preferences,
    update_preferences,
)


class FakeQuery:
    def __init__(self, items):
        self._items = list(items)
        self._pred = None

    def _build_pred(self, clause):
        # OR/AND groups
        if hasattr(clause, "clauses") and isinstance(clause.clauses, (list, tuple)):
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


def test_get_preferences_returns_current_values():
    """Test that get_preferences returns all preference fields with correct values."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="de",
        theme="dark",
        board_theme="green",
        piece_set="staunty",
        show_coordinates=False,
        board_animations=False,
        board_orientation_mode="white",
    )

    result = get_preferences(current_user=user)

    assert isinstance(result, PreferencesOut)
    assert result.language == "de"
    assert result.theme == "dark"
    assert result.board_theme == "green"
    assert result.piece_set == "staunty"
    assert result.show_coordinates is False
    assert result.board_animations is False
    assert result.board_orientation_mode == "white"


def test_update_preferences_updates_one_field_without_touching_others():
    """Test that updating one field doesn't affect others."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    result = update_preferences(
        req=PreferencesUpdate(theme="dark"),
        current_user=user,
        db=db,
    )

    # Check the returned object
    assert result.theme == "dark"
    assert result.language == "en-US"
    assert result.board_theme == "default"
    assert result.piece_set == "standard"
    assert result.show_coordinates is True
    assert result.board_animations is True
    assert result.board_orientation_mode == "auto"

    # Check the user object was mutated
    assert user.theme == "dark"
    assert user.language == "en-US"
    assert user.board_theme == "default"


def test_update_preferences_rejects_invalid_board_theme():
    """Test that invalid board_theme raises 422."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    with pytest.raises(HTTPException) as e:
        update_preferences(
            req=PreferencesUpdate(board_theme="not-a-real-theme"),
            current_user=user,
            db=db,
        )

    assert e.value.status_code == 422


def test_update_preferences_rejects_invalid_theme():
    """Test that invalid theme raises 422."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    with pytest.raises(HTTPException) as e:
        update_preferences(
            req=PreferencesUpdate(theme="not-a-real-theme"),
            current_user=user,
            db=db,
        )

    assert e.value.status_code == 422


def test_update_preferences_rejects_invalid_piece_set():
    """Test that invalid piece_set raises 422."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    with pytest.raises(HTTPException) as e:
        update_preferences(
            req=PreferencesUpdate(piece_set="wood"),
            current_user=user,
            db=db,
        )

    assert e.value.status_code == 422


def test_update_preferences_rejects_invalid_board_orientation_mode():
    """Test that invalid board_orientation_mode raises 422."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    with pytest.raises(HTTPException) as e:
        update_preferences(
            req=PreferencesUpdate(board_orientation_mode="sideways"),
            current_user=user,
            db=db,
        )

    assert e.value.status_code == 422


def test_update_preferences_language_rejects_unsupported():
    """Test that unsupported language raises 422."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    with pytest.raises(HTTPException) as e:
        update_preferences(
            req=PreferencesUpdate(language="not-a-locale"),
            current_user=user,
            db=db,
        )

    assert e.value.status_code == 422


def test_update_preferences_language_accepts_supported():
    """Test that supported language is accepted and updates user."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="en-US",
        theme="system",
        board_theme="default",
        piece_set="standard",
        show_coordinates=True,
        board_animations=True,
        board_orientation_mode="auto",
    )
    db = FakeDB(users=[user])

    result = update_preferences(
        req=PreferencesUpdate(language="de"),
        current_user=user,
        db=db,
    )

    assert result.language == "de"
    assert user.language == "de"


def test_update_preferences_partial_update_with_no_fields_is_noop():
    """Test that updating with no fields specified is a no-op."""
    user = User(
        id=1,
        email="alice@example.com",
        username="alice",
        password_hash="hashed",
        is_active=True,
        language="de",
        theme="dark",
        board_theme="green",
        piece_set="staunty",
        show_coordinates=False,
        board_animations=False,
        board_orientation_mode="white",
    )
    db = FakeDB(users=[user])

    result = update_preferences(
        req=PreferencesUpdate(),  # All fields None
        current_user=user,
        db=db,
    )

    # All values should be unchanged
    assert result.language == "de"
    assert result.theme == "dark"
    assert result.board_theme == "green"
    assert result.piece_set == "staunty"
    assert result.show_coordinates is False
    assert result.board_animations is False
    assert result.board_orientation_mode == "white"

    # User object should be unchanged
    assert user.language == "de"
    assert user.theme == "dark"
    assert user.board_theme == "green"
    assert user.piece_set == "staunty"
    assert user.show_coordinates is False
    assert user.board_animations is False
    assert user.board_orientation_mode == "white"
