import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_LANGUAGE = "en-US"
_LOCALES_DIR = Path(__file__).resolve().parents[4] / "frontend" / "packages" / "i18n-locales" / "locales"


@lru_cache
def _load_translations(language: str) -> dict:
    try:
        return json.loads((_LOCALES_DIR / f"{language}.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def supported_languages() -> set[str]:
    return {p.stem for p in _LOCALES_DIR.glob("*.json")}


def _verify_email_strings(language: str) -> dict[str, str]:
    en_strings = _load_translations(_DEFAULT_LANGUAGE).get("email", {}).get("verify", {})
    localized = _load_translations(language).get("email", {}).get("verify", {})

    strings = dict(en_strings)
    for key, value in localized.items():
        if key in strings and not value.startswith("[TODO"):
            strings[key] = value
    return strings


def send_verification_email(to_email: str, token: str, language: str = _DEFAULT_LANGUAGE) -> None:
    verify_link = f"{_frontend_url()}/verify-email?token={token}"
    strings = _verify_email_strings(language)

    text_body = (
        f"{strings['heading']}\n\n"
        f"{strings['instructions']}\n"
        f"{verify_link}\n\n"
        f"{strings['expires']}"
    )
    html_body = (
        f"<p>{strings['heading']}</p>"
        f"<p>{strings['instructionsHtml']}</p>"
        f'<p><a href="{verify_link}">{verify_link}</a></p>'
        f"<p>{strings['expires']}</p>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = strings["subject"]
    msg["From"] = os.getenv("SMTP_FROM_ADDRESS") or "no-reply@knightschool.click"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    host = os.getenv("SMTP_HOST")
    if not host:
        logger.info("SMTP_HOST not configured; skipping send. Verify link: %s", verify_link)
        return

    port = int(os.getenv("SMTP_PORT") or "587")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL") or "http://localhost"
