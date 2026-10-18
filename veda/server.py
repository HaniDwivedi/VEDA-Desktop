from fastapi import FastAPI
from pydantic import BaseModel
from services.executor import run_agent_loop
from database.chat_db import save_agent_response

app = FastAPI(title="V.E.D.A OS Agent Service")

class AgentRequest(BaseModel):
    user_id: str
    text: str

@app.post("/api/run")
async def execute_and_save_task(req: AgentRequest):
    # 1. Trigger the iterator loop and get the final result
    final_result = await run_agent_loop(req.text)
    
    # 2. Save the prompt and the result to MongoDB for this specific user
    await save_agent_response(
        user_id=req.user_id,
        prompt=req.text,
        agent_response=final_result
    )
    
    # 3. Return the payload to the frontend/mobile client
    return final_result

# Run: uvicorn server:app --port 8004