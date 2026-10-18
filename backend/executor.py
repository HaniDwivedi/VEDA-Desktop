import pyautogui

# Disable corner abort failsafe for smooth remote operation
pyautogui.FAILSAFE = False

def execute_tap(x_pct: float, y_pct: float):
    """Maps touch percentage to screen resolution and performs a click."""
    screen_width, screen_height = pyautogui.size()
    
    actual_x = int(x_pct * screen_width)
    actual_y = int(y_pct * screen_height)
    
    pyautogui.click(x=actual_x, y=actual_y)
    print(f"[Executor Action] Clicked at ({actual_x}, {actual_y}) [Percentages: {x_pct:.2f}, {y_pct:.2f}]")

def execute_keyboard(text: str):
    """Types text or shortcuts on the local OS."""
    pyautogui.write(text, interval=0.05)
    print(f"[Executor Keyboard] Typed: {text}")