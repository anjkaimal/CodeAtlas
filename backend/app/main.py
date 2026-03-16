from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.services.repo_service import analyze_github_repo, analyze_uploaded_zip


app = FastAPI(title="CodeAtlas Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


@app.post("/api/repos/analyze")
async def analyze_repo(
    repo_url: Optional[str] = Form(default=None),
    zip_file: Optional[UploadFile] = File(default=None),
) -> dict:
    """
    Accept a GitHub repo URL or uploaded ZIP archive, materialize it locally,
    and return the file tree as JSON.
    """
    if not repo_url and not zip_file:
        raise HTTPException(status_code=400, detail="Either 'repo_url' or 'zip_file' is required.")

    if repo_url and zip_file:
        raise HTTPException(
            status_code=400,
            detail="Provide only one of 'repo_url' or 'zip_file', not both.",
        )

    if repo_url:
        try:
            result = analyze_github_repo(repo_url)
        except Exception as exc:  # pragma: no cover - broad error to surface to client
            raise HTTPException(status_code=500, detail=f"Failed to clone repository: {exc}") from exc
        return result

    assert zip_file is not None
    try:
        result = await analyze_uploaded_zip(zip_file)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to process ZIP file: {exc}") from exc
    return result


# To run locally:
# uvicorn app.main:app --reload

