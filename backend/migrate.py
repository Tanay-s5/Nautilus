import hashlib
import os
import re
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg import sql

load_dotenv()

MIGRATIONS_DIR = Path(__file__).parent / "migrations"
APP_ROLE = "nautilus_app"
MIGRATION_LOCK_KEY = 727_001 #random number

def ensure_app_role(conn: psycopg.Connection, password: str) -> None:
    exists = conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (APP_ROLE,)).fetchone()
    verb = "ALTER" if exists else "CREATE"
    conn.execute(
        sql.SQL("{} ROLE {} LOGIN PASSWORD {}").format(
            sql.SQL(verb), sql.Identifier(APP_ROLE), sql.Literal(password)
        )
    )
    conn.execute(
        sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
            sql.Identifier(conn.info.dbname), sql.Identifier(APP_ROLE)
        )
    )


def migrate(owner_url: str, app_password: str) -> int:
    files = sorted(p for p in MIGRATIONS_DIR.glob("*.sql") if re.match(r"^\d{4}_", p.name))
    applied_now = 0

    with psycopg.connect(owner_url, autocommit=True) as conn:
        conn.execute("SELECT pg_advisory_lock(%s)", (MIGRATION_LOCK_KEY,))
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    filename   text PRIMARY KEY,
                    checksum   text        NOT NULL,
                    applied_at timestamptz NOT NULL DEFAULT now()
                )
                """
            )
            ensure_app_role(conn, app_password)

            done = dict(conn.execute("SELECT filename, checksum FROM schema_migrations").fetchall())
            for path in files:
                text = path.read_text()
                checksum = hashlib.sha256(text.encode()).hexdigest()
                if path.name in done:
                    if done[path.name] != checksum:
                        raise RuntimeError(
                            f"{path.name} was already applied but has been edited. "
                            "Never edit an applied migration; add a new numbered file."
                        )
                    continue
                with conn.transaction():
                    conn.execute(text)
                    conn.execute(
                        "INSERT INTO schema_migrations (filename, checksum) VALUES (%s, %s)",
                        (path.name, checksum),
                    )
                print(f"applied {path.name}")
                applied_now += 1
        finally:
            conn.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_KEY,))

    if applied_now == 0:
        print("database already up to date")
    return applied_now


if __name__ == "__main__":
    owner = os.getenv("OWNER_DATABASE_URL")
    password = os.getenv("APP_DB_PASSWORD")
    if not owner or not password:
        sys.exit("OWNER_DATABASE_URL and APP_DB_PASSWORD must be set (see .env.example)")
    migrate(owner, password)
