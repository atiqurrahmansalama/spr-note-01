"""
Enterprise Full-System Backup & Disaster Recovery API Views.
Exposes secure endpoints for 3-Tier backup health telemetry, on-demand full archive download,
and zero-data-loss system restoration.
"""

import os
import logging
from pathlib import Path
from django.http import FileResponse, HttpResponse
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from core.services.backup_service import EnterpriseBackupService, BACKUP_DIR
from core.services.activity_log_service import ActivityLogLifecycleService
from core.services.scheduler_service import BackupSchedulerService
from core.services.cloud_storage_service import CloudStorageService

logger = logging.getLogger("django")


class BackupStatusView(APIView):
    """
    GET /api/v1/system/backup/status/
    Returns real-time status and metrics across all 3 backup tiers.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can inspect enterprise backup infrastructure.")

        status_data = EnterpriseBackupService.get_backup_status_summary()
        return Response({"success": True, "data": status_data})


class DownloadFullBackupView(APIView):
    """
    GET /api/v1/system/backup/download-full/
    Creates/streams a 100% full-system archive (.tar.gz) containing complete database & media files.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can export full-system archives.")

        create_new = request.query_params.get("create_new", "true").lower() in ("true", "1")
        passphrase = request.query_params.get("passphrase")
        if passphrase and len(passphrase.strip()) < 4:
            return Response(
                {"success": False, "error": "Encryption passphrase must be at least 4 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        backup_dir = Path(BACKUP_DIR)
        backup_dir.mkdir(parents=True, exist_ok=True)

        latest_archives = sorted(
            [
                f for f in backup_dir.iterdir()
                if f.is_file()
                and f.name.startswith("enterprise_full_backup_")
                and (f.name.endswith(".tar.gz") or f.name.endswith(".enc.tar.gz"))
                and not f.name.endswith(".sha256")
            ],
            key=os.path.getmtime,
            reverse=True
        )

        archive_to_send = None
        if not create_new and latest_archives and not passphrase:
            archive_to_send = latest_archives[0]
        else:
            logger.info(f"[DownloadFullBackupView] Generating on-demand full system backup for user {request.user.id}...")
            result = EnterpriseBackupService.create_full_backup(
                include_media=True,
                generate_sqlite=True,
                passphrase=passphrase.strip() if passphrase else None
            )
            if not result.get("success"):
                return Response(
                    {"success": False, "error": result.get("error", "Failed to generate backup.")},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            archive_to_send = Path(result["archive_path"])

        if not archive_to_send or not archive_to_send.exists():
            return Response(
                {"success": False, "error": "Backup archive could not be located."},
                status=status.HTTP_404_NOT_FOUND
            )

        response = FileResponse(
            open(archive_to_send, "rb"),
            content_type="application/gzip"
        )
        response["Content-Disposition"] = f'attachment; filename="{archive_to_send.name}"'
        response["Content-Length"] = os.path.getsize(archive_to_send)
        
        # Check if sha256 sidecar exists
        sidecar = archive_to_send.with_suffix("").with_suffix(".sha256")
        if sidecar.exists():
            with open(sidecar, "r", encoding="utf-8") as f:
                sha_line = f.read().strip().split()
                if sha_line:
                    response["X-Checksum-SHA256"] = sha_line[0]

        return response


class CreateBackupArchiveView(APIView):
    """
    POST /api/v1/system/backup/create/
    Creates an on-demand full-system backup archive on the server with optional AES-256 encryption & cloud sync.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can generate full system backups.")

        passphrase = request.data.get("passphrase", "").strip() or None
        if passphrase and len(passphrase) < 4:
            return Response(
                {"success": False, "error": "Encryption passphrase must be at least 4 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        include_media = request.data.get("include_media", True)
        sync_cloud = request.data.get("sync_cloud", True)

        result = EnterpriseBackupService.create_full_backup(
            include_media=bool(include_media),
            generate_sqlite=True,
            passphrase=passphrase,
            sync_cloud=bool(sync_cloud)
        )

        if result.get("success"):
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RestoreFullBackupView(APIView):
    """
    POST /api/v1/system/backup/restore-full/
    Safely restores uploaded .tar.gz archive.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can execute full system restoration.")

        confirmation = request.data.get("confirm", "").strip()
        if confirmation != "CONFIRM_RESTORE":
            return Response(
                {
                    "success": False,
                    "error": "Confirmation phrase mismatch. You must provide confirm='CONFIRM_RESTORE' to execute full system restore."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES.get("backup_file")
        if not uploaded_file:
            return Response(
                {"success": False, "error": "No backup archive file provided in 'backup_file' form field."},
                status=status.HTTP_400_BAD_REQUEST
            )

        dry_run = request.data.get("dry_run", "false").lower() in ("true", "1")
        passphrase = request.data.get("passphrase", "").strip() or None

        # Save uploaded file temporarily
        temp_dir = Path(BACKUP_DIR) / "temp_uploads"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file_path = temp_dir / uploaded_file.name

        try:
            with open(temp_file_path, "wb") as f:
                for chunk in uploaded_file.chunks():
                    f.write(chunk)

            result = EnterpriseBackupService.restore_full_backup(
                archive_path=str(temp_file_path),
                passphrase=passphrase,
                dry_run=dry_run
            )

            if result.get("success"):
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

        finally:
            if temp_file_path.exists():
                temp_file_path.unlink(missing_ok=True)


class BackupHistoryListView(APIView):
    """
    GET /api/v1/system/backup/history/
    Returns list of all available historical full-system archives with metadata.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can inspect backup archives.")

        archives = EnterpriseBackupService.list_backup_archives()
        return Response({"success": True, "data": archives})


class DownloadNamedBackupView(APIView):
    """
    GET /api/v1/system/backup/download/<str:archive_name>/
    Streams a specific historical backup archive.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, archive_name):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can export backup archives.")

        clean_name = os.path.basename(archive_name).strip()
        target_path = Path(BACKUP_DIR) / clean_name
        is_valid_name = clean_name.startswith("enterprise_full_backup_") and (clean_name.endswith(".tar.gz") or clean_name.endswith(".enc.tar.gz"))
        if not target_path.exists() or not is_valid_name:
            return Response({"success": False, "error": "Archive file not found."}, status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(open(target_path, "rb"), content_type="application/gzip")
        response["Content-Disposition"] = f'attachment; filename="{clean_name}"'
        response["Content-Length"] = os.path.getsize(target_path)

        sidecar = target_path.with_suffix("").with_suffix(".sha256")
        if not sidecar.exists():
            sidecar = Path(BACKUP_DIR) / f"{clean_name}.sha256"

        if sidecar.exists():
            try:
                with open(sidecar, "r", encoding="utf-8") as sf:
                    parts = sf.read().strip().split()
                    if parts:
                        response["X-Checksum-SHA256"] = parts[0]
            except Exception:
                pass

        return response


class DeleteBackupArchiveView(APIView):
    """
    POST /api/v1/system/backup/delete/
    Safely deletes a specific backup archive.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can delete backup archives.")

        archive_name = request.data.get("archive_name", "").strip()
        if not archive_name:
            return Response({"success": False, "error": "Parameter 'archive_name' is required."}, status=status.HTTP_400_BAD_REQUEST)

        result = EnterpriseBackupService.delete_backup_archive(archive_name)
        if result.get("success"):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class RestoreNamedBackupView(APIView):
    """
    POST /api/v1/system/backup/restore-named/
    Executes system restoration directly from an existing server archive.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can execute system restoration.")

        confirmation = request.data.get("confirm", "").strip()
        if confirmation != "CONFIRM_RESTORE":
            return Response(
                {"success": False, "error": "Confirmation phrase mismatch. You must provide confirm='CONFIRM_RESTORE'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        archive_name = request.data.get("archive_name", "").strip()
        passphrase = request.data.get("passphrase", "").strip() or None
        dry_run = request.data.get("dry_run", "false").lower() in ("true", "1")

        result = EnterpriseBackupService.restore_from_existing_archive(
            archive_name,
            passphrase=passphrase,
            dry_run=dry_run
        )
        if result.get("success"):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class FeatureAnalyticsView(APIView):
    """
    GET /api/v1/system/backup/feature-analytics/
    Returns product usage intelligence and feature telemetry.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can view system analytics.")

        try:
            days = int(request.query_params.get("days", 30))
        except ValueError:
            days = 30

        data = ActivityLogLifecycleService.get_feature_analytics(days=days)
        return Response({"success": True, "data": data})


class ArchiveActivityLogsView(APIView):
    """
    POST /api/v1/system/backup/archive-logs/
    Triggers activity log lifecycle archival and database pruning.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can trigger log archival.")

        try:
            days_to_keep = int(request.data.get("days_to_keep", 30))
        except ValueError:
            days_to_keep = 30

        dry_run = request.data.get("dry_run", "false").lower() in ("true", "1")

        result = ActivityLogLifecycleService.archive_and_prune(days_to_keep=days_to_keep, dry_run=dry_run)
        if result.get("success"):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class BackupScheduleSettingsView(APIView):
    """
    GET /api/v1/system/backup/schedule-settings/
    POST /api/v1/system/backup/schedule-settings/
    Inspects and updates automated background backup schedule.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can configure backup schedules.")
        return Response({"success": True, "data": BackupSchedulerService.get_schedule_settings()})

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can configure backup schedules.")

        action = request.data.get("action")
        if action == "run_now":
            job_result = BackupSchedulerService.run_scheduled_job(force=True)
            return Response({
                "success": True,
                "job_result": job_result,
                "data": BackupSchedulerService.get_schedule_settings()
            })

        enabled = request.data.get("enabled")
        frequency = request.data.get("frequency")
        retention = request.data.get("retention_count")

        updated = BackupSchedulerService.update_schedule_settings(
            enabled=enabled,
            frequency=frequency,
            retention_count=int(retention) if retention is not None else None
        )
        return Response({"success": True, "data": updated})


class TestCloudStorageView(APIView):
    """
    POST /api/v1/system/backup/test-cloud/
    Tests connectivity to Supabase Storage Bucket / Cloud Vault.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "user_type", "").upper() == "SUPER_ADMIN"):
            raise PermissionDenied("Only Super Administrators can test cloud storage connectivity.")

        result = CloudStorageService.test_connection()
        return Response({"success": True, "data": result})
