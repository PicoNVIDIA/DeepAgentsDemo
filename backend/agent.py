"""
Deep Agent factory — creates a real deepagents-powered LangGraph agent
with file tools, shell, planning, and optional web search.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain_nvidia_ai_endpoints import ChatNVIDIA

# Workspace directory for file operations
WORKSPACE_DIR = "/tmp/deepagent_workspace"
os.makedirs(WORKSPACE_DIR, exist_ok=True)


# Map UI model IDs to NVIDIA NIM model strings (verified available)
MODEL_MAP = {
    "nemotron": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "llama": "meta/llama-3.3-70b-instruct",
    "deepseek": "deepseek-ai/deepseek-r1-0528",
    "claude": "meta/llama-3.3-70b-instruct",  # Fallback until Anthropic key added
}

MODEL_DISPLAY_NAMES = {
    "nemotron": "Nemotron (NVIDIA)",
    "llama": "Llama 3.3 (Meta)",
    "deepseek": "DeepSeek R1 (DeepSeek)",
    "claude": "Claude-style (Anthropic fallback)",
}


def _get_model(model_id: str = "llama"):
    """Return an NVIDIA NIM chat model for the given model ID."""
    api_key = os.getenv("NVIDIA_API_KEY")
    model_name = MODEL_MAP.get(model_id, MODEL_MAP["llama"])
    print(f"[Agent] Using model: {model_name} (id={model_id})")
    return ChatNVIDIA(
        model=model_name,
        api_key=api_key,
        temperature=0.3,
    )


def _build_extra_tools(skill_ids: list[str]) -> list:
    """Build additional tools based on user-selected skills (beyond deepagents built-ins)."""
    tools = []

    # Web Search → Tavily
    if "websearch" in skill_ids:
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults
            tavily_key = os.getenv("TAVILY_API_KEY")
            if tavily_key:
                tools.append(
                    TavilySearchResults(
                        max_results=3,
                        api_key=tavily_key,
                    )
                )
                print("[Agent] Added Tavily web search tool")
        except ImportError:
            print("[Agent] Tavily not available, skipping web search")

    return tools


def _build_system_prompt(skill_ids: list[str], model_id: str) -> str:
    """Create a system prompt that includes the selected capabilities."""
    model_name = MODEL_DISPLAY_NAMES.get(model_id, "AI Model")

    # Describe what's enabled
    enabled = []
    if "websearch" in skill_ids:
        enabled.append("- Web Search (tavily_search_results_json): search the internet for current information")
    if "fileio" in skill_ids:
        enabled.append("- File I/O (read_file, write_file, edit_file, ls, glob, grep): read, write, and manage files")
    if "execute" in skill_ids:
        enabled.append("- Code Execution (execute): run shell commands and scripts")

    # Always available from deepagents
    builtin = [
        "- Planning (write_todos): organize tasks and track progress",
    ]

    all_capabilities = enabled + builtin if enabled else builtin
    caps_text = "\n".join(all_capabilities)

    return f"""You are an NVIDIA Deep Agent — a powerful AI assistant built for GTC 2026.
Your soul (foundation model) is: {model_name}

Your enabled capabilities:
{caps_text}

CRITICAL RULES:
1. Answer the user's question DIRECTLY. Do NOT use the 'task' tool — respond yourself.
2. Use your file tools (read_file, write_file, edit_file, ls, glob, grep) when the user asks to work with files.
3. IMPORTANT: File tools require ABSOLUTE paths. Your workspace is: {WORKSPACE_DIR}
   Always use paths like: {WORKSPACE_DIR}/hello.py or {WORKSPACE_DIR}/src/main.py
   To list workspace files: ls with path "{WORKSPACE_DIR}"
4. Use web search (tavily_search_results_json) when the user asks for current information or news.
5. Use execute for running commands only when explicitly asked.
6. Be concise and technically accurate.
7. You are running on NVIDIA infrastructure — reference GPU capabilities when relevant.
"""


def create_agent(skill_ids: list[str] | None = None, model_id: str = "llama"):
    """
    Create a Deep Agent configured with the given skills and model.
    Returns a compiled LangGraph graph with deepagents' built-in tools
    plus any additional tools based on selected skills.
    """
    if skill_ids is None:
        skill_ids = []

    model = _get_model(model_id)
    extra_tools = _build_extra_tools(skill_ids)
    system_prompt = _build_system_prompt(skill_ids, model_id)

    # Use real filesystem backend rooted in workspace/
    backend = FilesystemBackend(root_dir=WORKSPACE_DIR)

    agent = create_deep_agent(
        model=model,
        tools=extra_tools if extra_tools else None,
        system_prompt=system_prompt,
        backend=backend,
    )

    print(f"[Agent] Created deep agent with skills={skill_ids}, extra_tools={[t.name for t in extra_tools]}")
    return agent
