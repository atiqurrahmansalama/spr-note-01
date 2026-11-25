"""
PostgreSQL Row-Level Security (RLS) Migration for the isolated `our_little_universe` app
(`olu_*` tables using decoupled `owner_user_id` / `user_id`).
Safely no-ops on local SQLite (`universe_db.sqlite3`) while enforcing strict PostgreSQL RLS.
"""
from django.db import migrations


RLS_ENABLE_SQL = """
ALTER TABLE olu_universe_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_universe_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_access_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE
            olu_universe_spaces,
            olu_universe_members,
            olu_module_registry,
            olu_user_progress,
            olu_media_assets,
            olu_access_audit_logs,
            olu_story_profiles,
            olu_story_milestones
        FROM anon;
    END IF;
END $$;

-- 1. olu_universe_spaces
DROP POLICY IF EXISTS olu_spaces_member_select ON olu_universe_spaces;
CREATE POLICY olu_spaces_member_select ON olu_universe_spaces
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_universe_spaces.id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_spaces_owner_write ON olu_universe_spaces;
CREATE POLICY olu_spaces_owner_write ON olu_universe_spaces
    FOR ALL
    USING (owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint)
    WITH CHECK (owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint);

-- 2. olu_universe_members
DROP POLICY IF EXISTS olu_members_select ON olu_universe_members;
CREATE POLICY olu_members_select ON olu_universe_members
    FOR SELECT
    USING (
        user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        OR EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_universe_members.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_members_owner_write ON olu_universe_members;
CREATE POLICY olu_members_owner_write ON olu_universe_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_universe_members.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_universe_members.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- 3. olu_module_registry
DROP POLICY IF EXISTS olu_modules_member_select ON olu_module_registry;
CREATE POLICY olu_modules_member_select ON olu_module_registry
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_module_registry.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_modules_owner_write ON olu_module_registry;
CREATE POLICY olu_modules_owner_write ON olu_module_registry
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_module_registry.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_module_registry.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- 4. olu_user_progress
DROP POLICY IF EXISTS olu_progress_self_or_owner ON olu_user_progress;
CREATE POLICY olu_progress_self_or_owner ON olu_user_progress
    FOR ALL
    USING (
        user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        OR EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_user_progress.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        OR EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_user_progress.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- 5. olu_media_assets
DROP POLICY IF EXISTS olu_media_member_select ON olu_media_assets;
CREATE POLICY olu_media_member_select ON olu_media_assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_media_assets.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_media_owner_write ON olu_media_assets;
CREATE POLICY olu_media_owner_write ON olu_media_assets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_media_assets.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_media_assets.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- 6. olu_access_audit_logs
DROP POLICY IF EXISTS olu_audit_owner_select ON olu_access_audit_logs;
CREATE POLICY olu_audit_owner_select ON olu_access_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_access_audit_logs.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

-- 7. olu_story_profiles & olu_story_milestones
DROP POLICY IF EXISTS olu_story_profiles_member_select ON olu_story_profiles;
CREATE POLICY olu_story_profiles_member_select ON olu_story_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_story_profiles.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_story_profiles_owner_write ON olu_story_profiles;
CREATE POLICY olu_story_profiles_owner_write ON olu_story_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_profiles.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_profiles.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_story_milestones_member_select ON olu_story_milestones;
CREATE POLICY olu_story_milestones_member_select ON olu_story_milestones
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_members m
            WHERE m.space_id = olu_story_milestones.space_id
              AND m.is_active = true
              AND m.user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );

DROP POLICY IF EXISTS olu_story_milestones_owner_write ON olu_story_milestones;
CREATE POLICY olu_story_milestones_owner_write ON olu_story_milestones
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_milestones.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM olu_universe_spaces s
            WHERE s.id = olu_story_milestones.space_id
              AND s.owner_user_id = NULLIF(current_setting('app.universe_user_id', true), '')::bigint
        )
    );
"""

RLS_DISABLE_SQL = """
ALTER TABLE olu_universe_spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_universe_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_module_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_access_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE olu_story_milestones DISABLE ROW LEVEL SECURITY;
"""


def apply_universe_rls(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(RLS_ENABLE_SQL)


def revert_universe_rls(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(RLS_DISABLE_SQL)


class Migration(migrations.Migration):

    dependencies = [
        ("our_little_universe", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(apply_universe_rls, reverse_code=revert_universe_rls),
    ]
