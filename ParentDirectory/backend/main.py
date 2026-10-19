from __future__ import annotations

import asyncio
import base64
import ipaddress
import json
import os
import secrets
import shutil
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import cv2
import jwt
import bcrypt
import mss
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, SecretStr


if os.environ.get("DISPLAY"):
    try:
        import pyautogui
        GUI_AVAILABLE = True
    except Exception:
        GUI_AVAILABLE = False
else:
    GUI_AVAILABLE = False


try:
    import redis.asyncio as redis
except Exception:
    redis = None

from agent_brain import process_agent_command

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = Path(sys.executable).resolve().parent / ".env" if getattr(sys, "frozen", False) else BASE_DIR / ".env"
load_dotenv(ENV_FILE, override=False)
if os.getenv("VEDA_DATA_DIR"):
    DATA_DIR = Path(os.environ["VEDA_DATA_DIR"]).expanduser()
elif os.name == "nt":
    DATA_DIR = Path(os.getenv("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))) / "VEDA"
elif sys.platform == "darwin":
    DATA_DIR = Path.home() / "Library" / "Application Support" / "VEDA"
else:
    DATA_DIR = Path(os.getenv("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))) / "veda"
DATA_DIR.mkdir(parents=True, exist_ok=True)
if os.name != "nt":
    DATA_DIR.chmod(0o700)
DB_PATH = DATA_DIR / "veda.db"
LEGACY_DB_PATH = BASE_DIR / "veda.db"
if not DB_PATH.exists() and LEGACY_DB_PATH.exists():
    shutil.copy2(LEGACY_DB_PATH, DB_PATH)

if os.getenv("VEDA_JWT_SECRET"):
    JWT_SECRET = os.environ["VEDA_JWT_SECRET"]
elif os.getenv("VEDA_ENV", "development").lower() == "production":
    raise RuntimeError("VEDA_JWT_SECRET must be configured in production")
else:
    SECRET_PATH = DATA_DIR / "jwt.secret"
    if SECRET_PATH.exists():
        JWT_SECRET = SECRET_PATH.read_text(encoding="utf-8").strip()
    else:
        JWT_SECRET = secrets.token_urlsafe(48)
        try:
            secret_fd = os.open(SECRET_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            JWT_SECRET = SECRET_PATH.read_text(encoding="utf-8").strip()
        else:
            with os.fdopen(secret_fd, "w", encoding="utf-8") as secret_file:
                secret_file.write(JWT_SECRET)
if os.getenv("VEDA_ENV", "development").lower() == "production" and len(JWT_SECRET) < 32:
    raise RuntimeError("VEDA_JWT_SECRET must contain at least 32 characters in production")
JWT_ALGORITHM = "HS256"
FPS = 15
FRAME_DELAY = 1.0 / FPS

# PyAutoGUI failsafe ko sirf tabhi set karein jab GUI available ho
if GUI_AVAILABLE:
    pyautogui.FAILSAFE = True


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(status_code=400, detail="Password must be at most 72 UTF-8 bytes")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except (ValueError, TypeError):
        return False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=72)
    full_name: str = Field(default="", max_length=120)
    device_name: str = Field(default="V.E.D.A. Device", min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class CommandPayload(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    type: str = "command"
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = Field(default=None, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            device_name TEXT NOT NULL,
            pairing_token TEXT,
            is_active INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            device_id INTEGER,
            jwt_token TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.commit()
    conn.close()


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def encode_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_current_user(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    user_id = int(payload.get("sub"))
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"id": row["id"], "email": row["email"], "full_name": row["full_name"]}


async def get_redis_client():
    redis_url = os.getenv("VEDA_REDIS_URL")
    if redis is None or not redis_url:
        return None
    client = getattr(redis, "_veda_client", None)
    if client is None:
        try:
            client = redis.Redis.from_url(redis_url, decode_responses=True)
            await client.ping()
            redis._veda_client = client
        except Exception:
            return None
    return client


app = FastAPI(title="V.E.D.A. Desktop Backend", version="1.1.0")
development_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:8085",
    "http://127.0.0.1:8085",
]
allowed_origins = [
    origin.strip()
    for origin in os.getenv("VEDA_CORS_ORIGINS", ",".join(development_origins)).split(",")
    if origin.strip()
]
if os.getenv("VEDA_ENV", "development").lower() == "production":
    if not os.getenv("VEDA_CORS_ORIGINS") or "*" in allowed_origins:
        raise RuntimeError("Production requires explicit VEDA_CORS_ORIGINS without wildcards")
    if any(urlsplit(origin).scheme != "https" for origin in allowed_origins):
        raise RuntimeError("Production CORS origins must use HTTPS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_state = {
    "desktop_user_id": None,
}
websocket_tickets: dict[str, tuple[str, datetime]] = {}
active_controller_sockets: dict[int, set[WebSocket]] = {}


def get_bearer_token(authorization: str | None) -> str:
    scheme, separator, token = (authorization or "").partition(" ")
    if not separator or scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    return token


def is_loopback_request(request: Request) -> bool:
    remote_host = request.client.host if request.client else ""
    try:
        return ipaddress.ip_address(remote_host).is_loopback
    except ValueError:
        return False


async def issue_websocket_ticket(ticket: str, token: str) -> None:
    client = await get_redis_client()
    if client:
        try:
            await client.set(f"veda:ws-ticket:{ticket}", token, ex=30, nx=True)
            return
        except Exception:
            if os.getenv("VEDA_ENV", "development").lower() == "production":
                raise HTTPException(status_code=503, detail="Ticket service unavailable")
    elif os.getenv("VEDA_ENV", "development").lower() == "production":
        raise HTTPException(status_code=503, detail="Redis is required for production tickets")
    websocket_tickets[ticket] = (token, datetime.now(timezone.utc) + timedelta(seconds=30))


async def consume_websocket_ticket(ticket: str) -> str | None:
    client = await get_redis_client()
    if client:
        try:
            return await client.getdel(f"veda:ws-ticket:{ticket}")
        except Exception:
            if os.getenv("VEDA_ENV", "development").lower() == "production":
                return None
    ticket_data = websocket_tickets.pop(ticket, None)
    if not ticket_data or ticket_data[1] < datetime.now(timezone.utc):
        return None
    return ticket_data[0]


async def close_controller_sockets(user_id: int) -> None:
    sockets = list(active_controller_sockets.get(user_id, set()))
    if sockets:
        await asyncio.gather(
            *(socket.close(code=4403, reason="Desktop session ended") for socket in sockets),
            return_exceptions=True,
        )


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
async def health() -> dict[str, Any]:
    client = await get_redis_client()
    return {
        "status": "ok",
        "service": "veda-desktop-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "redis": "connected" if client else "offline",
        "desktop_session_active": session_state["desktop_user_id"] is not None,
        "gui_available": GUI_AVAILABLE,
    }


@app.post("/auth/register")
def register_user(payload:
