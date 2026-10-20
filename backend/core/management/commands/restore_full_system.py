"""
Django management command to safely restore 100% full-system backup archive (.tar.gz).
Usage:
    python manage.py restore_full_system --file=/path/to/archive.tar.gz
    python manage.py restore_full_system --file=/path/to/archive.tar.gz --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from core.services.backup_service import EnterpriseBackupService


class Command(BaseCommand):
    help = "Safely restore a 100% full-system backup archive (.tar.gz) into the active database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            required=True,
            help="Path to the backup archive file (.tar.gz).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate archive integrity and manifest without applying changes.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Bypass interactive confirmation prompt.",
        )

    def handle(self, *args, **options):
        archive_path = options.get("file")
        dry_run = options.get("dry_run", False)
        force = options.get("force", False)

        if not dry_run and not force:
            confirm = input(
                "WARNING: This will overwrite/merge records in the current active database with the backup archive.\n"
                "Type 'RESTORE' to proceed: "
            )
            if confirm.strip() != "RESTORE":
                self.stdout.write(self.style.WARNING("Restore cancelled by user."))
                return

        self.stdout.write(self.style.NOTICE(f"Initiating full-system restore from: {archive_path}..."))

        result = EnterpriseBackupService.restore_full_backup(
            archive_path=archive_path,
            dry_run=dry_run
        )

        if result.get("success"):
            if dry_run:
                self.stdout.write(self.style.SUCCESS(
                    f"\n[VALIDATION PASSED]\n"
                    f"Archive is intact and valid.\n"
                    f"Total Records in Archive: {result['manifest'].get('total_records')}\n"
                    f"Timestamp: {result['manifest'].get('timestamp')}"
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f"\n[RESTORE COMPLETED SUCCESSFULLY]\n"
                    f"Restored Database Records: {result.get('restored_records_count')}\n"
                    f"Restored Media Files: {result.get('restored_media_count')}\n"
                    f"Status: 100% Data Restored"
                ))
        else:
            self.stdout.write(self.style.ERROR(f"Restore failed: {result.get('error')}"))
            raise CommandError(result.get("error"))
