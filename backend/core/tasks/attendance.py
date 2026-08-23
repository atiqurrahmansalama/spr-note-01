import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def process_biometric_punches_task(self, device_id, raw_punches, tenant_id=None):
    """
    Parses and processes large batches of biometric logs asynchronously.
    """
    try:
        from core.services import AttendanceService
        service = AttendanceService()
        result = service.process_device_punches(
            device_id=device_id,
            punches=raw_punches,
            tenant_id=tenant_id
        )
        logger.info(f"Processed {len(raw_punches)} punches for device {device_id}")
        return result
    except Exception as exc:
        logger.error(f"Biometric punch task failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True)
def generate_daily_attendance_summary_task(self, target_date=None, tenant_id=None):
    """
    Computes and updates pre-aggregated attendance numbers for ultra-fast reporting.
    """
    try:
        from core.services import AttendanceAggregationService
        service = AttendanceAggregationService()
        result = service.compute_daily_summaries(target_date=target_date, tenant_id=tenant_id)
        logger.info(f"Daily summary aggregation completed for date {target_date}")
        return result
    except Exception as exc:
        logger.error(f"Attendance summary aggregation failed: {exc}")
        return {"status": "error", "message": str(exc)}
