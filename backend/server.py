"""
FastAPI server with session-based agent management and SSE streaming.
"""

import json
import time
import uuid
import traceback
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from agent import create_agent  # noqa: E402

app = FastAPI(title="Deep Agent Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── In-memory session store ──────────────────────────────────────────────────

class AgentSession:
    def __init__(self, agent, model_id: str, skill_ids: list[str]):
        self.agent = agent
        self.model_id = model_id
        self.skill_ids = skill_ids
        self.messages: list = []  # LangChain message objects
        self.created_at = time.time()

sessions: dict[str, AgentSession] = {}


# ── Request/Response models ──────────────────────────────────────────────────

class CreateAgentRequest(BaseModel):
    model_id: str = "llama"
    skill_ids: list[str] = []

class ChatRequest(BaseModel):
    message: str

# Legacy request for backward compatibility
class LegacyChatRequest(BaseModel):
    message: str
    skill_ids: list[str] = []
    model_id: str = "llama"
    history: list[dict] = []


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "deep-agent-backend", "sessions": len(sessions)}


@app.post("/api/agent")
async def create_agent_session(request: CreateAgentRequest):
    """Create a new agent session. Returns a session_id."""
    try:
        agent = create_agent(request.skill_ids, request.model_id)
        session_id = str(uuid.uuid4())[:8]
        sessions[session_id] = AgentSession(agent, request.model_id, request.skill_ids)
        print(f"[Session] Created {session_id} with model={request.model_id}, skills={request.skill_ids}")
        return {"session_id": session_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/agent/{session_id}")
async def delete_agent_session(session_id: str):
    """Destroy an agent session."""
    if session_id in sessions:
        del sessions[session_id]
        print(f"[Session] Deleted {session_id}")
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Session not found")


@app.post("/api/agent/{session_id}/chat")
async def chat_with_session(session_id: str, request: ChatRequest):
    """Stream a response from an existing agent session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return EventSourceResponse(_stream_response(session, request.message))


@app.post("/api/chat")
async def legacy_chat(request: LegacyChatRequest):
    """Legacy endpoint — creates a one-shot agent per request."""
    # Create a temporary session
    agent = create_agent(request.skill_ids, request.model_id)
    session = AgentSession(agent, request.model_id, request.skill_ids)

    # Add history
    for msg in request.history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "agent" or role == "assistant":
            session.messages.append(AIMessage(content=content))
        else:
            session.messages.append(HumanMessage(content=content))

    return EventSourceResponse(_stream_response(session, request.message))


# ── Streaming helper ─────────────────────────────────────────────────────────

# Map tool names to skill icons and IDs
ICON_MAP = {
    # Web Search
    "tavily_search_results_json": "🌐",
    "tavily_search_results": "🌐",
    # File I/O (deepagents built-in)
    "read_file": "📖",
    "write_file": "✏️",
    "edit_file": "📝",
    "ls": "📂",
    "glob": "🔍",
    "grep": "🔎",
    # Shell execution
    "execute": "💻",
    # Planning
    "write_todos": "📋",
    "read_todos": "📋",
    # Sub-agents (should not fire, but map just in case)
    "task": "🤖",
}

SKILL_ID_MAP = {
    # Web Search
    "tavily_search_results_json": "websearch",
    "tavily_search_results": "websearch",
    # File I/O
    "read_file": "fileio",
    "write_file": "fileio",
    "edit_file": "fileio",
    "ls": "fileio",
    "glob": "fileio",
    "grep": "fileio",
    # Shell
    "execute": "execute",
    # Planning
    "write_todos": "planning",
    "read_todos": "planning",
    # Sub-agents
    "task": "task",
}


async def _stream_response(session: AgentSession, user_message: str) -> AsyncGenerator[dict, None]:
    try:
        # Add user message to history
        session.messages.append(HumanMessage(content=user_message))

        tool_timers: dict[str, float] = {}
        full_response = ""

        async for event in session.agent.astream_events(
            {"messages": session.messages},
            version="v2",
                config={"recursion_limit": 30},
        ):
            kind = event.get("event", "")

            # --- LLM token streaming ---
            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    full_response += chunk.content
                    yield {
                        "event": "token",
                        "data": json.dumps({"content": chunk.content}),
                    }

            # --- Tool call start ---
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                run_id = event.get("run_id", "")
                tool_input = event.get("data", {}).get("input", "")
                tool_timers[run_id] = time.time()

                input_str = str(tool_input)
                if len(input_str) > 200:
                    input_str = input_str[:200] + "..."

                yield {
                    "event": "tool_start",
                    "data": json.dumps({
                        "id": run_id,
                        "name": tool_name,
                        "skillId": SKILL_ID_MAP.get(tool_name, "api"),
                        "icon": ICON_MAP.get(tool_name, "🔧"),
                        "action": tool_name.replace("_", " "),
                        "input": input_str,
                    }),
                }

            # --- Tool call end ---
            elif kind == "on_tool_end":
                run_id = event.get("run_id", "")
                tool_name = event.get("name", "unknown")
                output = event.get("data", {}).get("output", "")
                start_time = tool_timers.pop(run_id, time.time())
                duration_ms = int((time.time() - start_time) * 1000)

                output_str = str(output)
                if len(output_str) > 300:
                    output_str = output_str[:300] + "..."

                yield {
                    "event": "tool_end",
                    "data": json.dumps({
                        "id": run_id,
                        "name": tool_name,
                        "output": output_str,
                        "duration": duration_ms,
                    }),
                }

        # Save assistant response to session history
        if full_response:
            session.messages.append(AIMessage(content=full_response))

        yield {"event": "done", "data": "{}"}

    except Exception as e:
        traceback.print_exc()
        yield {
            "event": "error",
            "data": json.dumps({"message": str(e)}),
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
