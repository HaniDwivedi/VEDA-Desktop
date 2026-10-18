from sentence_transformers import SentenceTransformer
from datetime import datetime
from services.agentService.database.chat_history_db import embeddings_collection

# Loads locally. First run will download the ~80MB model.
model = SentenceTransformer('all-MiniLM-L6-v2')

async def save_task_memory(user_id: str, task: str, result: str):
    text = f"Task: {task} | Result: {result}"
    vector = model.encode(text).tolist()
    
    doc = {"user_id": user_id, "text_summary": text, "embedding": vector, "created_at": datetime.utcnow()}
    await embeddings_collection.insert_one(doc)
    return True