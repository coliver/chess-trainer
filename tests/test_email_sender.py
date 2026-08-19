from unittest.mock import MagicMock, patch

from backend.app.modules.email import sender


def test_send_verification_email_skips_when_smtp_host_unset(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)

    with patch("backend.app.modules.email.sender.smtplib.SMTP") as mock_smtp:
        sender.send_verification_email("user@example.com", "sometoken")

    mock_smtp.assert_not_called()


def test_send_verification_email_sends_via_smtp(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "user")
    monkeypatch.setenv("SMTP_PASSWORD", "pass")
    monkeypatch.setenv("FRONTEND_URL", "https://knightschool.click")

    mock_conn = MagicMock()
    mock_smtp_cls = MagicMock()
    mock_smtp_cls.return_value.__enter__.return_value = mock_conn

    with patch("backend.app.modules.email.sender.smtplib.SMTP", mock_smtp_cls):
        sender.send_verification_email("user@example.com", "sometoken")

    mock_smtp_cls.assert_called_once_with("smtp.example.com", 587, timeout=10)
    mock_conn.starttls.assert_called_once()
    mock_conn.login.assert_called_once_with("user", "pass")
    mock_conn.send_message.assert_called_once()

    sent_msg = mock_conn.send_message.call_args[0][0]
    assert sent_msg["To"] == "user@example.com"
    body = sent_msg.get_payload(0).get_payload()
    assert "https://knightschool.click/verify-email?token=sometoken" in body


def test_send_verification_email_swallows_smtp_errors(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    mock_smtp_cls = MagicMock(side_effect=OSError("connection refused"))

    with patch("backend.app.modules.email.sender.smtplib.SMTP", mock_smtp_cls):
        sender.send_verification_email("user@example.com", "sometoken")  # must not raise


def test_send_verification_email_uses_requested_language(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")

    mock_conn = MagicMock()
    mock_smtp_cls = MagicMock()
    mock_smtp_cls.return_value.__enter__.return_value = mock_conn

    with patch("backend.app.modules.email.sender.smtplib.SMTP", mock_smtp_cls):
        sender.send_verification_email("user@example.com", "sometoken", "de")

    sent_msg = mock_conn.send_message.call_args[0][0]
    assert sent_msg["Subject"] == "Bestätige deine Knight-School-E-Mail"

    part = sent_msg.get_payload(0)
    body = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8")

    assert "Willkommen bei Knight School!" in body


def test_send_verification_email_falls_back_to_english_for_unknown_language(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")

    mock_conn = MagicMock()
    mock_smtp_cls = MagicMock()
    mock_smtp_cls.return_value.__enter__.return_value = mock_conn

    with patch("backend.app.modules.email.sender.smtplib.SMTP", mock_smtp_cls):
        sender.send_verification_email("user@example.com", "sometoken", "xx-not-a-locale")

    sent_msg = mock_conn.send_message.call_args[0][0]
    assert sent_msg["Subject"] == "Verify your Knight School email"


def test_verify_email_strings_skips_untranslated_todo_placeholders():
    sender._load_translations.cache_clear()
    strings = sender._verify_email_strings("en-US")  # en-US has no [TODO ..] placeholders
    assert not any(v.startswith("[TODO") for v in strings.values())


def test_supported_languages_includes_known_locales():
    languages = sender.supported_languages()
    assert {"en-US", "de", "es", "fr"}.issubset(languages)
