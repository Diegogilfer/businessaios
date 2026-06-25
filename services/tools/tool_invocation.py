# ============================================================
# BusinessAIOS - services/tools/tool_invocation.py
# FASE 9 — Tool invocation during autonomous execution
# Agents can call tools and get results back in loop
# ============================================================

import json
import re
from core.logger import get_logger
from services.tools.tool_registry import tool_registry

logger = get_logger("ToolInvocation")


class ToolInvocationParser:
    """
    Parses agent output for tool calls.
    Expected format: <tool name="TOOL_NAME" arg1="val1" arg2="val2" />
    """

    PATTERN = r'<tool\s+name="([^"]+)"([^>]*)/?>'

    @staticmethod
    def extract_tool_calls(text: str) -> list[dict]:
        """Extract all tool calls from agent output."""
        matches = re.finditer(ToolInvocationParser.PATTERN, text)
        calls = []

        for match in matches:
            tool_name = match.group(1)
            attrs_str = match.group(2)

            args = {}
            for attr_match in re.finditer(r'(\w+)="([^"]*)"', attrs_str):
                key, val = attr_match.groups()
                args[key] = val

            calls.append({"tool": tool_name, "args": args})

        return calls

    @staticmethod
    def has_tool_calls(text: str) -> bool:
        return bool(re.search(ToolInvocationParser.PATTERN, text))


class ToolInvocationExecutor:
    """
    Executes tool calls extracted from agent outputs.
    Wraps results back into a context for re-prompting.
    """

    async def execute_calls(self, tool_calls: list[dict]) -> dict:
        """Execute all tool calls, return results."""
        results = {}

        for call in tool_calls:
            tool_name = call["tool"]
            args = call["args"]

            logger.info(f"Executing tool: {tool_name} | args={args}")

            try:
                result = await tool_registry.invoke(tool_name, **args)
                results[tool_name] = result
            except Exception as e:
                logger.error(f"Tool execution error [{tool_name}]: {e}")
                results[tool_name] = {"error": str(e), "success": False}

        return results

    @staticmethod
    def format_results_for_prompt(results: dict) -> str:
        """Format tool results as context to inject back into prompt."""
        if not results:
            return ""

        lines = ["[Tool Execution Results]"]
        for tool_name, result in results.items():
            if isinstance(result, dict):
                status = "✓" if result.get("success", False) else "✗"
                content = result.get("result") or result.get("error", "No output")
                lines.append(f"{status} {tool_name}: {content[:200]}")
            else:
                lines.append(f"• {tool_name}: {str(result)[:200]}")

        return "\n".join(lines)


tool_invocation_parser = ToolInvocationParser()
tool_invocation_executor = ToolInvocationExecutor()
