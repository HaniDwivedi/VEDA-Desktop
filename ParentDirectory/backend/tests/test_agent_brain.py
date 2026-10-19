import sys
import unittest
import json
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agent_brain import close_application, normalize_app_name, process_agent_command


class AgentAllowlistTests(unittest.TestCase):
    def test_aliases_are_explicit(self):
        self.assertEqual(normalize_app_name(" VS Code "), "vscode")
        self.assertIsNone(normalize_app_name("chrome & calc.exe"))

    @patch("agent_brain.subprocess.Popen")
    def test_supported_command_launches_without_a_shell(self, popen):
        result = process_agent_command("@agent open VS Code")

        self.assertIn("Opened approved application", result)
        popen.assert_called_once()
        self.assertFalse(popen.call_args.kwargs["shell"])

    @patch("agent_brain.subprocess.Popen")
    def test_unsupported_command_does_not_launch(self, popen):
        result = process_agent_command("open chrome & calc.exe")

        self.assertIn("not an available approved application", result)
        popen.assert_not_called()

    @patch("agent_brain.subprocess.run")
    def test_close_uses_argument_list_without_a_shell(self, run):
        run.return_value.returncode = 0

        self.assertTrue(close_application("chrome"))
        self.assertIsInstance(run.call_args.args[0], list)
        self.assertFalse(run.call_args.kwargs["shell"])

    @patch("agent_brain.subprocess.Popen")
    @patch("agent_brain.urllib.request.urlopen")
    def test_gemini_result_can_only_launch_an_allowlisted_app(self, urlopen, popen):
        response_body = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json.dumps({"action": "open_app", "target": "Chrome"})}]
                    }
                }
            ]
        }
        urlopen.return_value = BytesIO(json.dumps(response_body).encode("utf-8"))

        result = process_agent_command("Please open my browser", "test-key", "models/gemini-test")

        self.assertIn("Opened approved application", result)
        self.assertFalse(popen.call_args.kwargs["shell"])
        request = urlopen.call_args.args[0]
        self.assertNotIn("test-key", request.full_url)
        self.assertIn(("X-goog-api-key", "test-key"), request.header_items())
        self.assertIn("systemInstruction", json.loads(request.data))

    @patch("agent_brain.subprocess.Popen")
    @patch("agent_brain.urllib.request.urlopen")
    def test_gemini_cannot_launch_an_unapproved_target(self, urlopen, popen):
        response_body = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": json.dumps({"action": "open_app", "target": "powershell"})}
                        ]
                    }
                }
            ]
        }
        urlopen.return_value = BytesIO(json.dumps(response_body).encode("utf-8"))

        result = process_agent_command("Run a terminal command", "test-key", "gemini-test")

        self.assertIn("unsupported action", result)
        popen.assert_not_called()


if __name__ == "__main__":
    unittest.main()