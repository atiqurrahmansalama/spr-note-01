"""
Dual Database Migration Runner for SPR Note
Applies Django migrations simultaneously to:
1. Local SQLite Engine (db.sqlite3)
2. Live Supabase PostgreSQL Engine (DATABASE_URL)
"""
import os
import subprocess
import sys


def run_command(cmd, env_overrides=None):
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)
    print(f"\n>> Executing: {' '.join(cmd)} [env: {env_overrides or 'default'}]")
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        print(f"FAILED with exit code {result.returncode}")
        return False
    print("SUCCESS")
    return True


def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    manage_py = os.path.join(base_dir, "backend", "manage.py")
    python_bin = sys.executable

    print("=" * 60)
    print("  SPR NOTE: DUAL-DATABASE SCHEMA MIGRATION RUNNER")
    print("=" * 60)

    # 1. Local SQLite Migration
    print("\n[Step 1/2] Migrating Local SQLite Database (db.sqlite3)...")
    success_sqlite = run_command(
        [python_bin, manage_py, "migrate", "--noinput"],
        env_overrides={"USE_SQLITE": "True"}
    )

    # 2. Live Supabase PostgreSQL Migration
    print("\n[Step 2/2] Migrating Live Supabase PostgreSQL Database...")
    success_pg = run_command(
        [python_bin, manage_py, "migrate", "--noinput"],
        env_overrides={"USE_SQLITE": "False"}
    )

    print("\n" + "=" * 60)
    if success_sqlite and success_pg:
        print("  ALL MIGRATIONS APPLIED SUCCESSFULLY TO BOTH DATABASES!")
    else:
        print("  WARNING: One or more migrations failed. Review logs above.")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
