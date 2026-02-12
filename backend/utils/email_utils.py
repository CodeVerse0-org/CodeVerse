import smtplib
from email.message import EmailMessage

# ------------------------------
# Gmail SMTP configuration
# ------------------------------
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

SENDER_EMAIL = "rida.fatima42525@gmail.com"      # 👈 your Gmail
SENDER_PASSWORD = "kdth rpyg vhbf ggbw"          # 👈 Gmail App Password

# ------------------------------
# OTP EMAIL (EXISTING)
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
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        print(f"✅ OTP email sent to {to_email}")
    except Exception as e:
        print("❌ OTP email send failed:", e)
        raise

# ------------------------------
# INVITATION EMAIL (NEW)
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
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        print(f"✅ Invitation email sent to {to_email}")
    except Exception as e:
        print("❌ Invitation email send failed:", e)
        raise
# ------------------------------
# RESET PASSWORD OTP EMAIL (NEW)
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
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        print(f"✅ Reset password OTP sent to {to_email}")
    except Exception as e:
        print("❌ Reset password email failed:", e)
        raise