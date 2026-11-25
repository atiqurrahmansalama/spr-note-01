import uuid
from django.db import transaction
from core.models import User
from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.models.foundation import UniverseSpace, UniverseMember
from apps.our_little_universe.modules.welcome.services import ensure_progress_for_member


def provision_or_update_recipient(
    space: UniverseSpace,
    actor: User,
    email: str,
    display_name: str,
    password: str = None,
    is_active: bool = True,
    request=None,
):
    """Creates or updates the shared IAM user and links membership in the isolated `universe` DB."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        raise ValueError("Recipient email is required.")

    with transaction.atomic(using="default"):
        user = User.objects.filter(email__iexact=clean_email).first()
        if not user:
            if not password:
                raise ValueError("Password is required when creating a new recipient account.")
            synthetic_phone = f"olu-{uuid.uuid4().hex[:14]}"
            user = User(
                phone_number=synthetic_phone,
                email=clean_email,
                name=display_name or clean_email.split("@")[0],
                user_type="GUARDIAN",
                is_active=is_active,
                is_email_verified=True,
            )
            user.set_password(password)
            user.save()
        else:
            if display_name:
                user.name = display_name
            user.is_active = is_active
            user.is_deactivated = not is_active
            if password:
                user.set_password(password)
            user.save()

    with transaction.atomic(using="universe"):
        member, _ = UniverseMember.objects.update_or_create(
            space=space,
            user_id=user.id,
            defaults={
                "role": UniverseMember.ROLE_RECIPIENT,
                "display_name": display_name or user.name or clean_email,
                "is_active": is_active,
            },
        )
        ensure_progress_for_member(member)
        log_universe_event(
            space,
            actor,
            "RECIPIENT_UPDATED",
            {"recipient_email": clean_email, "is_active": is_active},
            request=request,
        )
    return member
