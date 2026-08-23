import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def compile_custom_report_task(self, template_id, filter_params, requested_by_user_id, tenant_id=None):
    """
    Compiles complex enterprise reports and generates PDF/Excel artifacts asynchronously.
    """
    try:
        from core.services import ReportGenerationService
        service = ReportGenerationService()
        result = service.generate_report(
            template_id=template_id,
            filters=filter_params,
            user_id=requested_by_user_id,
            tenant_id=tenant_id
        )
        logger.info(f"Custom report {template_id} generated successfully.")
        return result
    except Exception as exc:
        logger.error(f"Report generation task failed: {exc}")
        return {"status": "error", "message": str(exc)}
