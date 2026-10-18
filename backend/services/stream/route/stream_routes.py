from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/ws/stream/{user_id}")
async def stream_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    try:
        while True:
            # Receiving 60FPS binary frames from Electron backend
            frame_data = await websocket.receive_bytes()
            # In a real scenario, you'd route this to the viewing client
            # Echoing back for acknowledgment in this boilerplate
            await websocket.send_bytes(frame_data)
    except WebSocketDisconnect:
        print(f"Stream disconnected for user: {user_id}")