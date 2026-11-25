"""
PostgreSQL Row-Level Security (RLS) Migration for Module 04 Story expansion tables
(`olu_story_chapters`, `olu_story_comparisons`, `olu_story_special_dates`, `olu_story_interactions`).
No-ops cleanly on SQLite.
"""
from django.db import migrations


STORY_RLS_SQL = """
ALTER TABLE olu_story_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE olu_story_chapters, olu_story_comparisons, olu_story_special_dates, olu_story_interactions FROM anon;
    END IF;
END $$;

-- Chapters
DROP POLICY IF EXISTS olu_story_chapters_member_select ON olu_story_chapters;
CREATE POLICY olu_story_chapters_member_select ON olu_story_chapters
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_story_chapters.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_story_chapters_owner_write ON olu_story_chapters;
CREATE POLICY olu_story_chapters_owner_write ON olu_story_chapters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_chapters.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_chapters.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- Comparisons (Then & Now)
DROP POLICY IF EXISTS olu_story_comparisons_member_select ON olu_story_comparisons;
CREATE POLICY olu_story_comparisons_member_select ON olu_story_comparisons
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_story_comparisons.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_story_comparisons_owner_write ON olu_story_comparisons;
CREATE POLICY olu_story_comparisons_owner_write ON olu_story_comparisons
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_comparisons.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_comparisons.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- Special Dates
DROP POLICY IF EXISTS olu_story_dates_member_select ON olu_story_special_dates;
CREATE POLICY olu_story_dates_member_select ON olu_story_special_dates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_story_special_dates.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_story_dates_owner_write ON olu_story_special_dates;
CREATE POLICY olu_story_dates_owner_write ON olu_story_special_dates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_special_dates.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_special_dates.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- Story Interactions (own member progress)
DROP POLICY IF EXISTS olu_story_interactions_member_rw ON olu_story_interactions;
CREATE POLICY olu_story_interactions_member_rw ON olu_story_interactions
    FOR ALL
    USING (
        olu_story_interactions.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        OR EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_interactions.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        olu_story_interactions.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        OR EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_interactions.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );
"""


def apply_story_rls(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(STORY_RLS_SQL)


def reverse_story_rls(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            ALTER TABLE olu_story_chapters DISABLE ROW LEVEL SECURITY;
            ALTER TABLE olu_story_comparisons DISABLE ROW LEVEL SECURITY;
            ALTER TABLE olu_story_special_dates DISABLE ROW LEVEL SECURITY;
            ALTER TABLE olu_story_interactions DISABLE ROW LEVEL SECURITY;
            """
        )


class Migration(migrations.Migration):
    dependencies = [
        ("our_little_universe", "0006_story_module_expansion"),
    ]

    operations = [
        migrations.RunPython(apply_story_rls, reverse_code=reverse_story_rls),
    ]
