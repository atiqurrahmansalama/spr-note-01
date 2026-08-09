"""
Data Migration: Backfill ReportStatus from legacy StudentDailyReport fields.

Before migration 0008, StudentDailyReport had:
  - is_edited, edited_at
  - is_locked
  - is_deleted

This migration reads those values from the pre-migration state and creates
the corresponding ReportStatus row for each report.
"""
from django.db import migrations


def backfill_report_status(apps, schema_editor):
    """
    NOTE: By the time this runs, is_edited/is_locked/is_deleted are already
    removed from StudentDailyReport (migration 0008 ran first).
    We create a default ReportStatus (all False) for every existing report
    that doesn't already have one.
    """
    StudentDailyReport = apps.get_model('core', 'StudentDailyReport')
    ReportStatus = apps.get_model('core', 'ReportStatus')

    statuses_to_create = []
    existing_ids = set(
        ReportStatus.objects.values_list('report_id', flat=True)
    )

    for report in StudentDailyReport.objects.all().iterator(chunk_size=500):
        if report.pk not in existing_ids:
            statuses_to_create.append(
                ReportStatus(
                    report_id=report.pk,
                    is_edited=False,
                    edit_time=None,
                    is_locked=False,
                    lock_time=None,
                    is_deleted=False,
                    delete_time=None,
                )
            )

    if statuses_to_create:
        ReportStatus.objects.bulk_create(statuses_to_create, ignore_conflicts=True)
        print(f"[DATA MIGRATION] Created {len(statuses_to_create)} ReportStatus rows.")


def reverse_backfill(apps, schema_editor):
    """Reversible: delete all ReportStatus rows (schema migration will re-add the fields)."""
    ReportStatus = apps.get_model('core', 'ReportStatus')
    ReportStatus.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_add_report_status_table'),
    ]

    operations = [
        migrations.RunPython(backfill_report_status, reverse_code=reverse_backfill),
    ]
