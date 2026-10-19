import re
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser


APP_ALIASES = {
    "chrome": "chrome",
    "google chrome": "chrome",
    "browser": "chrome",
    "vscode": "vscode",
    "vs code": "vscode",
    "visual studio code": "vscode",
    "notepad": "notepad",
    "calculator": "calculator",
    "calc": "calculator",
    "whatsapp": "whatsapp",
}

APP_COMMANDS = {
    "chrome": {
        "win32": ["chrome.exe"],
        "darwin": ["open", "-a", "Google Chrome"],
        "linux": ["google-chrome"],
    },
    "vscode": {
        "win32": ["code"],
        "darwin": ["open", "-a", "Visual Studio Code"],
        "linux": ["code"],
    },
    "notepad": {
        "win32": ["notepad.exe"],
        "darwin": ["open", "-a", "TextEdit"],
        "linux": ["gedit"],
    },
    "calculator": {
        "win32": ["calc.exe"],
        "darwin": ["open", "-a", "Calculator"],
        "linux": ["gnome-calculator"],
    },
}

PROCESS_NAMES = {
    "chrome": {"win32": "chrome.exe", "darwin": "Google Chrome", "linux": "chrome"},
    "vscode": {"win32": "Code.exe", "darwin": "Code", "linux": "code"},
    "notepad": {"win32": "notepad.exe", "darwin": "TextEdit", "linux": "gedit"},
    "calculator": {
        "win32": "CalculatorApp.exe",
        "darwin": "Calculator",
        "linux": "gnome-calculator",
    },
}


def normalize_app_name(name: str) -> str | None:
    return APP_ALIASES.get(str(name).strip().casefold())


def _platform_name() -> str:
    if sys.platform.startswith("win"):
        return "win32"
    if sys.platform == "darwin":
        return "darwin"
    return "linux"


def launch_application(name: str) -> bool:
    app_name = normalize_app_name(name)
    if app_name == "whatsapp":
        return webbrowser.open("https://web.whatsapp.com")
    if app_name not in APP_COMMANDS:
        return False

    try:
        subprocess.Popen(
            APP_COMMANDS[app_name][_platform_name()],
            shell=False,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return True


def close_application(name: str) -> bool:
    app_name = normalize_app_name(name)
    if app_name not in PROCESS_NAMES:
        return False

    platform = _platform_name()
    process_name = PROCESS_NAMES[app_name][platform]
    command = (
        ["taskkill.exe", "/F", "/IM", process_name]
        if platform == "win32"
        else ["pkill", "-x", process_name]
    )
    try:
        result = subprocess.run(
            command,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            shell=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0


def _ask_gemini(command_text: str, api_key: str, model_name: str | None) -> str:
    model = (model_name or "gemini-2.5-flash").removeprefix("models/")
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{urllib.parse.quote(model, safe='')}:generateContent"
    )
    request_body = {
        "systemInstruction": {
            "parts": [
                {
                    "text": (
                        "You are a desktop assistant. Return only JSON with keys action, target, "
                        "and response. action must be open_app, close_app, or respond. For app "
                        "actions choose only Chrome, VS Code, Notepad, Calculator, or WhatsApp. "
                        "Never suggest shell commands, file operations, or other system actions. "
                        "For unsupported requests use respond and explain the limitation."
                    )
                }
            ]
        },
        "contents": [{"parts": [{"text": command_text}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(request_body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code == 429:
            return "Gemini rate limit reached. Check your API plan and try again shortly."
        if error.code in {400, 401, 403}:
            return "Gemini rejected this API key or request. Check the key in Settings."
        return f"Gemini request failed with HTTP {error.code}; no action was executed."
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return "Gemini is unavailable right now; no action was executed. Check your connection."

    try:
        response_text = result["candidates"][0]["content"]["parts"][0]["text"]
        intent = json.loads(response_text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        return "Gemini returned an unsupported response; no action was executed."

    action = intent.get("action")
    if action == "respond":
        answer = intent.get("response")
        return answer[:1000] if isinstance(answer, str) and answer else "I could not complete that request."

    target = intent.get("target")
    app_name = normalize_app_name(target) if isinstance(target, str) else None
    if action == "open_app" and app_name:
        if launch_application(app_name):
            return f"Opened approved application: {app_name}."
        return f"Could not open approved application: {app_name}."
    if action == "close_app" and app_name:
        if close_application(app_name):
            return f"Closed approved application: {app_name}."
        return f"Could not close approved application: {app_name}."
    return "Gemini suggested an unsupported action; nothing was executed."


OPEN_COMMAND = re.compile(r"^(?:@agent\s+)?(?:open|launch|start|kholo|chalao)\s+(?:app\s+)?(.+)$", re.IGNORECASE)
CLOSE_COMMAND = re.compile(r"^(?:@agent\s+)?(?:close|exit|band\s+karo)\s+(.+)$", re.IGNORECASE)


def process_agent_command(
    command_text: str,
    api_key: str | None = None,
    model_name: str | None = None,
) -> str:
    """Execute only explicit allowlisted desktop application actions."""
    command = str(command_text).strip()
    if not command or len(command) > 500:
        return "Command is empty or too long; no action was executed."

    match = OPEN_COMMAND.fullmatch(command)
    if match:
        app_name = match.group(1).strip()
        if launch_application(app_name):
            return f"Opened approved application: {app_name}."
        return f"'{app_name}' is not an available approved application; no action was executed."

    match = CLOSE_COMMAND.fullmatch(command)
    if match:
        app_name = match.group(1).strip()
        if close_application(app_name):
            return f"Closed approved application: {app_name}."
        return f"'{app_name}' is not an available approved application; no action was executed."

    if api_key:
        return _ask_gemini(command, api_key, model_name)
    return "Add a Gemini API key in Settings for natural-language requests. Direct @agent open/close commands work without one."