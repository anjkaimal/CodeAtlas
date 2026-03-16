from __future__ import annotations

import tempfile
import zipfile
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.utils.file_tree import build_file_tree
from app.utils.git_utils import clone_github_repo, create_repo_workspace
from graph_builder import build_react_flow_graph
from repo_scanner import scan_repo


def analyze_github_repo(repo_url: str) -> dict:
    """
    Clone a GitHub repository, scan it, build a dependency graph, and return results.
    """
    workspace = clone_github_repo(repo_url)
    tree = build_file_tree(workspace)
    scan = scan_repo(workspace)
    graph = build_react_flow_graph(scan)
    return {
        "workspace_path": str(workspace),
        "tree": tree,
        "scan": scan,
        "graph": graph,
    }


async def analyze_uploaded_zip(zip_file: UploadFile) -> dict:
    """
    Save an uploaded ZIP file, extract it into a workspace, scan it, and return results.
    """
    workspace = create_repo_workspace(zip_file.filename or "upload")

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
                pass

    tree = build_file_tree(workspace)
    scan = scan_repo(workspace)
    graph = build_react_flow_graph(scan)
    return {
        "workspace_path": str(workspace),
        "tree": tree,
        "scan": scan,
        "graph": graph,
    }
