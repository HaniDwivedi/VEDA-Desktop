import os
import json
from dotenv import load_dotenv

load_dotenv()

# Load Configuration dynamically
config_path = os.path.join(os.path.dirname(__file__), '..', 'config.json')
with open(config_path, 'r') as file:
    config = json.load(file)

ACTIVE_PROVIDER = config.get("active_provider", "gemini")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROK_KEY = os.getenv("GROK_API_KEY")

async def breakdown_task_to_json(user_input: str) -> list:
    """
    Routes the prompt to Gemini 1.5 Flash or Grok based on config.json.
    Expects the LLM to return a JSON array of actionable steps.
    """
    prompt = f"{config.get('system_prompt')}\nUser Request: {user_input}"
    
    # Example Integration Logic
    if ACTIVE_PROVIDER == "gemini":
        # using google-generativeai SDK in production
        # response = gemini_client.generate_content(prompt)
        print(f"🧠 Routing to {config.get('gemini_model')} via Gemini API...")
    elif ACTIVE_PROVIDER == "grok":
        # using OpenAI compatible client for Grok in production
        print(f"🧠 Routing to {config.get('grok_model')} via Grok API...")

    # Simulated LLM JSON Response for demonstration
    return [
        {"step": 1, "action": "open_app", "target": "chrome"}
    ]

async def analyze_error_with_llm(failed_task: dict, error_message: str) -> dict:
    """Sends the execution error to the LLM to generate a user-friendly explanation."""
    print(f"🧠 Asking {ACTIVE_PROVIDER} to analyze the error...")
    
    # Simulated LLM Error analysis
    return {
        "message": f"I encountered an issue with step {failed_task['step']} ({failed_task['action']}). System error: {error_message}"
    }