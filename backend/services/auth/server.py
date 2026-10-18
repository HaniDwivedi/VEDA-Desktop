from datetime import datetime, timedelta
import secrets
from fastapi import FastAPI, HTTPException, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
import os
from dotenv import load_dotenv
from database.auth_db import users_collection, sessions_collection, db

load_dotenv()

app = FastAPI(title="V.E.D.A. Auth Microservice", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "your_super_secret_key_here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
qr_sessions_collection = db["qr_sessions"]

class UserAuthSchema(BaseModel):
    emailOrPhone: str
    password: str

class QrScanSchema(BaseModel):
    qrToken: str
    deviceName: str = "Unknown Device"  # Jaise "iPhone 15" ya "Android"

class QrConfirmSchema(BaseModel):
    qrToken: str
    userId: str
    authToken: str

@app.post("/auth/register")
async def register_user(user: UserAuthSchema):
    existing_user = await users_collection.find_one({"emailOrPhone": user.emailOrPhone})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists with this email or phone.")
    
    hashed_password = pwd_context.hash(user.password)
    user_doc = {
        "emailOrPhone": user.emailOrPhone,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(user_doc)
    return {"success": True, "message": "User registered successfully!", "user_id": str(result.inserted_id)}

@app.post("/auth/login")
async def login_user(user: UserAuthSchema):
    db_user = await users_collection.find_one({"emailOrPhone": user.emailOrPhone})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")
    
    user_id = str(db_user["_id"])
    expire = datetime.utcnow() + timedelta(days=60)
    refresh_token = jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
    
    await sessions_collection.update_one(
        {"user_id": user_id},
        {"$set": {"refresh_token": refresh_token, "expires_at": expire}},
        upsert=True
    )
    
    return {"success": True, "user_id": user_id, "refresh_token": refresh_token}


# =====================================================
# ADVANCED QR CODE WORKFLOW WITH DEVICE INFO
# =====================================================

@app.get("/auth/qr/generate")
async def generate_qr_token():
    """1. Desktop app QR token generate karta hai"""
    qr_token = "VEDA-SECURE-" + secrets.token_hex(16)
    expires_at = datetime.utcnow() + timedelta(minutes=2)

    await qr_sessions_collection.insert_one({
        "qrToken": qr_token,
        "status": "PENDING",  # PENDING -> SCANNED -> APPROVED
        "deviceName": None,
        "userId": None,
        "authToken": None,
        "expires_at": expires_at
    })
    return {"success": True, "qrToken": qr_token}


@app.post("/auth/qr/scan")
async def mobile_scan_qr(data: QrScanSchema):
    """
    2. Mobile App jab QR scan karega, toh yeh endpoint hit hoga.
    Yeh check karega ki token valid hai aur desktop par Device Name dikhane ke liye save karega.
    """
    qr_session = await qr_sessions_collection.find_one({"qrToken": data.qrToken})
    if not qr_session or datetime.utcnow() > qr_session["expires_at"]:
        raise HTTPException(status_code=400, detail="Invalid or expired QR code.")

    # Status ko SCANNED kar do aur device name save kar do
    await qr_sessions_collection.update_one(
        {"qrToken": data.qrToken},
        {
            "$set": {
                "status": "SCANNED",
                "deviceName": data.deviceName
            }
        }
    )
    return {"success": True, "message": "QR Scanned successfully. Please confirm login on your phone."}


@app.post("/auth/qr/confirm")
async def mobile_confirm_login(data: QrConfirmSchema):
    """
    3. Mobile user jab password/biometric enter karke 'Authorize Login' par click karega,
    toh yeh endpoint desktop ko green signal de dega.
    """
    qr_session = await qr_sessions_collection.find_one({"qrToken": data.qrToken})
    if not qr_session or datetime.utcnow() > qr_session["expires_at"]:
        raise HTTPException(status_code=400, detail="Session expired.")

    await qr_sessions_collection.update_one(
        {"qrToken": data.qrToken},
        {
            "$set": {
                "status": "APPROVED",
                "userId": data.userId,
                "authToken": data.authToken
            }
        }
    )
    return {"success": True, "message": "Desktop login approved!"}


@app.get("/auth/qr/status/{qr_token}")
async def check_qr_status(qr_token: str):
    """4. Desktop app ise poll karega (Status: PENDING, SCANNED, or APPROVED)"""
    qr_session = await qr_sessions_collection.find_one({"qrToken": qr_token})
    
    if not qr_session or datetime.utcnow() > qr_session["expires_at"]:
        return {"status": "EXPIRED"}

    if qr_session["status"] == "APPROVED":
        res_data = {
            "status": "APPROVED",
            "userId": qr_session["userId"],
            "authToken": qr_session["authToken"]
        }
        await qr_sessions_collection.delete_one({"qrToken": qr_token})
        return res_data

    # Agar mobile ne scan kar liya hai, toh desktop ko device name bhi bhej do
    if qr_session["status"] == "SCANNED":
        return {
            "status": "SCANNED",
            "deviceName": qr_session["deviceName"]
        }

    return {"status": "PENDING"}