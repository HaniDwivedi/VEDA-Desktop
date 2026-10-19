import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.getenv("DB_NAME", "veda_agent_db")]
chat_history = db["chat_history"]

async def save_agent_response(user_id: str, prompt: str, agent_response: dict):
    """Saves the user prompt and the agent's final execution response to the database."""
    document = {
        "user_id": user_id,
        "user_prompt": prompt,
        "agent_response": agent_response,
        "timestamp": datetime.utcnow()
    }
    await chat_history.insert_one(document)