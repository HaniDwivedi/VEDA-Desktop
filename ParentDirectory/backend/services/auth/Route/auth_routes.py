from fastapi import APIRouter, HTTPException
from datetime import datetime
from services.auth.models.user_schema import UserAuthSchema, TokenResponse
from services.auth.controller.auth_controller import hash_password, verify_password, create_60_day_token
from services.auth.database.auth_db import users_collection, sessions_collection

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
async def register(user: UserAuthSchema):
    if await users_collection.find_one({"emailOrPhone": user.emailOrPhone}):
        raise HTTPException(status_code=400, detail="User already exists.")
    
    user_doc = {
        "emailOrPhone": user.emailOrPhone,
        "password": hash_password(user.password),
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(user_doc)
    return {"success": True, "message": "Registered successfully", "user_id": str(result.inserted_id)}

@router.post("/login", response_model=TokenResponse)
async def login(user: UserAuthSchema):
    db_user = await users_collection.find_one({"emailOrPhone": user.emailOrPhone})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(db_user["_id"])
    token = create_60_day_token(user_id)
    
    await sessions_collection.update_one(
        {"user_id": user_id},
        {"$set": {"refresh_token": token, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    return TokenResponse(success=True, message="Login successful", user_id=user_id, refresh_token=token)