from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Optional

from git import Repo


def get_repos_root() -> Path:
    """
    Returns the root directory where cloned/extracted repositories are stored.
    """
    root = Path(__file__).resolve().parents[2] / "repos"
    root.mkdir(parents=True, exist_ok=True)
    return root


def create_repo_workspace(name_hint: Optional[str] = None) -> Path:
    """
    Create a unique workspace directory for a repository based on an optional hint.
    """
    safe_hint = (name_hint or "repo").replace("/", "_").replace("\\", "_")
    workspace_dir = get_repos_root() / f"{safe_hint}-{uuid.uuid4().hex[:8]}"
    workspace_dir.mkdir(parents=True, exist_ok=True)
    return workspace_dir


def clone_github_repo(repo_url: str) -> Path:
    """
    Clone a GitHub repository into a unique workspace directory.
    """
    workspace_dir = create_repo_workspace(_extract_repo_name(repo_url))
    Repo.clone_from(repo_url, workspace_dir)
    return workspace_dir


def _extract_repo_name(repo_url: str) -> str:
    """
    Extract a repository name from a Git URL, best-effort.
    """
    name = repo_url.rstrip("/").split("/")[-1]
    if name.endswith(".git"):
        name = name[:-4]
    return name or "repo"


def clear_workspace(path: Path) -> None:
    """
    Remove a workspace directory. Safe to call even if it does not exist.
    """
    if path.exists():
        shutil.rmtree(path)

