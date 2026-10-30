# Generated for CustomDocxTemplate.is_global_sticky
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0091_academysectionoverride'),
    ]

    operations = [
        migrations.AddField(
            model_name='customdocxtemplate',
            name='is_global_sticky',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]

