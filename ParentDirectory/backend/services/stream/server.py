from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.stream.route.stream_routes import router

app = FastAPI(title="V.E.D.A 60FPS Stream Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)