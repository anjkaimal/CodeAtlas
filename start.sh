#!/bin/bash
export PATH="$HOME/workspace/.pythonlibs/bin:$PATH"
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
cd frontend && npm run dev
