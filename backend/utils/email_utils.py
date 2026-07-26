import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ------------------------------
# Gmail SMTP configuration
# ------------------------------
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")

if not EMAIL_FROM:
    raise Exception("❌ EMAIL_FROM environment variable is missing.")

if not EMAIL_APP_PASSWORD:
    raise Exception("❌ EMAIL_APP_PASSWORD environment variable is missing.")


# ==========================================================
# Generic email sender
# ==========================================================
def send_email(subject: str, to_email: str, body: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(body)

    try:
        print("STEP 1: Connecting...")

        server = smtplib.SMTP(
            SMTP_SERVER,
            SMTP_PORT,
            timeout=20
        )

        print("STEP 2: Connected")

        server.ehlo()

        print("STEP 3: Starting TLS")

        server.starttls()

        print("STEP 4: TLS OK")

        server.ehlo()

        print("STEP 5: Logging in")

        server.login(EMAIL_FROM, EMAIL_APP_PASSWORD)

        print("STEP 6: Logged in")

        server.send_message(msg)

        print("STEP 7: Email sent")

        server.quit()

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