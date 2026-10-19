import json
from datetime import timedelta
# Assuming your files are named auth_utils.py and redis_db.py
from auth_utils import create_60_day_token
from redis_db import redis_db

async def login_user_and_store_session(user_id: str):
    # 1. Generate the JWT Token
    token = create_60_day_token(user_id)
    
    # 2. Store in Redis with an expiration of 60 days (in seconds)
    # 60 days * 24 hours * 60 minutes * 60 seconds = 5184000 seconds
    expiration_seconds = 60 * 24 * 60 * 60 
    
    # Redis key format: session:{user_id}
    redis_key = f"session:{user_id}"
    
    # setex (key, time_in_seconds, value)
    await redis_db.setex(redis_key, expiration_seconds, token)
    
    return {"message": "Login successful", "token": token}

async def logout_user(user_id: str):
    # Simply delete the key from Redis to invalidate the session
    await redis_db.delete(f"session:{user_id}")
    return {"message": "Logged out successfully"}