from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from services.stream.service.stream_service import StreamService
from websockets.exceptions import ConnectionClosedOK


@router.get("/stream")
async def stream_video(stream_service: StreamService = Depends()):
    try:
        # Get the video stream generator from the service
        video_stream_generator = stream_service.get_video_stream()

        # Return a streaming response with the video stream
        return StreamingResponse(video_stream_generator, media_type="multipart/x-mixed-replace; boundary=frame")
    except ConnectionClosedOK:
        # Handle the case when the client disconnects
        print("Client disconnected from the video stream.")
        return {"message": "Client disconnected."}
    except Exception as e:
        # Handle other exceptions
        print(f"Error occurred while streaming video: {e}")
        return {"error": str(e)}


