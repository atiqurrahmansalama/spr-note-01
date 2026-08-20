from django.db import migrations


def run_sync_feature_registry(apps, schema_editor):
    try:
        from core.services import sync_feature_registry_to_db
        sync_feature_registry_to_db()
    except Exception as e:
        print(f"Warning: Could not sync feature registry during migration: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0046_classperiodslot_teacher'),
    ]

    operations = [
        migrations.RunPython(run_sync_feature_registry, migrations.RunPython.noop),
    ]
