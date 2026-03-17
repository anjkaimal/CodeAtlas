from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


@contextmanager
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None


def create_email_user(email: str, name: str, password_hash: str) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO users (email, name, password_hash, auth_provider)
                VALUES (%s, %s, %s, 'email')
                RETURNING *
                """,
                (email, name, password_hash),
            )
            return dict(cur.fetchone())


def get_or_create_oauth_user(
    replit_id: str,
    email: str,
    name: Optional[str],
    picture: Optional[str],
) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO users (replit_id, email, name, picture, auth_provider)
                VALUES (%s, %s, %s, %s, 'oauth')
                ON CONFLICT (replit_id) DO UPDATE SET
                    email = EXCLUDED.email,
                    name = EXCLUDED.name,
                    picture = EXCLUDED.picture
                RETURNING *
                """,
                (replit_id, email, name, picture),
            )
            return dict(cur.fetchone())


def add_search_history(
    user_id: int,
    repo_url: str,
    workspace_path: Optional[str],
    stats: Optional[dict],
) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO search_history (user_id, repo_url, workspace_path, stats)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (user_id, repo_url, workspace_path, json.dumps(stats) if stats else None),
            )
            return dict(cur.fetchone())


def get_user_history(user_id: int, limit: int = 30) -> list[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM search_history
                WHERE user_id = %s
                ORDER BY analyzed_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]
