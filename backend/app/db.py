from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Optional

# ── Database backend selection ─────────────────────────────────────────────
# Uses PostgreSQL when DATABASE_URL is set (Replit / production).
# Falls back to a local SQLite file for zero-config local development.

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USE_POSTGRES = bool(DATABASE_URL)

# SQLite file lives at the repo root so it's easy to find / delete
_SQLITE_PATH = Path(__file__).resolve().parent.parent.parent / "codeatlas_local.db"

_SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    replit_id       TEXT    UNIQUE,
    email           TEXT    UNIQUE NOT NULL,
    name            TEXT,
    picture         TEXT,
    password_hash   TEXT,
    auth_provider   TEXT NOT NULL DEFAULT 'email',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_url        TEXT    NOT NULL,
    workspace_path  TEXT,
    analyzed_at     TEXT NOT NULL DEFAULT (datetime('now')),
    stats           TEXT
);
"""


# ── Low-level helpers ──────────────────────────────────────────────────────

def _pg_to_sqlite(sql: str) -> str:
    """Convert PostgreSQL-style %s placeholders to SQLite ? style."""
    return sql.replace("%s", "?")


def _normalise_row(row: dict) -> dict:
    """Ensure consistent Python types regardless of backend.

    - stats: always deserialised to dict/None (jsonb in PG, TEXT in SQLite)
    - analyzed_at / created_at: always ISO-8601 string
    """
    out = dict(row)
    # stats
    if "stats" in out and isinstance(out["stats"], str):
        try:
            out["stats"] = json.loads(out["stats"])
        except Exception:
            pass
    # timestamp fields
    for key in ("analyzed_at", "created_at"):
        if key in out and out[key] is not None and not isinstance(out[key], str):
            out[key] = out[key].isoformat()
    return out


@contextmanager
def get_db():
    if USE_POSTGRES:
        import psycopg2  # type: ignore
        conn = psycopg2.connect(DATABASE_URL)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(_SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        conn.executescript(_SQLITE_SCHEMA)
        conn.commit()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def _exec(conn: Any, sql: str, params: tuple = ()) -> list[dict]:
    """Run SQL on either backend; always returns a list of plain dicts."""
    if USE_POSTGRES:
        from psycopg2.extras import RealDictCursor  # type: ignore
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            try:
                rows = cur.fetchall() or []
            except Exception:
                rows = []
        return [_normalise_row(dict(r)) for r in rows]
    else:
        cur = conn.execute(_pg_to_sqlite(sql), params)
        try:
            rows = cur.fetchall() or []
        except Exception:
            rows = []
        return [_normalise_row(dict(r)) for r in rows]


# ── Public query functions ─────────────────────────────────────────────────

def get_user_by_email(email: str) -> Optional[dict]:
    with get_db() as conn:
        rows = _exec(conn, "SELECT * FROM users WHERE email = %s", (email,))
        return rows[0] if rows else None


def get_user_by_id(user_id: int) -> Optional[dict]:
    with get_db() as conn:
        rows = _exec(conn, "SELECT * FROM users WHERE id = %s", (user_id,))
        return rows[0] if rows else None


def create_email_user(email: str, name: str, password_hash: str) -> dict:
    with get_db() as conn:
        rows = _exec(
            conn,
            """
            INSERT INTO users (email, name, password_hash, auth_provider)
            VALUES (%s, %s, %s, 'email')
            RETURNING *
            """,
            (email, name, password_hash),
        )
        return rows[0]


def get_or_create_oauth_user(
    oauth_id: str,
    email: str,
    name: Optional[str],
    picture: Optional[str],
    provider: str = "google",
) -> dict:
    """Upsert an OAuth user keyed on the provider's user ID (stored in replit_id column)."""
    with get_db() as conn:
        rows = _exec(
            conn,
            """
            INSERT INTO users (replit_id, email, name, picture, auth_provider)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (replit_id) DO UPDATE SET
                email        = EXCLUDED.email,
                name         = EXCLUDED.name,
                picture      = EXCLUDED.picture,
                auth_provider = EXCLUDED.auth_provider
            RETURNING *
            """,
            (oauth_id, email, name, picture, provider),
        )
        return rows[0]


def add_search_history(
    user_id: int,
    repo_url: str,
    workspace_path: Optional[str],
    stats: Optional[dict],
) -> dict:
    with get_db() as conn:
        rows = _exec(
            conn,
            """
            INSERT INTO search_history (user_id, repo_url, workspace_path, stats)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (user_id, repo_url, workspace_path, json.dumps(stats) if stats else None),
        )
        return rows[0]


def get_user_history(user_id: int, limit: int = 30) -> list[dict]:
    with get_db() as conn:
        return _exec(
            conn,
            """
            SELECT * FROM search_history
            WHERE user_id = %s
            ORDER BY analyzed_at DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
