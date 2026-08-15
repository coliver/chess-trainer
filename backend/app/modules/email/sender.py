import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL") or "http://localhost"


def send_verification_email(to_email: str, token: str) -> None:
    verify_link = f"{_frontend_url()}/verify-email?token={token}"

    text_body = (
        "Welcome to Knight School!\n\n"
        "Please verify your email address by visiting the link below:\n"
        f"{verify_link}\n\n"
        "This link expires in 24 hours."
    )
    html_body = (
        "<p>Welcome to Knight School!</p>"
        "<p>Please verify your email address by clicking the link below:</p>"
        f'<p><a href="{verify_link}">{verify_link}</a></p>'
        "<p>This link expires in 24 hours.</p>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your Knight School email"
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
