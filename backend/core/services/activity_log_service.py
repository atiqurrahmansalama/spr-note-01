"""
Enterprise Activity Log Lifecycle & Product Intelligence Service.
Handles 3-Tier log retention:
1. Hot Operational DB (Last 30/60 days live logs for real-time audit).
2. Aggregated Feature Analytics (Compact, permanent summaries for product roadmap insights).
3. Cold Archival Storage (Compressed JSONL archives in backups/activity_logs_archive/ - Zero data loss).
"""

import os
import gzip
import json
import hashlib
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

from django.conf import settings
from django.utils import timezone
from django.db import connection, transaction
from django.db.models import Count, Min, Max

from core.models import ActivityLog, UserActivityLog, FeatureUsageSummary

logger = logging.getLogger("django")

ARCHIVE_DIR = getattr(
    settings,
    "ACTIVITY_LOGS_ARCHIVE_ROOT",
    os.path.join(settings.BASE_DIR, "backups", "activity_logs_archive")
)


class ActivityLogLifecycleService:
    """
    Centralized Enterprise Activity Log Lifecycle & Analytics Engine.
    """

    @classmethod
    def ensure_archive_dir(cls) -> Path:
        path = Path(ARCHIVE_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @classmethod
    def calculate_sha256(cls, file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @classmethod
    def aggregate_metrics_for_logs(cls, queryset) -> int:
        """
        Aggregates ActivityLog rows into FeatureUsageSummary records.
        Ensures zero-loss product usage intelligence.
        """
        rollups = (
            queryset.values("timestamp__date", "action_name", "endpoint", "http_method")
            .annotate(hits=Count("id"), users=Count("user", distinct=True))
            .order_by("timestamp__date")
        )

        created_or_updated = 0
        for entry in rollups:
            log_date = entry.get("timestamp__date")
            action_name = entry.get("action_name") or "UNKNOWN_ACTION"
            endpoint = entry.get("endpoint") or "/unknown"
            http_method = entry.get("http_method") or "GET"
            hits = entry.get("hits", 0)
            users = entry.get("users", 0)

            if not log_date:
                continue

            summary, created = FeatureUsageSummary.objects.get_or_create(
                date=log_date,
                action_name=action_name[:150],
                endpoint=endpoint[:255],
                http_method=http_method[:10],
                defaults={
                    "hit_count": hits,
                    "unique_users_count": users,
                }
            )

            if not created:
                summary.hit_count += hits
                summary.unique_users_count = max(summary.unique_users_count, users)
                summary.save(update_fields=["hit_count", "unique_users_count", "updated_at"])

            created_or_updated += 1

        return created_or_updated

    @classmethod
    def archive_and_prune(
        cls,
        days_to_keep: int = 30,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Executes safe enterprise log archival:
        1. Aggregates logs older than `days_to_keep` into FeatureUsageSummary.
        2. Exports raw rows to a compressed .jsonl.gz archive file.
        3. Prunes old records from hot database in safe batches.
        4. Vacuums SQLite (if active) to reclaim storage.
        """
        archive_root = cls.ensure_archive_dir()
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)

        # Query candidates for pruning
        activity_qs = ActivityLog.objects.filter(timestamp__lt=cutoff_date)
        user_activity_qs = UserActivityLog.objects.filter(timestamp__lt=cutoff_date)

        total_activity_count = activity_qs.count()
        total_user_activity_count = user_activity_qs.count()

        if total_activity_count == 0 and total_user_activity_count == 0:
            return {
                "success": True,
                "message": f"No logs older than {days_to_keep} days found. System is already clean.",
                "days_kept": days_to_keep,
                "archived_records": 0,
                "pruned_records": 0,
                "dry_run": dry_run,
            }

        timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
        archive_id = hashlib.md5(f"{timestamp_str}_{os.urandom(8)}".encode()).hexdigest()[:8]
        archive_name = f"activity_logs_cold_archive_{timestamp_str}_{archive_id}.jsonl.gz"
        archive_file_path = archive_root / archive_name

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"Dry-run passed. {total_activity_count + total_user_activity_count} records qualify for cold archival.",
                "days_kept": days_to_keep,
                "cutoff_date": cutoff_date.isoformat(),
                "activity_logs_count": total_activity_count,
                "user_activity_logs_count": total_user_activity_count,
                "total_records": total_activity_count + total_user_activity_count,
            }

        # Step 1: Aggregate into FeatureUsageSummary before dumping
        logger.info(f"[ActivityLogLifecycle] Aggregating {total_activity_count} activity logs into feature summaries...")
        summaries_touched = cls.aggregate_metrics_for_logs(activity_qs)

        # Step 2: Stream raw records into compressed JSONL file via streaming iterator
        logger.info(f"[ActivityLogLifecycle] Streaming raw logs to cold archive: {archive_name}...")
        archived_records = 0

        with gzip.open(archive_file_path, "wt", encoding="utf-8") as gz_file:
            header_record = {
                "_type": "METADATA",
                "archive_id": archive_id,
                "created_at": timezone.now().isoformat(),
                "cutoff_date": cutoff_date.isoformat(),
                "days_to_keep": days_to_keep,
                "activity_logs_count": total_activity_count,
                "user_activity_logs_count": total_user_activity_count,
            }
            gz_file.write(json.dumps(header_record) + "\n")

            # Stream ActivityLog rows via values iterator
            for row in activity_qs.values("id", "user_id", "action_name", "endpoint", "http_method", "ip_address", "timestamp").iterator(chunk_size=10000):
                if row.get("timestamp"):
                    row["timestamp"] = row["timestamp"].isoformat()
                row["_type"] = "ActivityLog"
                gz_file.write(json.dumps(row) + "\n")
                archived_records += 1

            # Stream UserActivityLog rows via values iterator
            for row in user_activity_qs.values("id", "user_id", "status", "timestamp").iterator(chunk_size=10000):
                if row.get("timestamp"):
                    row["timestamp"] = row["timestamp"].isoformat()
                row["_type"] = "UserActivityLog"
                gz_file.write(json.dumps(row) + "\n")
                archived_records += 1

        # Calculate Checksum
        sha256_hash = cls.calculate_sha256(str(archive_file_path))
        file_size_bytes = os.path.getsize(archive_file_path)
        sidecar_path = archive_root / f"{archive_name}.sha256"
        with open(sidecar_path, "w", encoding="utf-8") as f:
            f.write(f"{sha256_hash}  {archive_name}\n")

        # Step 3: Fast bulk delete using direct SQL queries inside atomic transaction
        logger.info("[ActivityLogLifecycle] Pruning raw logs from hot operational database...")
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM core_activitylog WHERE timestamp < %s", [cutoff_date])
                pruned_activity = cursor.rowcount if cursor.rowcount != -1 else total_activity_count

                cursor.execute("DELETE FROM core_useractivitylog WHERE timestamp < %s", [cutoff_date])
                pruned_user_activity = cursor.rowcount if cursor.rowcount != -1 else total_user_activity_count

        # Step 4: Reclaim disk space if SQLite
        reclaimed_storage = False
        db_engine = settings.DATABASES["default"].get("ENGINE", "")
        if "sqlite" in db_engine:
            try:
                connection.close()
                with connection.cursor() as cursor:
                    cursor.execute("VACUUM;")
                reclaimed_storage = True
                logger.info("[ActivityLogLifecycle] SQLite VACUUM completed successfully.")
            except Exception as e:
                logger.warning(f"[ActivityLogLifecycle] SQLite VACUUM skipped: {e}")

        logger.info(
            f"[ActivityLogLifecycle] Completed archival and pruning: "
            f"{archived_records} archived to {archive_name} ({file_size_bytes / (1024*1024):.2f} MB), "
            f"{pruned_activity + pruned_user_activity} deleted from hot DB."
        )

        return {
            "success": True,
            "dry_run": False,
            "archive_name": archive_name,
            "archive_size_mb": round(file_size_bytes / (1024 * 1024), 2),
            "sha256": sha256_hash,
            "days_kept": days_to_keep,
            "cutoff_date": cutoff_date.isoformat(),
            "archived_records": archived_records,
            "pruned_activity_logs": pruned_activity,
            "pruned_user_activity_logs": pruned_user_activity,
            "total_pruned": pruned_activity + pruned_user_activity,
            "feature_summaries_updated": summaries_touched,
            "reclaimed_storage": reclaimed_storage,
        }

    @classmethod
    def get_feature_analytics(cls, days: int = 30) -> Dict[str, Any]:
        """
        Returns rich product usage intelligence:
        - Top features by hits and unique users
        - Daily trends
        - Hot operational DB counts
        - Cold archive inventory
        """
        start_date = timezone.now().date() - timedelta(days=days)

        # 1. Summaries from FeatureUsageSummary table
        summaries_qs = FeatureUsageSummary.objects.filter(date__gte=start_date)

        # Group by action_name
        feature_metrics = (
            summaries_qs.values("action_name", "endpoint", "http_method")
            .annotate(
                total_hits=models_sum("hit_count"),
                unique_users=models_max("unique_users_count")
            )
            .order_by("-total_hits")[:15]
        )

        total_tracked_hits = sum(item["total_hits"] or 0 for item in feature_metrics)

        # 2. Daily trends
        daily_trends_qs = (
            summaries_qs.values("date")
            .annotate(daily_hits=models_sum("hit_count"))
            .order_by("date")
        )
        daily_trends = [
            {"date": entry["date"].isoformat(), "hits": entry["daily_hits"] or 0}
            for entry in daily_trends_qs
        ]

        # 3. Hot DB Active Stats
        active_activity_count = ActivityLog.objects.count()
        active_user_activity_count = UserActivityLog.objects.count()

        oldest_log = ActivityLog.objects.order_by("timestamp").values_list("timestamp", flat=True).first()
        newest_log = ActivityLog.objects.order_by("-timestamp").values_list("timestamp", flat=True).first()

        # 4. Cold Archive Inventory
        archive_root = cls.ensure_archive_dir()
        cold_archives = []
        for f in sorted(archive_root.glob("activity_logs_cold_archive_*.jsonl.gz"), key=os.path.getmtime, reverse=True):
            size_mb = round(os.path.getsize(f) / (1024 * 1024), 2)
            mtime = datetime.fromtimestamp(os.path.getmtime(f), tz=dt_timezone.utc).isoformat()
            cold_archives.append({
                "file_name": f.name,
                "file_size_mb": size_mb,
                "created_at": mtime,
            })

        return {
            "period_days": days,
            "total_hits": total_tracked_hits,
            "top_features": list(feature_metrics),
            "daily_trends": daily_trends,
            "hot_db": {
                "activity_logs_count": active_activity_count,
                "user_activity_logs_count": active_user_activity_count,
                "total_hot_logs": active_activity_count + active_user_activity_count,
                "oldest_log": oldest_log.isoformat() if oldest_log else None,
                "newest_log": newest_log.isoformat() if newest_log else None,
            },
            "cold_archives_count": len(cold_archives),
            "cold_archives": cold_archives,
        }


def models_sum(field_name: str):
    from django.db.models import Sum
    return Sum(field_name)


def models_max(field_name: str):
    from django.db.models import Max
    return Max(field_name)
