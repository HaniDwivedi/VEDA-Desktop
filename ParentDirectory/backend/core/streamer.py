import asyncio
import base64
import mss
import cv2
import numpy as np

FPS = 15
FRAME_DELAY = 1.0 / FPS

async def stream_screen(websocket):
    """Captures primary monitor, compresses to JPEG, and sends Base64 chunks."""
    with mss.mss() as sct:
        monitor = sct.monitors[1] # Primary monitor
        try:
            while True:
                start_time = asyncio.get_event_loop().time()
                
                # Grab frame
                screenshot = sct.grab(monitor)
                img = np.array(screenshot)
                
                # Convert BGRA to BGR and resize width to 960px to reduce payload
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
                height, width = img.shape[:2]
                target_width = 960
                target_height = int(height * (target_width / width))
                img_resized = cv2.resize(img, (target_width, target_height))
                
                # Compress to JPEG (70% quality)
                _, buffer = cv2.imencode('.jpg', img_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                base64_img = base64.b64encode(buffer).decode('utf-8')
                
                # Send to WebSocket client
                await websocket.send_json({
                    "type": "screen_frame",
                    "data": base64_img
                })
                
                elapsed = asyncio.get_event_loop().time() - start_time
                await asyncio.sleep(max(0, FRAME_DELAY - elapsed))
                
        except Exception as e:
            print(f"[Streamer Error]: {e}")