from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0095_staffonboardingtoken_allowed_designations'),
    ]

    operations = [
        migrations.AlterField(
            model_name='staffonboardingtoken',
            name='staff_type',
            field=models.CharField(db_index=True, default='TEACHING', max_length=50),
        ),
    ]

