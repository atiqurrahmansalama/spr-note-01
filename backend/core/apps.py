from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        try:
            from core.services.outbox_service import register_outbox_signals
            register_outbox_signals()
        except Exception:
            pass

        try:
            import os
            import sys
            cmd = " ".join(sys.argv).lower()
            is_management_cmd = any(x in cmd for x in ["migrate", "makemigrations", "test", "check", "shell", "seed"])
            if not is_management_cmd:
                is_runserver = "runserver" in cmd
                should_start = (os.environ.get('RUN_MAIN') == 'true') if is_runserver else True
                if should_start:
                    from core.services.replication_service import CloudReplicationService
                    CloudReplicationService.start_replication_worker(interval_seconds=15.0)
        except Exception:
            pass


