import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['USE_SQLITE'] = 'False'
django.setup()

from core.models import User, AcademicInstitution, UserRole

def create_admin():
    print("Connecting to Supabase to initialize default institution and admin...")

    # 1. Create or get Default Academic Institution
    inst, created = AcademicInstitution.objects.get_or_create(
        id="2bef6fef-acb4-4767-8e58-b965c9e6253c",
        defaults={
            "name": "Suffah Islamic Academy",
            "slug": "suffah-islamic-academy",
            "institution_type": "MADRASA",
            "is_active": True,
        }
    )
    if created:
        print(f"[SUCCESS] Created Default AcademicInstitution: {inst.name} ({inst.id})")
    else:
        print(f"[EXISTS] AcademicInstitution: {inst.name} ({inst.id})")

    # 2. Create or update Super Admin user
    phone = "01700000000"
    email = "atiqurrahmansalama@gmail.com"
    name = "Atiqur Rahman"
    password = "@admin123"

    user = User.objects.filter(phone_number=phone).first()
    if not user:
        user = User.objects.create_superuser(
            phone_number=phone,
            password=password,
            email=email,
            name=name,
            institution=inst,
            user_type="SUPER_ADMIN"
        )
        print(f"[SUCCESS] Superuser created successfully! Phone: {user.phone_number}, ID: {user.id}")
    else:
        user.set_password(password)
        user.email = email
        user.name = name
        user.institution = inst
        user.is_superuser = True
        user.is_staff = True
        user.user_type = "SUPER_ADMIN"
        user.save()
        print(f"[SUCCESS] Superuser updated with new password! Phone: {user.phone_number}, ID: {user.id}")

    print("\n--- CREDENTIALS ---")
    print(f"Phone / Username: {phone}")
    print(f"Password: {password}")
    print(f"Email: {email}")
    print(f"User Type: SUPER_ADMIN")
    print(f"Institution ID: {inst.id}")

if __name__ == "__main__":
    create_admin()
