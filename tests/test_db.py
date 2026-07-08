import pytest
from unittest.mock import MagicMock

import backend.app.modules.shared.db as db_module


def test_get_db_yields_and_closes(monkeypatch):
    mock_session = MagicMock()
    monkeypatch.setattr(db_module, "SessionLocal", lambda: mock_session)

    gen = db_module.get_db()
    session = next(gen)

    assert session is mock_session

    with pytest.raises(StopIteration):
        next(gen)

    mock_session.close.assert_called_once()
