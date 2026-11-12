from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0093_sync_admin_staff_and_users'),
    ]

    operations = [
        migrations.AddField(
            model_name='staffonboardingtoken',
            name='onboarding_mode',
            field=models.CharField(
                choices=[('QUICK', 'Quick Onboarding'), ('FULL', 'Full Onboarding Wizard')],
                default='FULL',
                help_text='Form flow presented to applicants opening this public invitation link',
                max_length=16,
            ),
        ),
    ]

