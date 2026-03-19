#!/bin/bash
# ── CodeAtlas startup script ─────────────────────────────────────────────
# Works on Replit and locally.
# Usage: bash start.sh

set -e

# Resolve the repo root regardless of where the script is called from.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env for local development (no-op when the file doesn't exist,
# which is always the case on Replit where env vars are injected).
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

# Replit stores Python packages under .pythonlibs.
export PATH="$HOME/workspace/.pythonlibs/bin:$PATH"

# ── Start backend ─────────────────────────────────────────────────────────
# Export key vars explicitly so child subshells always inherit the live values.
# On Replit, secrets added after first boot may arrive as empty strings in new
# child processes; exporting here captures the correct values from the shell.
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export SESSION_SECRET="${SESSION_SECRET:-}"
export DATABASE_URL="${DATABASE_URL:-}"
export GOOGLE_OAUTH_CLIENT_ID="${GOOGLE_OAUTH_CLIENT_ID:-}"
export GOOGLE_OAUTH_CLIENT_SECRET="${GOOGLE_OAUTH_CLIENT_SECRET:-}"
export REPLIT_DEV_DOMAIN="${REPLIT_DEV_DOMAIN:-}"

echo "Starting backend on http://localhost:8000 ..."
(
  cd "$REPO_ROOT/backend"
  uvicorn app.main:app --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Give uvicorn a moment to bind the port before Vite tries to proxy to it.
sleep 1

# ── Start frontend ────────────────────────────────────────────────────────
echo "Starting frontend on http://localhost:5000 ..."
(
  cd "$REPO_ROOT/frontend"
  npm run dev
)

# If npm exits (e.g. Ctrl-C), also stop the backend.
kill $BACKEND_PID 2>/dev/null || true
