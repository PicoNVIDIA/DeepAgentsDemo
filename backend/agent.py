"""
Agent factory — creates a LangGraph ReAct agent with only the tools
the user selected. No sub-agents, no file ops, no todos — clean and simple.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from langgraph.prebuilt import create_react_agent
from langchain_nvidia_ai_endpoints import ChatNVIDIA


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
        max_tokens=4096,
    )


def _build_tools(skill_ids: list[str]) -> list:
    """Map UI skill IDs to real LangChain tools."""
    tools = []

    # Web Search → Tavily (added in phase 3)
    if "websearch" in skill_ids or "rag" in skill_ids:
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
        except ImportError:
            print("[Agent] Tavily not available, skipping web search")

    return tools


def _build_system_prompt(skill_ids: list[str], model_id: str) -> str:
    """Create a system prompt that includes the selected capabilities."""
    skill_descriptions = {
        "cublas": "cuBLAS — GPU-accelerated linear algebra (BLAS) operations",
        "cuopt": "cuOpt — GPU-accelerated combinatorial optimization and routing",
        "cuml": "cuML — GPU-accelerated machine learning algorithms",
        "cudnn": "cuDNN — GPU-accelerated deep neural network primitives",
        "tensorrt": "TensorRT — high-performance deep learning inference optimizer",
        "cugraph": "cuGraph — GPU-accelerated graph analytics",
        "websearch": "Web Search — real-time internet search via Tavily",
        "codeinterpreter": "Code Interpreter — ability to write and execute code",
        "rag": "RAG — retrieval-augmented generation with document search",
        "vision": "Vision — image understanding and analysis",
        "speech": "Speech — voice recognition and synthesis",
        "fileio": "File I/O — read and write files",
        "api": "API Access — connect to external REST/GraphQL services",
        "database": "Database — query structured data stores",
    }

    capabilities = []
    for sid in skill_ids:
        desc = skill_descriptions.get(sid)
        if desc:
            capabilities.append(f"  - {desc}")

    caps_text = "\n".join(capabilities) if capabilities else "  - General purpose assistant"
    model_name = MODEL_DISPLAY_NAMES.get(model_id, "AI Model")

    return f"""You are an NVIDIA Deep Agent — a powerful AI assistant built for GTC 2026.
Your soul (foundation model) is: {model_name}
You have been equipped with the following capabilities:
{caps_text}

Answer the user's question directly. Be concise and technically accurate.
If you have a web search tool, use it when the user asks for current information.
Reference your GPU-accelerated capabilities when discussing performance.
You are running on NVIDIA infrastructure and are optimized for speed and accuracy.
"""


def create_agent(skill_ids: list[str] | None = None, model_id: str = "llama"):
    """
    Create a ReAct agent configured with the given skills and model.
    Returns a compiled LangGraph graph.
    """
    if skill_ids is None:
        skill_ids = []

    model = _get_model(model_id)
    tools = _build_tools(skill_ids)
    system_prompt = _build_system_prompt(skill_ids, model_id)

    agent = create_react_agent(
        model=model,
        tools=tools,
        prompt=system_prompt,
    )

    return agent
