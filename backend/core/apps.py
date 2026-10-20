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
            # Avoid starting worker during manage.py migrate, test, or make_migrations
            import sys
            cmd = " ".join(sys.argv)
            if not any(x in cmd for x in ["migrate", "makemigrations", "test", "check"]):
                if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('SERVER_SOFTWARE'):
                    from core.services.replication_service import CloudReplicationService
                    CloudReplicationService.start_replication_worker(interval_seconds=15.0)
        except Exception:
            pass


