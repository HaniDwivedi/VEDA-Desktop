from services.brain import breakdown_task_to_json, analyze_error_with_llm
from services.hand import execute_os_task

async def run_agent_loop(user_input: str) -> dict:
    """Iterates through tasks, attempts execution, and triggers auto-healing on failure."""
    task_list = await breakdown_task_to_json(user_input)
    execution_history = []
    
    for task in task_list:
        result = await execute_os_task(task)
        
        if result["success"]:
            execution_history.append({"task": task, "status": "success"})
        else:
            # Self-healing / Error Feedback Loop
            llm_feedback = await analyze_error_with_llm(task, result["error"])
            
            return {
                "status": "failed",
                "failed_step": task['step'],
                "agent_message": llm_feedback["message"],
                "history": execution_history
            }
            
    return {
        "status": "completed",
        "agent_message": "All requested tasks executed successfully.",
        "history": execution_history
    }