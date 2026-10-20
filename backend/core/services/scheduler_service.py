"""
Enterprise Automated Backup Scheduler Service.
Manages automated daily/interval background backups, retention policies, and cloud synchronization
without requiring manual intervention.
"""

import time
import threading
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Dict, Any, Optional

from pathlib import Path
from django.conf import settings
from django.utils import timezone
from django.db import close_old_connections

logger = logging.getLogger("django")

_WORKER_THREAD: Optional[threading.Thread] = None
_WORKER_LOCK = threading.Lock()
_WORKER_STOP_EVENT = threading.Event()


class BackupSchedulerService:
    """
    Automated Background Engine for Enterprise Disaster Recovery.
    Guarantees continuous 24/7 data resilience.
    """

    SETTING_ENABLED = "BACKUP_AUTO_SCHEDULE_ENABLED"
    SETTING_FREQUENCY = "BACKUP_SCHEDULE_FREQUENCY"
    SETTING_LAST_RUN = "BACKUP_LAST_RUN_AT"
    SETTING_NEXT_RUN = "BACKUP_NEXT_RUN_AT"
    SETTING_RETENTION = "BACKUP_RETENTION_COUNT"

    @classmethod
    def get_schedule_settings(cls) -> Dict[str, Any]:
        """
        Retrieves current automated backup schedule settings.
        """
        from core.models import SystemSetting

        enabled_str = SystemSetting.get_val(cls.SETTING_ENABLED, "true").lower()
        frequency = SystemSetting.get_val(cls.SETTING_FREQUENCY, "daily")
        last_run = SystemSetting.get_val(cls.SETTING_LAST_RUN, "")
        next_run = SystemSetting.get_val(cls.SETTING_NEXT_RUN, "")
        retention = int(SystemSetting.get_val(cls.SETTING_RETENTION, "24") or 24)

        # If next_run is not set, compute it now
        if not next_run:
            next_dt = cls.calculate_next_run(frequency)
            next_run = next_dt.isoformat()
            SystemSetting.set_val(cls.SETTING_NEXT_RUN, next_run)

        return {
            "enabled": enabled_str in ("true", "1", "yes"),
            "frequency": frequency,
            "last_run": last_run or None,
            "next_run": next_run or None,
            "retention_count": retention,
            "is_worker_running": bool(_WORKER_THREAD and _WORKER_THREAD.is_alive()),
        }

    @classmethod
    def update_schedule_settings(
        cls,
        enabled: Optional[bool] = None,
        frequency: Optional[str] = None,
        retention_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Updates automated schedule settings and recalculates next trigger.
        """
        from core.models import SystemSetting

        if enabled is not None:
            SystemSetting.set_val(cls.SETTING_ENABLED, "true" if enabled else "false")

        if frequency in ("every_6h", "every_12h", "daily", "weekly"):
            SystemSetting.set_val(cls.SETTING_FREQUENCY, frequency)
            next_dt = cls.calculate_next_run(frequency)
            SystemSetting.set_val(cls.SETTING_NEXT_RUN, next_dt.isoformat())

        if retention_count is not None and 1 <= retention_count <= 100:
            SystemSetting.set_val(cls.SETTING_RETENTION, str(retention_count))

        return cls.get_schedule_settings()

    @classmethod
    def calculate_next_run(cls, frequency: str) -> datetime:
        """
        Calculates next scheduled execution datetime based on frequency.
        """
        now = timezone.now()
        if frequency == "every_6h":
            return now + timedelta(hours=6)
        elif frequency == "every_12h":
            return now + timedelta(hours=12)
        elif frequency == "weekly":
            return now + timedelta(days=7)
        else:  # default 'daily'
            # Next midnight UTC
            tomorrow = (now + timedelta(days=1)).date()
            return datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0, tzinfo=dt_timezone.utc)

    @classmethod
    def run_scheduled_job(cls, force: bool = False) -> Dict[str, Any]:
        """
        Executes automated backup if due or if force=True.
        """
        from core.models import SystemSetting
        from core.services.backup_service import EnterpriseBackupService
        from core.services.cloud_storage_service import CloudStorageService

        settings_data = cls.get_schedule_settings()
        if not settings_data["enabled"] and not force:
            return {"success": False, "message": "Automated schedule is disabled."}

        now = timezone.now()
        next_run_str = settings_data.get("next_run")
        if next_run_str and not force:
            try:
                next_dt = datetime.fromisoformat(next_run_str)
                if now < next_dt:
                    return {
                        "success": True,
                        "executed": False,
                        "message": f"Backup not due yet. Next run: {next_run_str}",
                    }
            except Exception:
                pass

        logger.info("[BackupScheduler] Triggering automated enterprise full-system backup...")
        try:
            # Step 1: Create Full System Backup
            backup_result = EnterpriseBackupService.create_full_backup(
                include_media=True,
                generate_sqlite=True
            )

            # Step 2: Sync to Cloud Vault
            cloud_result = {}
            if backup_result.get("success") and backup_result.get("archive_path"):
                cloud_result = CloudStorageService.upload_archive(Path(backup_result["archive_path"]))

            # Step 3: Update Schedule Timestamps
            freq = settings_data.get("frequency", "daily")
            next_dt = cls.calculate_next_run(freq)
            SystemSetting.set_val(cls.SETTING_LAST_RUN, now.isoformat())
            SystemSetting.set_val(cls.SETTING_NEXT_RUN, next_dt.isoformat())

            logger.info(
                f"[BackupScheduler] Automated backup completed successfully: "
                f"{backup_result.get('archive_name')}. Next run scheduled at: {next_dt.isoformat()}"
            )

            return {
                "success": True,
                "executed": True,
                "backup": backup_result,
                "cloud_sync": cloud_result,
                "last_run": now.isoformat(),
                "next_run": next_dt.isoformat(),
            }

        except Exception as e:
            logger.error(f"[BackupScheduler] Scheduled backup failed: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    @classmethod
    def start_background_worker(cls) -> None:
        """
        Launches continuous background daemon to monitor scheduled backup execution.
        """
        global _WORKER_THREAD
        with _WORKER_LOCK:
            if _WORKER_THREAD and _WORKER_THREAD.is_alive():
                return

            def _worker_loop():
                logger.info("[BackupScheduler] In-process background scheduler worker initialized.")
                while not _WORKER_STOP_EVENT.is_set():
                    try:
                        close_old_connections()
                        cls.run_scheduled_job(force=False)
                    except Exception as err:
                        logger.warning(f"[BackupScheduler] Worker loop error: {err}")
                    finally:
                        close_old_connections()

                    # Sleep 60 seconds between heartbeat checks
                    _WORKER_STOP_EVENT.wait(60.0)

            _WORKER_STOP_EVENT.clear()
            _WORKER_THREAD = threading.Thread(target=_worker_loop, daemon=True, name="BackupSchedulerWorker")
            _WORKER_THREAD.start()
            logger.info("[BackupScheduler] Background worker daemon started.")
