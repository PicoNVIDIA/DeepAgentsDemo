# Blocky Bits Integration Notes

Hey Ryan! Here's what we set up on our side to connect to your blocky-bits API.

## What we built

We added a "Visual Mode" toggle to the agent builder. When it's turned on, our app polls your `/workspace` endpoint every second and uses whatever blocks you detect to automatically configure the agent.

Two things happen:
- **Model blocks** → auto-select the foundation model (skips the model picker screen entirely)
- **Skill blocks** → auto-add tools to the agent builder

So the idea is: the user places physical blocks on the workspace, and the UI updates in real time to match.

## How it works on our side

There's a React hook (`src/hooks/useBlockyBits.ts`) that hits `GET /blocks/workspace` through a Vite proxy (we proxy `/blocks/*` → `localhost:1234`). It parses your response and maps block names to our internal IDs.

Here are the current mappings — **these will need updating once you finalize your block names**:

```typescript
// Model blocks → which LLM to use
'NVIDIA'  → 'nemotron'   // nvidia/llama-3.3-nemotron-super-49b-v1.5
'Meta'    → 'llama'      // meta/llama-3.3-70b-instruct
'Claude'  → 'claude'     // fallback to llama for now
'Google'  → 'deepseek'   // deepseek-ai/deepseek-r1-0528

// Skill blocks → which tools to give the agent
'Google'  → 'websearch'  // Tavily web search
'weather' → 'websearch'  // also maps to web search
```

Our tool IDs that you can map to:
- `websearch` — internet search
- `fileio` — read/write/edit files
- `execute` — run shell commands
- `superpowers` — TDD methodology (skill, not a tool)
- `cudf` — NVIDIA RAPIDS cuDF knowledge (skill, not a tool)

If you name your blocks to match these IDs directly (like a block called "websearch"), the mapping becomes trivial. Otherwise just let me know what names you're using and I'll update the map.

## Running it

1. Start your blocky-bits on port 1234:
   ```
   cd blocky-bits
   uv run blocky-bits start --port 1234
   ```

2. Start our backend on port 8000:
   ```
   cd DeepAgentsDemo/backend
   source .venv/bin/activate
   uvicorn server:app --host 127.0.0.1 --port 8000 --reload
   ```

3. Start our frontend on port 5173:
   ```
   cd DeepAgentsDemo
   npm run dev
   ```

4. Go to `http://localhost:5173` and click the **🧊 Visual** toggle in the top right

5. Use your debug UI at `http://localhost:1234/debug` to simulate placing blocks

When a model block appears, our soul picker auto-selects and moves to the builder. When skill blocks appear, they auto-add to the agent.

## Things to figure out together

- **Block names**: What are you calling the final blocks? I'll update the mappings to match.
- **Auto-build**: Right now the user still has to click "Build" after blocks are placed. Should we auto-trigger build after a delay? Or do you want a specific "build" block?
- **Python 3.14 issue**: We hit a pydantic + Python 3.14 beta compat error when trying to run blocky-bits locally. Might need to pin pydantic or wait for a fix. The debug UI at `/debug` would help us test in the meantime.

## Files we changed

- `src/hooks/useBlockyBits.ts` — the polling hook (this is the main thing)
- `src/App.tsx` — wired the hook in, added the mode toggle
- `src/App.css` — styled the toggle and connection indicator
- `vite.config.ts` — added proxy `/blocks` → `localhost:1234`

Nothing else changed. The backend, agent builder, chat, and all existing functionality still works the same in Website Mode.
