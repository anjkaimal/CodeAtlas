from __future__ import annotations

import tempfile
import zipfile
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.utils.file_tree import build_file_tree
from app.utils.git_utils import clone_github_repo, create_repo_workspace


def analyze_github_repo(repo_url: str) -> dict:
    """
    Clone a GitHub repository and return its file tree.
    """
    workspace = clone_github_repo(repo_url)
    tree = build_file_tree(workspace)
    return {"workspace_path": str(workspace), "tree": tree}


async def analyze_uploaded_zip(zip_file: UploadFile) -> dict:
    """
    Save an uploaded ZIP file, extract it into a workspace, and return its file tree.
    """
    workspace = create_repo_workspace(zip_file.filename or "upload")

    # Save to a temporary file before extraction
    # NOTE: On Windows, reopening a NamedTemporaryFile while it's still open
    # can fail with PermissionError. Use delete=False and clean up manually.
    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            tmp_path = tmp.name
            content = await zip_file.read()
            tmp.write(content)
            tmp.flush()

        assert tmp_path is not None
        with zipfile.ZipFile(tmp_path, "r") as zf:
            zf.extractall(workspace)
    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except OSError:
                # Best-effort cleanup; leave the file if locked by antivirus, etc.
                pass

    tree = build_file_tree(workspace)
    return {"workspace_path": str(workspace), "tree": tree}

