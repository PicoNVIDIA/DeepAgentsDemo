# Deep Agent Builder — NVIDIA GTC 2026 Demo

A full-stack AI agent builder where users pick a foundation model, drag-and-drop tools and skills onto an agent, and chat with it in real-time. Built on [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) with NVIDIA NIM models.

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Python 3.11+** (required by deepagents)
- **NVIDIA API key** — free from [build.nvidia.com](https://build.nvidia.com)
- **Tavily API key** (optional, for web search) — free from [tavily.com](https://tavily.com)

### 1. Clone

```bash
git clone https://github.com/PicoNVIDIA/DeepAgentsDemo.git
cd DeepAgentsDemo
```

### 2. Backend Setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create your `.env` file with API keys:

```bash
cat > .env << EOF
NVIDIA_API_KEY=nvapi-your-key-here
TAVILY_API_KEY=tvly-your-key-here
EOF
```

Start the backend:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup (new terminal)

```bash
cd DeepAgentsDemo
npm install
npm run dev
```

### 4. Open

```
http://localhost:5173
```

Pick a model → drag tools onto the agent → click Build → chat!

## Features

### Soul Picker
Choose your foundation model — each has a brand color that themes the entire UI:
- **Nemotron** (NVIDIA) — `nvidia/llama-3.3-nemotron-super-49b-v1.5`
- **Llama** (Meta) — `meta/llama-3.3-70b-instruct`
- **DeepSeek** — `deepseek-ai/deepseek-r1-0528`
- **Claude** (Anthropic) — fallback to Llama

### Tools (drag-and-drop)
| Tool | What it does |
|---|---|
| 🌐 **Web Search** | Real-time internet search via Tavily |
| 📁 **File I/O** | Read, write, edit files + ls, glob, grep |
| 💻 **Shell Execution** | Run shell commands and Python scripts |

### Skills (drag-and-drop)
| Skill | What it does |
|---|---|
| ⚡ **Superpowers** | TDD, planning & debugging methodology ([obra/superpowers](https://github.com/obra/superpowers)) |
| 🟩 **cuDF** | GPU-accelerated DataFrames (NVIDIA RAPIDS) |

### Human-in-the-Loop
When the agent wants to write a file, edit code, or run a command, it pauses and asks for your approval before executing.

### Live Tool Traces
See which tools the agent calls in real-time — inline traces in chat + a dedicated tool calls panel with web visualization.

## Architecture

```
React Frontend (Vite + TypeScript)
  → Soul Picker (model selection)
  → Skill Builder (drag & drop)
  → Build Animation
  → Chat (SSE streaming + Markdown rendering)
  → Tool Calls Panel + Web View
  → Human-in-the-loop approval UI

FastAPI Backend (Python)
  → langchain-ai/deepagents (LangGraph agent)
  → NVIDIA NIM models
  → Session management (in-memory)
  → SSE streaming
  → Checkpointer for HITL interrupt/resume
```

### How the Build Flow Works

1. **UI** builds an array of specs: `{ model_id, skill_ids, hitl_enabled }`
2. **Frontend** sends `POST /api/agent` with the specs
3. **Backend** (`server.py`) calls `create_agent()` in `agent.py`
4. **Agent factory** resolves each spec into real components:
   - `model_id` → NVIDIA NIM model
   - `skill_ids` → tools (Tavily, file ops, shell) + skill files (markdown → system prompt)
   - `hitl_enabled` → interrupt config + checkpointer
5. Returns a `session_id` — all chat goes through `POST /api/agent/{id}/chat`

## Adding New Skills

Drop a `.md` file in `backend/skills/`, then:

1. Add the mapping in `backend/agent.py` → `_load_skill_content()`:
   ```python
   skill_files = {
       "superpowers": "superpowers.md",
       "cudf": "cudf.md",
       "your_skill": "your_skill.md",  # ← add here
   }
   ```

2. Add the frontend entry in `src/data/skills.ts`:
   ```typescript
   {
     id: 'your_skill',
     name: 'Your Skill',
     description: 'What it does',
     category: 'skills',
     icon: '🎯',
   },
   ```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/agent` | Create agent session |
| `DELETE` | `/api/agent/{id}` | Delete session |
| `POST` | `/api/agent/{id}/chat` | Chat (SSE streaming) |
| `POST` | `/api/agent/{id}/approve` | Approve/reject interrupted tool call |

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Framer Motion, @dnd-kit, react-markdown
- **Backend**: FastAPI, deepagents, LangGraph, NVIDIA NIM, Tavily, SSE
- **Styling**: NVIDIA Kaizen Design System tokens, CSS variables for dynamic theming
