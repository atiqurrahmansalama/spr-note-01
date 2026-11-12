from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0094_staffonboardingtoken_onboarding_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='staffonboardingtoken',
            name='allowed_designations',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of permitted rank/designation titles applicants may apply for',
            ),
        ),
    ]

