import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGO_URL", ""))
db = client[os.getenv("DB_NAME", "veda_auth_db")]

users_collection = db["users"]
sessions_collection = db["sessions"]