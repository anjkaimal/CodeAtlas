from __future__ import annotations

import base64
import hashlib
import os
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Optional

import hashlib
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

REPL_ID = os.environ.get("REPL_ID", "")
ISSUER_URL = os.environ.get("ISSUER_URL", "https://replit.com/oidc")
JWT_SECRET = os.environ.get("SESSION_SECRET", "dev-fallback-secret")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7

DEV_DOMAIN = os.environ.get("REPLIT_DEV_DOMAIN", "")
FRONTEND_URL = f"https://{DEV_DOMAIN}" if DEV_DOMAIN else "http://localhost:5000"

_pkce_store: dict[str, str] = {}


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
        raise HTTPException(status_code=401, detail="No account found with that email address. Please sign up first.")
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google sign-in. Please use the 'Continue with Google' button.")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password, please try again.")
    token = create_jwt(user["id"], user["email"], user["name"], user.get("picture"))
    return {"token": token, "user": _safe_user(user)}


def _generate_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def _callback_url(request: Request) -> str:
    base = str(request.base_url).rstrip("/")
    return base.replace("http://", "https://") + "/auth/callback"


@router.get("/oauth")
async def oauth_login(request: Request):
    if not REPL_ID:
        raise HTTPException(status_code=500, detail="OAuth not configured (REPL_ID missing).")
    state = secrets.token_urlsafe(32)
    verifier, challenge = _generate_pkce()
    _pkce_store[state] = verifier
    params = {
        "client_id": REPL_ID,
        "response_type": "code",
        "redirect_uri": _callback_url(request),
        "scope": "openid profile email",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "login consent",
    }
    return RedirectResponse(f"{ISSUER_URL}/auth?" + urllib.parse.urlencode(params))


@router.get("/callback")
async def oauth_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}?auth_error={urllib.parse.quote(error)}")
    verifier = _pkce_store.pop(state, None)
    if not verifier:
        raise HTTPException(status_code=400, detail="Invalid or expired state.")
    resp = http_requests.post(
        f"{ISSUER_URL}/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": _callback_url(request),
            "client_id": REPL_ID,
            "code_verifier": verifier,
        },
    )
    if not resp.ok:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {resp.text}")
    token_data = resp.json()
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No id_token returned.")
    claims = jwt.decode(id_token, options={"verify_signature": False})
    replit_id = str(claims["sub"])
    email = claims.get("email") or f"{replit_id}@oauth.codeatlas"
    first = claims.get("first_name") or ""
    last = claims.get("last_name") or ""
    name = (first + " " + last).strip() or email
    picture = claims.get("profile_image_url")
    user = get_or_create_oauth_user(replit_id=replit_id, email=email, name=name, picture=picture)
    session_token = create_jwt(user["id"], user["email"], user["name"], user.get("picture"))
    return RedirectResponse(f"{FRONTEND_URL}?token={urllib.parse.quote(session_token)}")


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
