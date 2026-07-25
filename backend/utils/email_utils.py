import os
import resend

FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

def send_email(to_email: str, subject: str, body: str):

    api_key = os.getenv("MY_KEY")

    print("MY_KEY EXISTS:", api_key is not None)
    print("MY_KEY LENGTH:", len(api_key) if api_key else 0)
    print("MY_KEY START:", api_key[:5] if api_key else None)

    if not api_key:
        raise ValueError("MY_KEY missing")

    api_key = api_key.strip().strip('"').strip("'")

    resend.api_key = api_key

    try:
        response = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "text": body,
        })

        print("EMAIL SENT:", response)
        return response

    except Exception as e:
        print("RESEND ERROR:", repr(e))
        raise


def send_otp_email(to_email: str, otp: str):
    send_email(
        to_email,
        "CodeVerse - Email Verification Code",
        f"""Hello,

Your verification code is:

{otp}

This code expires in 10 minutes.

— CodeVerse Team"""
    )


def send_reset_password_email(to_email: str, otp: str):
    send_email(
        to_email,
        "CodeVerse - Reset Password Code",
        f"""Hello,

Your reset password code is:

{otp}

This code expires in 10 minutes.

— CodeVerse Team"""
    )


def send_invitation_email(to_email: str, invite_link: str):
    send_email(
        to_email,
        "CodeVerse Repository Invitation",
        f"""Hello,

You have been invited to CodeVerse.

Click the link below to accept your invitation:

{invite_link}

— CodeVerse Team"""
    )