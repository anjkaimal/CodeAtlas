#!/bin/bash

# Load .env file for local development (ignored on Replit where vars are injected)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Replit stores packages under .pythonlibs; ignored when that path doesn't exist
export PATH="$HOME/workspace/.pythonlibs/bin:$PATH"

cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
cd frontend && npm run dev
