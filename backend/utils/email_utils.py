import os
import base64
from email.message import EmailMessage

from dotenv import load_dotenv

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

load_dotenv()

EMAIL_FROM = os.getenv("EMAIL_FROM")

GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN")

if not EMAIL_FROM:
    raise Exception("EMAIL_FROM is missing")

if not GMAIL_CLIENT_ID:
    raise Exception("GMAIL_CLIENT_ID is missing")

if not GMAIL_CLIENT_SECRET:
    raise Exception("GMAIL_CLIENT_SECRET is missing")

if not GMAIL_REFRESH_TOKEN:
    raise Exception("GMAIL_REFRESH_TOKEN is missing")


# ==========================================================
# Generic email sender using Gmail API (HTTPS)
# ==========================================================
def send_email(subject: str, to_email: str, body: str):
    try:
        print("STEP 1: Creating Gmail credentials...")

        creds = Credentials(
            token=None,
            refresh_token=GMAIL_REFRESH_TOKEN,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GMAIL_CLIENT_ID,
            client_secret=GMAIL_CLIENT_SECRET,
        )

        print("STEP 2: Refreshing access token...")
        print(EMAIL_FROM)
        creds.refresh(Request())

        print("STEP 3: Building Gmail service...")

        service = build("gmail", "v1", credentials=creds)

        message = EmailMessage()
        message["To"] = to_email
        message["From"] = EMAIL_FROM
        message["Subject"] = subject
        message.set_content(body)

        raw_message = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode()

        print("STEP 4: Sending email...")

        service.users().messages().send(
            userId="me",
            body={"raw": raw_message}
        ).execute()

        print("STEP 5: Email sent successfully!")

    except Exception as e:
        print("EMAIL ERROR:", repr(e))
        raise


# ==========================================================
# Email Verification OTP
# ==========================================================
def send_otp_email(to_email: str, otp: str):
    body = f"""
Hello,

Your CodeVerse email verification code is:

🔐 {otp}

This code will expire in 10 minutes.

If you did not sign up, please ignore this email.

— CodeVerse Team
"""

    send_email(
        subject="CodeVerse - Email Verification Code",
        to_email=to_email,
        body=body,
    )


# ==========================================================
# Invitation Email
# ==========================================================
def send_invitation_email(to_email: str, invite_link: str):
    body = f"""
Hello,

You have been invited to CodeVerse.

Click the link below to accept your invitation and access your assigned repositories.

{invite_link}

If you were not expecting this invitation, simply ignore this email.

— CodeVerse Team
"""

    send_email(
        subject="CodeVerse Repository Invitation",
        to_email=to_email,
        body=body,
    )


# ==========================================================
# Reset Password OTP
# ==========================================================
def send_reset_password_email(to_email: str, otp: str):
    body = f"""
Hello,

You requested to reset your CodeVerse password.

Your password reset code is:

🔐 {otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

— CodeVerse Team
"""

    send_email(
        subject="CodeVerse - Reset Password Code",
        to_email=to_email,
        body=body,
    )