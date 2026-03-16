#!/bin/bash
cd backend && uvicorn app.main:app --host localhost --port 8000 &
cd frontend && npm run dev
