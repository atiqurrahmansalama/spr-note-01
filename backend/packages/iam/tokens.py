"""
JWT Tokens and Custom Claims Generators.
"""
from rest_framework_simplejwt.tokens import RefreshToken


def generate_tokens_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)

    # Custom enriched enterprise claims
    refresh["username"] = user.username
    refresh["email"] = user.email or ""
    refresh["user_type"] = getattr(user, "user_type", "STUDENT")
    refresh["institution_id"] = getattr(user, "institution_id", None)
    refresh["is_superuser"] = user.is_superuser
    refresh["is_staff"] = user.is_staff

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
