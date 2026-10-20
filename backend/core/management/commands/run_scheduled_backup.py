"""
Django Management Command: run_scheduled_backup
Executes scheduled enterprise backup job and cloud vault synchronization.
"""

from django.core.management.base import BaseCommand
from core.services.scheduler_service import BackupSchedulerService


class Command(BaseCommand):
    help = "Executes automated full-system backup if due, or forced immediately."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force backup creation immediately regardless of scheduled due time."
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        self.stdout.write(self.style.NOTICE(f"[BackupScheduler] Checking scheduled backup status (force={force})..."))

        result = BackupSchedulerService.run_scheduled_job(force=force)

        if not result.get("success"):
            self.stdout.write(self.style.WARNING(f"Backup job skipped or failed: {result.get('message') or result.get('error')}"))
            return

        if not result.get("executed"):
            self.stdout.write(self.style.SUCCESS(f"[SKIPPED] {result.get('message')}"))
        else:
            b_info = result.get("backup", {})
            self.stdout.write(
                self.style.SUCCESS(
                    f"[SUCCESS] Scheduled Backup Created: {b_info.get('archive_name')}\n"
                    f"Size: {b_info.get('file_size_mb')} MB | Records: {b_info.get('total_records')}\n"
                    f"Next Scheduled Run: {result.get('next_run')}"
                )
            )
