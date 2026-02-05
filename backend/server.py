"""
FastAPI server that exposes the Deep Agent via SSE streaming.
"""

import json
import time
import traceback
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

app = FastAPI(title="Deep Agent Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    skill_ids: list[str] = []
    history: list[dict] = []


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "deep-agent-backend"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Stream agent responses as Server-Sent Events.

    Event types:
      - token:      { "content": "partial text" }
      - tool_start: { "id": "...", "name": "...", "input": "..." }
      - tool_end:   { "id": "...", "name": "...", "output": "...", "duration": 123 }
      - error:      { "message": "..." }
      - done:       {}
    """

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            # Lazy import to avoid blocking startup
            from agent import create_agent

            agent = create_agent(request.skill_ids)

            # Build message history for the agent
            messages = []
            for msg in request.history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "agent":
                    role = "assistant"
                messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": request.message})

            # Stream the agent execution
            tool_timers: dict[str, float] = {}

            async for event in agent.astream_events(
                {"messages": messages},
                version="v2",
            ):
                kind = event.get("event", "")

                # --- LLM token streaming ---
                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
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

                    # Map tool names to skill icons
                    icon_map = {
                        "tavily_search_results": "🌐",
                        "execute": "💻",
                        "read_file": "📁",
                        "write_file": "📁",
                        "grep": "🔍",
                        "glob": "🔍",
                        "ls": "📁",
                    }

                    skill_id_map = {
                        "tavily_search_results": "websearch",
                        "execute": "codeinterpreter",
                        "read_file": "fileio",
                        "write_file": "fileio",
                        "grep": "fileio",
                        "glob": "fileio",
                        "ls": "fileio",
                    }

                    # Truncate input for display
                    input_str = str(tool_input)
                    if len(input_str) > 200:
                        input_str = input_str[:200] + "..."

                    yield {
                        "event": "tool_start",
                        "data": json.dumps({
                            "id": run_id,
                            "name": tool_name,
                            "skillId": skill_id_map.get(tool_name, "api"),
                            "icon": icon_map.get(tool_name, "🔧"),
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

                    # Truncate output for display
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

            yield {"event": "done", "data": "{}"}

        except Exception as e:
            traceback.print_exc()
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e)}),
            }

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
