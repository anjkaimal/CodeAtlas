# CodeAtlas

An AI-powered repository explorer that lets developers analyze codebases, visualize dependency graphs, and get AI-generated architectural summaries.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Flow
  - Runs on port 5000 (0.0.0.0)
- **Backend**: Python FastAPI + Uvicorn
  - Runs on port 8000 (localhost)
  - Uses OpenAI API for summaries and feature suggestions
  - Uses GitPython for cloning repositories

## Running the App

The `start.sh` script starts both services:
```
bash start.sh
```

- Backend: `uvicorn app.main:app --host localhost --port 8000` (from `backend/`)
- Frontend: `npm run dev` (from `frontend/`)

## Key Files

- `backend/app/main.py` - FastAPI entry point and route definitions
- `backend/app/services/repo_service.py` - Core repo cloning/analysis logic
- `frontend/src/App.tsx` - Main React component
- `frontend/src/api/client.ts` - API client (defaults to `http://127.0.0.1:8000`)
- `frontend/vite.config.ts` - Vite config (port 5000, allowedHosts: true)

## Environment Variables

- `VITE_API_BASE` - Override the backend API base URL (default: `http://127.0.0.1:8000`)
- `OPENAI_API_KEY` - Required for AI summaries and feature suggestions

## Dependencies

**Backend** (`backend/requirements.txt`):
- fastapi, uvicorn[standard], GitPython, openai, python-multipart

**Frontend** (`frontend/package.json`):
- react, react-dom, reactflow, tailwindcss, vite, typescript
