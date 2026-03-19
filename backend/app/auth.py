from __future__ import annotations

import base64
import hashlib
import os
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Optional

import hmac as _hmac

import requests as http_requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import jwt
from pydantic import BaseModel

from app.db import (
    create_email_user,
    get_or_create_oauth_user,
    get_user_by_email,
    get_user_by_id,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_PBKDF2_ITERS = 600_000

JWT_SECRET = os.environ.get("SESSION_SECRET", "dev-fallback-secret")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "")

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

DEV_DOMAIN = os.environ.get("REPLIT_DEV_DOMAIN", "")
FRONTEND_URL = f"https://{DEV_DOMAIN}" if DEV_DOMAIN else "http://localhost:5000"

_pkce_store: dict[str, str] = {}


# ── Password helpers ──────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, _PBKDF2_ITERS)
    return salt.hex() + ":" + key.hex()


def verify_password(plain: str, stored: str) -> bool:
    try:
        salt_hex, key_hex = stored.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(key_hex)
        actual = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, _PBKDF2_ITERS)
        return _hmac.compare_digest(actual, expected)
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────────────────

def create_jwt(user_id: int, email: str, name: Optional[str], picture: Optional[str]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {
            "sub": str(user_id),
            "email": email,
            "name": name or "",
            "picture": picture or "",
            "exp": expire,
        },
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


# ── PKCE helpers ──────────────────────────────────────────────────────────

def _generate_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def _google_callback_url(request: Request) -> str:
    """Absolute URL that Google must redirect back to after login."""
    base = str(request.base_url).rstrip("/")
    return base.replace("http://", "https://") + "/auth/google/callback"


# ── Email / password routes ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    existing = get_user_by_email(req.email.lower())
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    hashed = hash_password(req.password)
    user = create_email_user(email=req.email.lower(), name=req.name.strip(), password_hash=hashed)
    token = create_jwt(user["id"], user["email"], user["name"], user.get("picture"))
    return {"token": token, "user": _safe_user(user)}


@router.post("/login")
async def login_email(req: LoginRequest):
    user = get_user_by_email(req.email.lower())
    if not user:
        raise HTTPException(
            status_code=401,
            detail="No account found with that email address. Please sign up first.",
        )
    if not user.get("password_hash"):
        raise HTTPException(
            status_code=401,
            detail="This account uses Google sign-in. Please use the 'Continue with Google' button.",
        )
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password, please try again.")
    token = create_jwt(user["id"], user["email"], user["name"], user.get("picture"))
    return {"token": token, "user": _safe_user(user)}


# ── Google OAuth routes ───────────────────────────────────────────────────

@router.get("/google")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server.",
        )
    state = secrets.token_urlsafe(32)
    verifier, challenge = _generate_pkce()
    _pkce_store[state] = verifier

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": _google_callback_url(request),
        "scope": "openid email profile",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "online",
        "prompt": "select_account",
    }
    return RedirectResponse(_GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params))


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str = "",
    state: str = "",
    error: str = "",
):
    if error:
        return RedirectResponse(
            f"{FRONTEND_URL}?auth_error={urllib.parse.quote(error)}"
        )

    verifier = _pkce_store.pop(state, None)
    if not verifier:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    # Exchange the authorisation code for tokens
    token_resp = http_requests.post(
        _GOOGLE_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": _google_callback_url(request),
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code_verifier": verifier,
        },
    )
    if not token_resp.ok:
        raise HTTPException(
            status_code=400,
            detail=f"Google token exchange failed: {token_resp.text}",
        )
    access_token = token_resp.json().get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access_token returned by Google.")

    # Fetch the user's profile from Google
    info_resp = http_requests.get(
        _GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if not info_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to fetch profile from Google.")

    google_data = info_resp.json()
    google_id = str(google_data["id"])
    email = google_data.get("email") or f"{google_id}@google.oauth"
    name = google_data.get("name") or email
    picture = google_data.get("picture")

    user = get_or_create_oauth_user(
        oauth_id=google_id,
        email=email,
        name=name,
        picture=picture,
        provider="google",
    )
    session_token = create_jwt(user["id"], user["email"], user["name"], user.get("picture"))
    return RedirectResponse(f"{FRONTEND_URL}?token={urllib.parse.quote(session_token)}")


# ── Session routes ────────────────────────────────────────────────────────

@router.get("/me")
async def me(request: Request):
    from app.dependencies import get_current_user
    user_payload = get_current_user(request)
    db_user = get_user_by_id(int(user_payload["sub"]))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    return _safe_user(db_user)


@router.post("/logout")
async def logout():
    return {"ok": True}


def _safe_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or "",
        "picture": user.get("picture") or "",
        "auth_provider": user.get("auth_provider") or "email",
    }
