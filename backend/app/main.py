from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

# Load .env when running locally (no-op if python-dotenv is not installed
# or the file doesn't exist, so production / Replit is unaffected).
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

from app.services.repo_service import analyze_github_repo, analyze_uploaded_zip
from ai_summary import generate_repo_summary
from feature_assistant import suggest_feature_location
from repo_scanner import scan_repo
from app.auth import router as auth_router
from app.db import add_search_history, get_user_history
from app.dependencies import get_current_user, get_optional_user


app = FastAPI(title="CodeAtlas Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

DEFAULT_MODEL = os.getenv("CODEATLAS_OPENAI_MODEL", "gpt-4.1-mini")


def _compact_json(value: object, *, max_chars: int) -> str:
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 20] + "...TRUNCATED..."


def _require_openai_key() -> str:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured. Set it to enable AI features.",
        )
    return key


def _get_workspace(path: str) -> Path:
    workspace = Path(path)
    if not workspace.exists() or not workspace.is_dir():
        raise HTTPException(status_code=404, detail=f"Workspace not found: {path}")
    return workspace


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}


@app.post("/api/repos/analyze")
async def analyze_repo(
    repo_url: Optional[str] = Form(default=None),
    zip_file: Optional[UploadFile] = File(default=None),
) -> dict:
    if not repo_url and not zip_file:
        raise HTTPException(status_code=400, detail="Either 'repo_url' or 'zip_file' is required.")
    if repo_url and zip_file:
        raise HTTPException(status_code=400, detail="Provide only one of 'repo_url' or 'zip_file', not both.")
    if repo_url:
        try:
            return analyze_github_repo(repo_url)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to clone repository: {exc}") from exc
    assert zip_file is not None
    try:
        return await analyze_uploaded_zip(zip_file)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process ZIP file: {exc}") from exc


class SummaryRequest(BaseModel):
    workspace_path: str
    model: Optional[str] = None


@app.post("/api/repos/summary")
async def repo_summary(req: SummaryRequest) -> dict:
    _require_openai_key()
    workspace = _get_workspace(req.workspace_path)
    try:
        scan = scan_repo(workspace)
        kwargs = {"model": req.model} if req.model else {}
        return generate_repo_summary(scan, **kwargs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {exc}") from exc


class FeatureRequest(BaseModel):
    workspace_path: str
    feature_request: str
    model: Optional[str] = None


@app.post("/api/repos/feature")
async def feature_location(req: FeatureRequest) -> dict:
    _require_openai_key()
    if not req.feature_request.strip():
        raise HTTPException(status_code=400, detail="feature_request must not be empty.")
    workspace = _get_workspace(req.workspace_path)
    try:
        scan = scan_repo(workspace)
        kwargs = {"model": req.model} if req.model else {}
        return suggest_feature_location(
            feature_request=req.feature_request,
            repo_structure=scan,
            **kwargs,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Feature assistant failed: {exc}") from exc


class ChatRequest(BaseModel):
    workspace_path: str
    question: str
    model: Optional[str] = None


@app.post("/api/repos/chat")
async def chat(req: ChatRequest) -> dict:
    key = _require_openai_key()
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty.")
    workspace = _get_workspace(req.workspace_path)
    try:
        scan = scan_repo(workspace)
        structure_json = _compact_json(scan, max_chars=80_000)
        model = req.model or DEFAULT_MODEL
        client = OpenAI(api_key=key)
        resp = client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful code assistant. You have been given a JSON representation "
                        "of a repository's structure including files, imports, classes, and functions. "
                        "Answer the developer's question concisely and accurately. "
                        "Reference specific file paths when relevant."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Repository structure:\n{structure_json}\n\n"
                        f"Question: {req.question}"
                    ),
                },
            ],
        )
        answer = resp.choices[0].message.content or "No answer generated."
        return {"answer": answer, "model": model}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc


class HistoryRequest(BaseModel):
    repo_url: str
    workspace_path: Optional[str] = None
    stats: Optional[dict] = None


@app.post("/api/history")
async def save_history(req: HistoryRequest, request: Request) -> dict:
    user = get_current_user(request)
    entry = add_search_history(
        user_id=int(user["sub"]),
        repo_url=req.repo_url,
        workspace_path=req.workspace_path,
        stats=req.stats,
    )
    return entry


@app.get("/api/history")
async def fetch_history(request: Request) -> list:
    user = get_current_user(request)
    history = get_user_history(user_id=int(user["sub"]))
    return history
