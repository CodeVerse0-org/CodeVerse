import os
import resend

MY_KEY = os.getenv("MY_KEY")

FROM_EMAIL = os.getenv(
    "FROM_EMAIL",
    "onboarding@resend.dev"
)

print("RESEND KEY EXISTS:", MY_KEY is not None)
print("RESEND KEY START:", MY_KEY[:3] if MY_KEY else None)

resend.api_key = MY_KEY


def send_email(to_email: str, subject: str, body: str):
    try:
        response = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "text": body,
        })

        print("Email sent:", response)
        return response

    except Exception as e:
        print("Email sending failed:", str(e))
        raise e


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

Accept your invitation here:

{invite_link}

— CodeVerse Team
"""
    )