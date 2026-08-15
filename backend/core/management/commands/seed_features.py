from django.core.management.base import BaseCommand
from core.services import sync_feature_registry_to_db

class Command(BaseCommand):
    help = "Syncs static feature registry definition manifest to database AppSection tables"

    def handle(self, *args, **options):
        self.stdout.write("Syncing static feature registry manifest to database...")
        sync_feature_registry_to_db()
        self.stdout.write(self.style.SUCCESS("Successfully synced feature registry!"))
