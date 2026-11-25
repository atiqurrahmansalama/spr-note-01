"""
PostgreSQL Row-Level Security (RLS) Migration for Module 03 Dashboard tables
(`olu_daily_surprises` and `olu_achievements`).
No-ops cleanly on SQLite.
"""
from django.db import migrations


DASHBOARD_RLS_SQL = """
ALTER TABLE olu_daily_surprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE olu_daily_surprises, olu_achievements FROM anon;
    END IF;
END $$;

DROP POLICY IF EXISTS olu_surprises_member_select ON olu_daily_surprises;
CREATE POLICY olu_surprises_member_select ON olu_daily_surprises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_daily_surprises.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_surprises_owner_write ON olu_daily_surprises;
CREATE POLICY olu_surprises_owner_write ON olu_daily_surprises
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_daily_surprises.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_daily_surprises.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_achievements_member_select ON olu_achievements;
CREATE POLICY olu_achievements_member_select ON olu_achievements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_achievements.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_achievements_owner_write ON olu_achievements;
CREATE POLICY olu_achievements_owner_write ON olu_achievements
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_achievements.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_achievements.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );
"""

DASHBOARD_RLS_DISABLE_SQL = """
ALTER TABLE olu_daily_surprises DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_achievements DISABLE ROW LEVEL SECURITY;
"""


def apply_dashboard_rls(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(DASHBOARD_RLS_SQL)


def revert_dashboard_rls(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(DASHBOARD_RLS_DISABLE_SQL)


class Migration(migrations.Migration):

    dependencies = [
        ("our_little_universe", "0004_dashboard_module"),
    ]

    operations = [
        migrations.RunPython(apply_dashboard_rls, reverse_code=revert_dashboard_rls),
    ]
