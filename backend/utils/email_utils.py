import os
import resend

resend.api_key = os.getenv("MY_KEY")

FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")


def send_email(to_email: str, subject: str, body: str):
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "text": body,
    })


def send_otp_email(to_email: str, otp: str):
    send_email(
        to_email,
        "CodeVerse - Email Verification Code",
        f"""
Hello,

Your verification code is:

{otp}

This code expires in 10 minutes.

— CodeVerse Team
"""
    )


def send_reset_password_email(to_email: str, otp: str):
    send_email(
        to_email,
        "CodeVerse - Reset Password Code",
        f"""
Hello,

Your reset password code is:

{otp}

This code expires in 10 minutes.

— CodeVerse Team
"""
    )


def send_invitation_email(to_email: str, invite_link: str):
    send_email(
        to_email,
        "CodeVerse Repository Invitation",
        f"""
Hello,

You have been invited to CodeVerse.

Click the link below to accept your invitation:

{invite_link}

— CodeVerse Team
"""
    )