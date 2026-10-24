"""
Django management command to execute 100% full-system backup.
Archives PostgreSQL SQL, Django ORM JSON, Media files, and Manifest.
Usage:
    python manage.py backup_full_system
    python manage.py backup_full_system --output-dir=/path/to/backups
"""

from django.core.management.base import BaseCommand
from core.services.backup_service import EnterpriseBackupService


class Command(BaseCommand):
    help = "Generate a comprehensive, 100% full-system enterprise backup archive (.tar.gz)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            type=str,
            default=None,
            help="Optional custom output directory to store the backup archive.",
        )
        parser.add_argument(
            "--no-media",
            action="store_true",
            help="Exclude media assets from the backup archive.",
        )
        parser.add_argument(
            "--no-sqlite",
            action="store_true",
            help="Exclude standby SQLite generation.",
        )
        parser.add_argument(
            "--tenant",
            type=str,
            default="ALL",
            help="Scoped tenant ID (default: ALL for complete institution backup).",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing 100% Enterprise Full-System Backup..."))

        output_dir = options.get("output_dir")
        include_media = not options.get("no_media", False)
        generate_sqlite = not options.get("no_sqlite", False)
        tenant_id = options.get("tenant")

        try:
            result = EnterpriseBackupService.create_full_backup(
                output_dir=output_dir,
                include_media=include_media,
                generate_sqlite=generate_sqlite,
                tenant_id=tenant_id
            )

            if result.get("success"):
                self.stdout.write(self.style.SUCCESS(
                    f"\n[BACKUP SUCCESSFUL]\n"
                    f"Archive: {result['archive_name']}\n"
                    f"Path: {result['archive_path']}\n"
                    f"Size: {result['file_size_mb']} MB ({result['file_size_bytes']} bytes)\n"
                    f"SHA-256: {result['sha256']}\n"
                    f"Total Records: {result['total_records']}\n"
                    f"Total Tables: {result['total_tables']}\n"
                    f"Media Files: {result['media_files_count']}\n"
                    f"Timestamp: {result['created_at']}"
                ))
            else:
                self.stdout.write(self.style.ERROR(f"Backup failed: {result.get('error', 'Unknown error')}"))
                import sys
                sys.exit(1)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Critical error during backup: {str(e)}"))
            raise e
