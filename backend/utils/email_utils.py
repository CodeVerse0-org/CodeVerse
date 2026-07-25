import smtplib
import os
import socket
from email.message import EmailMessage

# ------------------------------
# Force IPv4 Socket Resolution (Fixes Network Unreachable / IPv6 Issues)
# ------------------------------
old_getaddrinfo = socket.getaddrinfo

def new_getaddrinfo(*args, **kwargs):
    # Force socket to resolve ONLY IPv4 addresses (AF_INET)
    responses = old_getaddrinfo(*args, **kwargs)
    return [response for response in responses if response[0] == socket.AF_INET]

socket.getaddrinfo = new_getaddrinfo

# ------------------------------
# Gmail SMTP Configuration (TLS / Port 587)
# ------------------------------
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

SENDER_EMAIL = os.getenv("SENDER_EMAIL", "codeverse12345@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "kmpa wehp uubo vohd")

# ------------------------------
# HELPER TO SEND EMAIL VIA TLS (PORT 587)
# ------------------------------
def _send_email_tls(msg: EmailMessage):
    """Sends an email using SMTP + STARTTLS on port 587 to prevent 'Network is unreachable' errors."""
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
        server.ehlo()
        server.starttls()  # Upgrade connection to secure TLS
        server.ehlo()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)

# ------------------------------
# OTP EMAIL
# ------------------------------
def send_otp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg["Subject"] = "CodeVerse - Email Verification Code"
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email

    msg.set_content(f"""
Hello,

Your CodeVerse email verification code is:

🔐 {otp}

This code will expire in 10 minutes.

If you did not sign up, please ignore this email.

— CodeVerse Team
""")

    try:
        _send_email_tls(msg)
        print(f"✅ OTP email sent to {to_email}")
    except Exception as e:
        print(f"❌ OTP email send failed: {e}")
        raise

# ------------------------------
# INVITATION EMAIL
# ------------------------------
def send_invitation_email(to_email: str, invite_link: str):
    msg = EmailMessage()
    msg["Subject"] = "CodeVerse Repository Invitation"
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email

    msg.set_content(f"""
Hello,

You have been invited to CodeVerse.

Click the link below to accept your invitation and access assigned repositories:

🔗 {invite_link}

If you did not expect this invitation, please ignore this email.

— CodeVerse Team
""")

    try:
        _send_email_tls(msg)
        print(f"✅ Invitation email sent to {to_email}")
    except Exception as e:
        print(f"❌ Invitation email send failed: {e}")
        raise

# ------------------------------
# RESET PASSWORD OTP EMAIL
# ------------------------------
def send_reset_password_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg["Subject"] = "CodeVerse - Reset Password Code"
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email

    msg.set_content(f"""
Hello,

You requested to reset your CodeVerse password.

Your reset code is:

🔐 {otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

— CodeVerse Team
""")

    try:
        _send_email_tls(msg)
        print(f"✅ Reset password OTP sent to {to_email}")
    except Exception as e:
        print(f"❌ Reset password email failed: {e}")
        raise