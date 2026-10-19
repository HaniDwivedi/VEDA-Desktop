import asyncio
import ipaddress

from fastapi import APIRouter, HTTPException, Query, Request, status

from agent_brain import process_agent_command

router = APIRouter()

@router.post("/run-task")
@router.post("/run-task")
async def run_agent_task(
    request: Request,
    task_text: str = Query(..., min_length=1, max_length=500),
    user_id: str = Query(..., min_length=1, max_length=128),
):
    remote_host = request.client.host if request.client else ""
    try:
        is_local_request = ipaddress.ip_address(remote_host).is_loopback
    except ValueError:
        is_local_request = False
    if not is_local_request:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent tasks can only be run from this device",
        )

    result = await asyncio.to_thread(process_agent_command, task_text)
    return {"status": "processed", "user_id": user_id, "result": result}