"""
Data Migration: Backfill ReportPortion and ReportErrorDetail from legacy data.

- Reads juz_and_pages JSON → creates ReportPortion rows
- Reads MistakeDetail + StuckDetail → creates ReportErrorDetail rows
- Is IDEMPOTENT: skips reports that already have portions/error_details
- Runs inside a transaction for safety
"""
from django.db import migrations


def _safe_int(val, default=0):
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def backfill_normalized_tables(apps, schema_editor):
    StudentDailyReport = apps.get_model('core', 'StudentDailyReport')
    ReportPortion      = apps.get_model('core', 'ReportPortion')
    ReportErrorDetail  = apps.get_model('core', 'ReportErrorDetail')
    MistakeDetail      = apps.get_model('core', 'MistakeDetail')
    StuckDetail        = apps.get_model('core', 'StuckDetail')

    portions_to_create = []
    errors_to_create   = []

    for report in StudentDailyReport.objects.all().iterator(chunk_size=500):

        # ── 1. Backfill ReportPortion from juz_and_pages JSON ─────────────────
        already_has_portions = ReportPortion.objects.filter(report_id=report.pk).exists()
        if not already_has_portions:
            juz_pages = report.juz_and_pages or []
            if isinstance(juz_pages, list):
                for entry in juz_pages:
                    if not isinstance(entry, dict):
                        continue
                    juz = _safe_int(entry.get('juz'), 0)
                    if not juz:
                        continue

                    ranges = entry.get('ranges') or []
                    if ranges:
                        for r in ranges:
                            start_page = _safe_int(r.get('start') or r.get('page_start'), 1)
                            end_page   = _safe_int(r.get('end')   or r.get('page_end'),   start_page)
                            portions_to_create.append(ReportPortion(
                                report_id=report.pk,
                                start_juz=juz,
                                start_page=start_page,
                                start_ayah=1,
                                end_juz=juz,
                                end_page=end_page,
                                end_ayah=1,
                            ))
                    else:
                        # Single page entry without ranges array
                        page = _safe_int(entry.get('page'), 1)
                        if page:
                            portions_to_create.append(ReportPortion(
                                report_id=report.pk,
                                start_juz=juz,
                                start_page=page,
                                start_ayah=1,
                                end_juz=juz,
                                end_page=page,
                                end_ayah=1,
                            ))

        # ── 2. Backfill ReportErrorDetail from MistakeDetail / StuckDetail ────
        already_has_errors = ReportErrorDetail.objects.filter(report_id=report.pk).exists()
        if not already_has_errors:
            for m in MistakeDetail.objects.filter(report_id=report.pk):
                juz  = _safe_int(m.juz)
                page = _safe_int(m.page)
                ayah = _safe_int(m.ayah)
                if juz or page:
                    errors_to_create.append(ReportErrorDetail(
                        report_id=report.pk,
                        type='Mistake',
                        juz=juz,
                        page=page,
                        ayah=ayah,
                    ))

            for s in StuckDetail.objects.filter(report_id=report.pk):
                juz  = _safe_int(s.juz)
                page = _safe_int(s.page)
                ayah = _safe_int(s.ayah)
                if juz or page:
                    errors_to_create.append(ReportErrorDetail(
                        report_id=report.pk,
                        type='Stuck',
                        juz=juz,
                        page=page,
                        ayah=ayah,
                    ))

    # Bulk insert in one shot for efficiency
    if portions_to_create:
        ReportPortion.objects.bulk_create(portions_to_create, ignore_conflicts=True)
        print(f"[DATA MIGRATION] Created {len(portions_to_create)} ReportPortion rows.")

    if errors_to_create:
        ReportErrorDetail.objects.bulk_create(errors_to_create, ignore_conflicts=True)
        print(f"[DATA MIGRATION] Created {len(errors_to_create)} ReportErrorDetail rows.")


def reverse_backfill(apps, schema_editor):
    """Reversible: just wipe the normalized tables (legacy data remains intact)."""
    ReportPortion     = apps.get_model('core', 'ReportPortion')
    ReportErrorDetail = apps.get_model('core', 'ReportErrorDetail')
    ReportPortion.objects.all().delete()
    ReportErrorDetail.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_add_report_portion_error_detail_and_new_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_normalized_tables, reverse_code=reverse_backfill),
    ]
