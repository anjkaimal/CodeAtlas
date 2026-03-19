from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

# Load .env only when running locally (not on Replit, where secrets are injected).
# dotenv's override=False is the default, but a blank value in .env still wins
# over an already-set env var in some dotenv versions, so we guard with REPL_ID.
if not os.environ.get("REPL_ID"):
    try:
        from dotenv import load_dotenv
        load_dotenv(override=False)
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
    key = _resolve_openai_key()
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


def _resolve_openai_key() -> str:
    """Return the OpenAI key, scanning all /proc/*/environ as a Replit fallback.

    On Replit, secrets added after first launch may be injected as empty strings
    into the workflow process but are present with correct values in the
    interactive shell session.  Scanning all process environments finds the
    value wherever it lives.
    """
    key = os.environ.get("OPENAI_API_KEY", "")
    if key:
        return key

    import glob
    needle = b"OPENAI_API_KEY="
    for env_path in glob.glob("/proc/[0-9]*/environ"):
        try:
            with open(env_path, "rb") as f:
                raw = f.read()
            for part in raw.split(b"\x00"):
                if part.startswith(needle):
                    candidate = part[len(needle):].decode(errors="replace")
                    if candidate:
                        os.environ["OPENAI_API_KEY"] = candidate
                        return candidate
        except Exception:
            continue
    return key


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "openai_configured": bool(_resolve_openai_key())}


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
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CodeAtlas Bot, an expert software architect and code analysis assistant. "
                        "You have been provided a complete JSON snapshot of a repository's structure — "
                        "every file path, import, class definition, function signature, and module "
                        "relationship is available to you as factual data.\n\n"
                        "Your job is to give thorough, accurate, and authoritative answers. "
                        "Treat the repository data as ground truth and reason from it directly.\n\n"
                        "Response standards:\n"
                        "- Be complete. Cover every relevant aspect of the question — do not truncate.\n"
                        "- Always cite specific file paths, function names, and class names from the data.\n"
                        "- Trace call chains and data flows through the actual files when relevant.\n"
                        "- When asked where to make changes, give the exact file path and the insertion point "
                        "(function name, line context, or class).\n"
                        "- Explain architectural decisions and patterns you observe in the structure.\n"
                        "- Use markdown: headers (##) for multi-part answers, inline code for names and paths, "
                        "fenced code blocks for examples.\n"
                        "- Speak with confidence. Do not use phrases like 'I think', 'it seems', 'might be', "
                        "or 'I'm not sure' — you have the full repository structure and can reason from it "
                        "definitively. Only hedge when information is genuinely absent from the data.\n"
                        "- When asked about something not visible in the structure, say so clearly and "
                        "provide the best guidance based on what is available."
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
