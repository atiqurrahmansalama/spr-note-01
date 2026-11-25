"""
Private Media Storage & Short-Lived Signed Stream Token Utilities.
Ensures Our Little Universe media files are never exposed via unauthenticated /media/ routes.
"""
import os
from django.conf import settings
from django.core import signing
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateUniverseStorage(FileSystemStorage):
    """Isolated private filesystem storage located outside public MEDIA_ROOT."""

    def __init__(self, *args, **kwargs):
        location = os.path.join(settings.BASE_DIR, "private_storage", "universe")
        os.makedirs(location, exist_ok=True)
        kwargs.setdefault("location", location)
        kwargs.setdefault("base_url", None)
        super().__init__(*args, **kwargs)

    def url(self, name):
        raise ValueError("Direct public URL access is disabled for PrivateUniverseStorage.")


private_universe_storage = PrivateUniverseStorage()

_MEDIA_SIGNING_SALT = "olu.private.media.stream.v1"
DEFAULT_STREAM_TOKEN_MAX_AGE_SECONDS = 900


def create_media_stream_token(asset_id: str, user_id: int) -> str:
    payload = {"aid": str(asset_id), "uid": int(user_id)}
    return signing.dumps(payload, salt=_MEDIA_SIGNING_SALT)


def verify_media_stream_token(token: str, asset_id: str, max_age: int = DEFAULT_STREAM_TOKEN_MAX_AGE_SECONDS):
    if not token:
        return None
    try:
        data = signing.loads(token, salt=_MEDIA_SIGNING_SALT, max_age=max_age)
        if str(data.get("aid")) != str(asset_id):
            return None
        uid = data.get("uid")
        return int(uid) if uid is not None else None
    except (signing.BadSignature, signing.SignatureExpired, TypeError, ValueError):
        return None
