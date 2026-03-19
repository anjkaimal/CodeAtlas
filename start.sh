#!/bin/bash
# ── CodeAtlas startup script ─────────────────────────────────────────────
# Works on Replit and locally.
# Usage: bash start.sh
#
# Prerequisites (local only — Replit handles this automatically):
#   pip install -r backend/requirements.txt
#   cd frontend && npm install && cd ..

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
# On a regular machine this path won't exist and the export is harmless.
export PATH="$HOME/workspace/.pythonlibs/bin:$PATH"

# ── Start backend ─────────────────────────────────────────────────────────
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
