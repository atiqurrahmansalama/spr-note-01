"""
Idempotent management command to seed the isolated Our Little Universe database (`universe`)
and provision the OWNER + RECIPIENT IAM accounts.
"""
from django.core.management.base import BaseCommand
from core.models import User
from apps.our_little_universe.modules.welcome.services import bootstrap_universe_space
from apps.our_little_universe.modules.admin.services import provision_or_update_recipient


class Command(BaseCommand):
    help = "Seeds Our Little Universe isolated DB, OWNER, RECIPIENT, and module registry."

    def add_arguments(self, parser):
        parser.add_argument("--owner-email", default="owner@ouruniverse.local")
        parser.add_argument("--owner-password", default="OwnerUniverse#2026")
        parser.add_argument("--recipient-email", default="recipient@ouruniverse.local")
        parser.add_argument("--recipient-password", default="LoveUniverse#2026")
        parser.add_argument("--pin", default="1234")

    def handle(self, *args, **options):
        owner_email = options["owner_email"].strip().lower()
        owner_user = User.objects.filter(email__iexact=owner_email).first()
        if not owner_user:
            owner_user = User(
                phone_number="olu-owner-0001",
                email=owner_email,
                name="Universe Owner",
                user_type="ADMIN",
                is_staff=True,
                is_active=True,
                is_email_verified=True,
            )
            owner_user.set_password(options["owner_password"])
            owner_user.save()
            self.stdout.write(self.style.SUCCESS(f"Created OWNER user: {owner_email}"))
        else:
            self.stdout.write(f"Using existing OWNER user: {owner_email}")

        space = bootstrap_universe_space(owner_user, default_pin=options["pin"])
        self.stdout.write(self.style.SUCCESS(f"Bootstrapped space in `universe` DB: {space.title}"))

        recipient_email = options["recipient_email"].strip().lower()
        if recipient_email:
            member = provision_or_update_recipient(
                space=space,
                actor=owner_user,
                email=recipient_email,
                display_name="My Favorite Person",
                password=options["recipient_password"],
                is_active=True,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Provisioned RECIPIENT: {member.display_name} ({recipient_email})")
            )
