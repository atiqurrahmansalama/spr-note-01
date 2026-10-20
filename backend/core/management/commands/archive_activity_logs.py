"""
Django Management Command: archive_activity_logs
Archives old ActivityLog and UserActivityLog rows into compressed cold storage,
aggregates feature intelligence into FeatureUsageSummary, and reclaims database space.
"""

from django.core.management.base import BaseCommand
from core.services.activity_log_service import ActivityLogLifecycleService


class Command(BaseCommand):
    help = "Archives old activity logs to cold storage and aggregates feature usage intelligence."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Number of days of hot activity logs to keep in active DB (default: 30)."
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the archival process without deleting any database records."
        )

    def handle(self, *args, **options):
        days = options.get("days", 30)
        dry_run = options.get("dry_run", False)

        self.stdout.write(
            self.style.NOTICE(
                f"[ActivityLogLifecycle] Starting log lifecycle management (keep {days} days, dry_run={dry_run})..."
            )
        )

        result = ActivityLogLifecycleService.archive_and_prune(
            days_to_keep=days,
            dry_run=dry_run
        )

        if not result.get("success"):
            self.stdout.write(self.style.ERROR(f"Archival failed: {result.get('error')}"))
            return

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"[DRY-RUN SUCCESS] {result.get('total_records', 0)} records qualify for cold archival."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"[SUCCESS] Cold archive created: {result.get('archive_name')} ({result.get('archive_size_mb')} MB)\n"
                    f"Archived & Pruned Records: {result.get('total_pruned')}\n"
                    f"Feature Summaries Updated: {result.get('feature_summaries_updated')}\n"
                    f"Reclaimed Storage: {result.get('reclaimed_storage')}"
                )
            )
