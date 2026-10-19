from fastapi import FastAPI
from services.agentService.Route.agent_routes import router

app = FastAPI(title="V.E.D.A Agent Embeddings Service")
app.include_router(router)