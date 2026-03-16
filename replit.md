# CodeAtlas

An AI-powered repository explorer that lets developers analyze codebases, visualize dependency graphs, and get AI-generated architectural summaries, Q&A, and feature location suggestions.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Flow — port **5000**
- **Backend**: Python FastAPI + Uvicorn — port **8000**

Both are started together via `bash start.sh`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + OpenAI key status |
| POST | `/api/repos/analyze` | Clone/upload repo, scan, build graph (form-data: `repo_url` or `zip_file`) |
| POST | `/api/repos/summary` | AI architectural summary (JSON: `workspace_path`) |
| POST | `/api/repos/feature` | AI feature location suggestion (JSON: `workspace_path`, `feature_request`) |
| POST | `/api/repos/chat` | AI Q&A about the repo (JSON: `workspace_path`, `question`) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (AI features) | Enables summary, feature assistant, and Q&A |
| `CODEATLAS_OPENAI_MODEL` | No | Override model (default: `gpt-4.1-mini`) |
| `VITE_API_BASE` | No | Override backend base URL (default: `http://127.0.0.1:8000`) |

## Key Files

**Backend**
- `backend/app/main.py` — FastAPI app with all route handlers
- `backend/app/services/repo_service.py` — Orchestrates clone/upload → scan → graph
- `backend/app/utils/git_utils.py` — Git cloning + workspace management
- `backend/app/utils/file_tree.py` — Nested file tree builder
- `backend/repo_scanner.py` — AST-based Python dependency scanner
- `backend/graph_builder.py` — Converts scan output to React Flow graph
- `backend/ai_summary.py` — OpenAI-powered repo summary
- `backend/feature_assistant.py` — OpenAI-powered feature location suggestions

**Frontend**
- `frontend/src/App.tsx` — Root component; orchestrates analysis + summary auto-fetch
- `frontend/src/api/client.ts` — Typed API client (all fetch calls)
- `frontend/src/components/RepoSummary.tsx` — Renders AI summary with loading states
- `frontend/src/components/DependencyGraph.tsx` — React Flow graph with auto-layout
- `frontend/src/components/FeatureAssistantPanel.tsx` — Feature location UI wired to backend
- `frontend/src/components/ChatBox.tsx` — Q&A chat wired to backend
- `frontend/vite.config.ts` — Port 5000, host 0.0.0.0, allowedHosts: true

## Running Locally

```bash
# Install Python deps
cd backend && pip install -r requirements.txt

# Install JS deps
cd frontend && npm install

# Set your OpenAI key
export OPENAI_API_KEY=sk-...

# Start everything
bash start.sh
```

## Dependencies

**Backend** (`backend/requirements.txt`): fastapi, uvicorn[standard], GitPython, openai, python-multipart

**Frontend** (`frontend/package.json`): react, react-dom, reactflow, tailwindcss, vite, typescript
