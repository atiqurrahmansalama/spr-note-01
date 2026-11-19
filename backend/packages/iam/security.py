"""
Security, Password Hashing, 2FA OTP & Backup Codes Generators.
"""
import secrets
import string
import pyotp
from typing import List


def generate_secure_otp(length: int = 6) -> str:
    digits = string.digits
    return "".join(secrets.choice(digits) for _ in range(length))


def generate_backup_codes(count: int = 8, length: int = 10) -> List[str]:
    chars = string.ascii_uppercase + string.digits
    codes = []
    for _ in range(count):
        raw = "".join(secrets.choice(chars) for _ in range(length))
        formatted = f"{raw[:5]}-{raw[5:]}"
        codes.append(formatted)
    return codes


def verify_totp_code(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
