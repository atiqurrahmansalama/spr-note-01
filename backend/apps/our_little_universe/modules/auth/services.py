from core.models import User
from apps.our_little_universe.models.foundation import UniverseMember, UniverseModuleRegistry
from apps.our_little_universe.modules.welcome.serializers import (
    UniverseModuleRegistrySerializer,
    UniverseProgressSerializer,
    UniverseSpacePublicSerializer,
)
from apps.our_little_universe.modules.welcome.services import (
    ensure_default_modules,
    ensure_progress_for_member,
)


def build_session_payload(member: UniverseMember, request, user: User = None) -> dict:
    space = member.space
    ensure_default_modules(space)
    progress = ensure_progress_for_member(member)
    modules = UniverseModuleRegistry.objects.filter(space=space).order_by("sort_order", "module_key")
    iam_user = user or getattr(request, "user", None)
    if iam_user is None or not getattr(iam_user, "is_authenticated", False):
        iam_user = User.objects.filter(id=member.user_id).first()

    return {
        "user": {
            "id": member.user_id,
            "email": iam_user.email if iam_user else "",
            "name": member.display_name or (iam_user.name if iam_user else "") or (iam_user.email if iam_user else ""),
            "role": member.role,
        },
        "space": UniverseSpacePublicSerializer(space, context={"request": request}).data,
        "progress": UniverseProgressSerializer(progress).data,
        "modules": UniverseModuleRegistrySerializer(modules, many=True).data,
    }
