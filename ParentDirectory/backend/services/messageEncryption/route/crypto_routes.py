from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.messageEncryption.controller.crypto_controller import encrypt_message, decrypt_message

app = FastAPI(title="V.E.D.A. Message Encryption Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessagePayload(BaseModel):
    text: str

class DecryptPayload(BaseModel):
    ciphertext: str
    nonce: str

@app.post("/encrypt")
async def api_encrypt(payload: MessagePayload):
    encrypted = encrypt_message(payload.text)
    return {"success": True, "encrypted": encrypted}

@app.post("/decrypt")
async def api_decrypt(payload: DecryptPayload):
    decrypted = decrypt_message({"ciphertext": payload.ciphertext, "nonce": payload.nonce})
    return {"success": True, "decrypted": decrypted}

# Run command: uvicorn services.messageEncryption.route.crypto_routes:app --host 0.0.0.0 --port 8002