from pydantic import BaseModel, EmailStr
from typing import Optional

class UserAuthSchema(BaseModel):
    emailOrPhone: str
    password: str

class TokenResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    refresh_token: str