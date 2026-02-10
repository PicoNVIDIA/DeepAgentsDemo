"""
Deep Agent factory — creates a real deepagents-powered LangGraph agent
with file tools, shell, planning, human-in-the-loop, optional skills and web search.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend, LocalShellBackend, CompositeBackend
from langgraph.checkpoint.memory import MemorySaver
from langchain_nvidia_ai_endpoints import ChatNVIDIA


# Workspace directory for file operations
WORKSPACE_DIR = "/tmp/deepagent_workspace"
os.makedirs(WORKSPACE_DIR, exist_ok=True)

# Skills directory
SKILLS_DIR = os.path.join(os.path.dirname(__file__), "skills")
os.makedirs(SKILLS_DIR, exist_ok=True)

# Shared checkpointer for all sessions (in-memory, resets on server restart)
checkpointer = MemorySaver()

# Map UI model IDs to NVIDIA NIM model strings (verified available)
MODEL_MAP = {
    "nemotron": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "llama": "meta/llama-3.3-70b-instruct",
    "deepseek": "deepseek-ai/deepseek-r1-0528",
    "claude": "meta/llama-3.3-70b-instruct",
}

MODEL_DISPLAY_NAMES = {
    "nemotron": "Nemotron (NVIDIA)",
    "llama": "Llama 3.3 (Meta)",
    "deepseek": "DeepSeek R1 (DeepSeek)",
    "claude": "Claude-style (Anthropic fallback)",
}

# Tools that require human approval before executing
INTERRUPT_TOOLS = {
    "write_file": True,
    "edit_file": True,
    "execute": True,
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
    """Build additional tools based on user-selected skills."""
    tools = []

    if "websearch" in skill_ids:
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults
            tavily_key = os.getenv("TAVILY_API_KEY")
            if tavily_key:
                tools.append(TavilySearchResults(max_results=3, api_key=tavily_key))
                print("[Agent] Added Tavily web search tool")
        except ImportError:
            print("[Agent] Tavily not available")

    return tools


def _load_skill_content(skill_ids: list[str]) -> str:
    """Load skill markdown files based on selected skills."""
    skill_content = []

    # Map skill IDs to skill files
    skill_files = {
        "superpowers": "superpowers.md",
        "cudf": "cudf.md",
    }

    for sid in skill_ids:
        filename = skill_files.get(sid)
        if filename:
            filepath = os.path.join(SKILLS_DIR, filename)
            if os.path.exists(filepath):
                with open(filepath, "r") as f:
                    content = f.read()
                    skill_content.append(content)
                    print(f"[Agent] Loaded skill: {filename}")

    return "\n\n---\n\n".join(skill_content)


def _get_skill_sources() -> list[str]:
    """Get list of skill source directories if any skills exist."""
    if os.path.exists(SKILLS_DIR) and os.listdir(SKILLS_DIR):
        return ["/skills/"]
    return []


def _build_system_prompt(skill_ids: list[str], model_id: str, hitl_enabled: bool) -> str:
    """Create a system prompt that includes the selected capabilities and skills."""
    model_name = MODEL_DISPLAY_NAMES.get(model_id, "AI Model")

    enabled = []
    if "websearch" in skill_ids:
        enabled.append("- Web Search (tavily_search_results_json): search the internet")
    if "fileio" in skill_ids:
        enabled.append("- File I/O (read_file, write_file, edit_file, ls, glob, grep): manage files")
    if "execute" in skill_ids:
        enabled.append("- Shell Execution (execute): run shell commands, Python scripts, and system tools")
    if "superpowers" in skill_ids:
        enabled.append("- Superpowers: agentic software development methodology (TDD, planning, debugging)")

    builtin = ["- Planning (write_todos): organize tasks"]
    all_capabilities = enabled + builtin if enabled else builtin
    caps_text = "\n".join(all_capabilities)

    hitl_note = ""
    if hitl_enabled:
        hitl_note = """
NOTE: Some tools (write_file, edit_file, execute) require human approval.
The user will be asked to approve, edit, or reject your tool calls before they execute.
Continue normally after approval — do not ask the user to approve manually."""

    # Load skill content if any skills are selected
    skill_content = _load_skill_content(skill_ids)
    skill_section = f"\n\n---\n\n{skill_content}" if skill_content else ""

    return f"""You are an NVIDIA Deep Agent — a powerful AI assistant built for GTC 2026.
Your soul (foundation model) is: {model_name}

Your enabled capabilities:
{caps_text}

CRITICAL RULES:
1. Answer the user's question DIRECTLY. Do NOT use the 'task' tool — respond yourself.
2. File tools require ABSOLUTE paths. Your workspace is: {WORKSPACE_DIR}
   Always use paths like: {WORKSPACE_DIR}/hello.py
3. Use web search when the user asks for current information.
4. Be concise and technically accurate.
5. You are running on NVIDIA infrastructure.
{hitl_note}{skill_section}"""


def create_agent(
    skill_ids: list[str] | None = None,
    model_id: str = "llama",
    hitl_enabled: bool = False,
):
    """Create a Deep Agent with optional human-in-the-loop and skills."""
    if skill_ids is None:
        skill_ids = []

    model = _get_model(model_id)
    extra_tools = _build_extra_tools(skill_ids)
    system_prompt = _build_system_prompt(skill_ids, model_id, hitl_enabled)
    skill_sources = _get_skill_sources()

    # Build backend: LocalShellBackend includes file ops + execute
    if "execute" in skill_ids:
        backend = LocalShellBackend(
            root_dir=WORKSPACE_DIR,
            timeout=60.0,
            max_output_bytes=50000,
            inherit_env=True,
        )
        print("[Agent] Shell execution enabled via LocalShellBackend")
    else:
        backend = FilesystemBackend(root_dir=WORKSPACE_DIR)

    agent_kwargs: dict = {
        "model": model,
        "tools": extra_tools if extra_tools else None,
        "system_prompt": system_prompt,
        "backend": backend,
        "checkpointer": checkpointer,
    }

    if hitl_enabled:
        agent_kwargs["interrupt_on"] = INTERRUPT_TOOLS

    if skill_sources:
        agent_kwargs["skills"] = skill_sources

    agent = create_deep_agent(**agent_kwargs)
    print(f"[Agent] Created deep agent: skills={skill_ids}, hitl={hitl_enabled}, skill_sources={skill_sources}")
    return agent
