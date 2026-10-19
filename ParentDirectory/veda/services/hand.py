# veda/services/hand.py
import subprocess
import platform

async def execute_os_task(task: dict) -> dict:
    os_name = platform.system()
    action = task.get("action")
    target = task.get("target")

    try:
        if action == "open_app":
            if target == "chrome":
                if os_name == "Windows":
                    # Jaan bujh kar error lane ke liye galat path test kar sakte hain
                    subprocess.Popen(["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"])
                return {"success": True}
        
        # Agar koi action match nahi hua
        return {"success": False, "error": f"Unknown action: {action}"}
        
    except FileNotFoundError:
        return {"success": False, "error": f"{target} application nahi mili. Path galat ho sakta hai."}
    except Exception as e:
        return {"success": False, "error": str(e)}