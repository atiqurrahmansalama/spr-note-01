import mimetypes
import os
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import User
from apps.our_little_universe.core.audit import log_universe_event
from apps.our_little_universe.core.permissions import (
    IsUniverseOwner,
    UniverseJWTAuthentication,
    set_postgres_rls_context,
)
from apps.our_little_universe.core.storage import verify_media_stream_token
from apps.our_little_universe.models.foundation import (
    UniverseMember,
    UniverseModuleRegistry,
    UniverseProgress,
)
from apps.our_little_universe.models.media import UniverseMediaAsset, UniverseAccessAuditLog
from apps.our_little_universe.modules.admin.serializers import (
    RecipientProvisionSerializer,
    UniverseAccessAuditLogSerializer,
    UniverseMediaAssetSerializer,
    UniverseMemberSerializer,
    UniverseSpaceAdminUpdateSerializer,
)
from apps.our_little_universe.modules.admin.services import provision_or_update_recipient
from apps.our_little_universe.modules.welcome.serializers import (
    UniverseModuleRegistrySerializer,
    UniverseProgressSerializer,
    UniverseSpacePublicSerializer,
)
from apps.our_little_universe.modules.welcome.services import (
    ensure_default_modules,
    set_space_pin,
)


class UniverseAdminSpaceView(APIView):
    """OWNER-only endpoint to inspect and update space configuration, theme, countdown, and Secret PIN."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def get(self, request):
        space = request.universe_space
        members = list(UniverseMember.objects.filter(space=space).order_by("role", "created_at"))
        recipient_progress = list(UniverseProgress.objects.filter(space=space).order_by("-updated_at"))
        audit_logs = list(UniverseAccessAuditLog.objects.filter(space=space)[:25])

        user_ids = (
            {m.user_id for m in members}
            | {p.user_id for p in recipient_progress}
            | {a.actor_user_id for a in audit_logs if a.actor_user_id}
        )
        users_map = User.objects.in_bulk(user_ids)

        return Response(
            {
                "space": UniverseSpacePublicSerializer(space, context={"request": request}).data,
                "members": UniverseMemberSerializer(
                    members, many=True, context={"users_map": users_map}
                ).data,
                "progress_records": [
                    {
                        "user_id": p.user_id,
                        "email": users_map[p.user_id].email if p.user_id in users_map else "",
                        "name": users_map[p.user_id].name if p.user_id in users_map else "",
                        "data": UniverseProgressSerializer(p).data,
                    }
                    for p in recipient_progress
                ],
                "audit_logs": UniverseAccessAuditLogSerializer(
                    audit_logs, many=True, context={"users_map": users_map}
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        space = request.universe_space
        serializer = UniverseSpaceAdminUpdateSerializer(space, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_pin = serializer.validated_data.pop("new_secret_pin", None)
        space = serializer.save()
        if new_pin is not None and new_pin.strip():
            set_space_pin(space, new_pin)
            space.save(update_fields=["secret_pin_hash", "updated_at"])

        log_universe_event(space, request.user, "ADMIN_SPACE_UPDATED", {}, request=request)
        return Response(
            UniverseSpacePublicSerializer(space, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class UniverseAdminModulesView(APIView):
    """OWNER-only dynamic module registry management."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def get(self, request):
        ensure_default_modules(request.universe_space)
        modules = UniverseModuleRegistry.objects.filter(space=request.universe_space).order_by(
            "sort_order", "module_key"
        )
        return Response(UniverseModuleRegistrySerializer(modules, many=True).data, status=status.HTTP_200_OK)

    def patch(self, request, module_id=None):
        target_id = module_id or request.data.get("id")
        module = UniverseModuleRegistry.objects.filter(
            id=target_id, space=request.universe_space
        ).first()
        if not module:
            return Response({"detail": "Module registry entry not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UniverseModuleRegistrySerializer(module, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_universe_event(
            request.universe_space,
            request.user,
            "ADMIN_MODULE_UPDATED",
            {"module_key": module.module_key, "is_enabled": module.is_enabled, "is_locked": module.is_locked},
            request=request,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class UniverseAdminRecipientView(APIView):
    """OWNER-only endpoint to provision or update the private RECIPIENT account."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]

    def get(self, request):
        recipients = list(
            UniverseMember.objects.filter(
                space=request.universe_space, role=UniverseMember.ROLE_RECIPIENT
            ).order_by("created_at")
        )
        users_map = User.objects.in_bulk([r.user_id for r in recipients])
        return Response(
            UniverseMemberSerializer(recipients, many=True, context={"users_map": users_map}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = RecipientProvisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            member = provision_or_update_recipient(
                space=request.universe_space,
                actor=request.user,
                email=serializer.validated_data["email"],
                display_name=serializer.validated_data["display_name"],
                password=serializer.validated_data.get("password") or None,
                is_active=serializer.validated_data.get("is_active", True),
                request=request,
            )
        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UniverseMemberSerializer(member).data, status=status.HTTP_200_OK)


class UniverseAdminMediaView(APIView):
    """OWNER-only Private Media Vault upload & management."""
    authentication_classes = [UniverseJWTAuthentication]
    permission_classes = [IsAuthenticated, IsUniverseOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    MAX_UPLOAD_BYTES = 25 * 1024 * 1024
    ALLOWED_MIME_PREFIXES = ("image/", "audio/", "video/", "application/pdf")

    def get(self, request):
        assets = UniverseMediaAsset.objects.filter(space=request.universe_space).order_by("-created_at")
        return Response(
            UniverseMediaAssetSerializer(assets, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response({"detail": "Media file is required."}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded.size > self.MAX_UPLOAD_BYTES:
            return Response(
                {"detail": "File exceeds 25MB private media limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guessed_mime = (
            getattr(uploaded, "content_type", None)
            or mimetypes.guess_type(uploaded.name)[0]
            or "application/octet-stream"
        )
        if not any(guessed_mime.startswith(prefix) for prefix in self.ALLOWED_MIME_PREFIXES):
            return Response({"detail": "Unsupported private media file type."}, status=status.HTTP_400_BAD_REQUEST)

        media_type = "document"
        if guessed_mime.startswith("image/"):
            media_type = "image"
        elif guessed_mime.startswith("audio/"):
            media_type = "audio"
        elif guessed_mime.startswith("video/"):
            media_type = "video"

        title = (request.data.get("title") or os.path.splitext(uploaded.name)[0] or "Private Asset")[:150]
        category = request.data.get("category") or "general"

        asset = UniverseMediaAsset.objects.create(
            space=request.universe_space,
            uploaded_by_user_id=request.user.id,
            title=title,
            category=category,
            media_type=media_type,
            file=uploaded,
            mime_type=guessed_mime,
            file_size=uploaded.size,
            is_private=True,
        )
        log_universe_event(
            request.universe_space,
            request.user,
            "PRIVATE_MEDIA_UPLOADED",
            {"asset_id": str(asset.id), "media_type": media_type},
            request=request,
        )
        return Response(
            UniverseMediaAssetSerializer(asset, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, asset_id=None):
        asset = UniverseMediaAsset.objects.filter(id=asset_id, space=request.universe_space).first()
        if not asset:
            return Response({"detail": "Media asset not found."}, status=status.HTTP_404_NOT_FOUND)
        if asset.file:
            try:
                asset.file.close()
                asset.file.delete(save=False)
            except PermissionError:
                pass
        asset.delete()
        log_universe_event(
            request.universe_space,
            request.user,
            "PRIVATE_MEDIA_DELETED",
            {"asset_id": str(asset_id)},
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UniverseProtectedMediaStreamView(APIView):
    """Streams private media ONLY to active authorized Universe members."""
    permission_classes = [AllowAny]

    def get(self, request, asset_id):
        authorized_user = None
        if request.user and request.user.is_authenticated:
            authorized_user = request.user
        else:
            token = request.query_params.get("token", "")
            token_uid = verify_media_stream_token(token, str(asset_id))
            if token_uid is not None:
                authorized_user = User.objects.filter(
                    id=token_uid, is_active=True, is_deactivated=False
                ).first()

        if not authorized_user:
            return Response(
                {"detail": "Private media authorization required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        asset = UniverseMediaAsset.objects.select_related("space").filter(id=asset_id).first()
        if not asset:
            raise Http404("Private media asset not found.")

        is_member = UniverseMember.objects.filter(
            space=asset.space,
            user_id=authorized_user.id,
            is_active=True,
            space__is_active=True,
        ).exists()
        if not is_member:
            return Response(
                {"detail": "Access denied for this private media asset."},
                status=status.HTTP_403_FORBIDDEN,
            )

        set_postgres_rls_context(authorized_user.id)
        if not asset.file or not asset.file.storage.exists(asset.file.name):
            raise Http404("Media file missing from private storage.")

        file_handle = asset.file.open("rb")
        response = FileResponse(file_handle, content_type=asset.mime_type or "application/octet-stream")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
