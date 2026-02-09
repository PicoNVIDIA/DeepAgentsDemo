/**
 * API client for the Deep Agent backend.
 * Session-based: create an agent, then chat with it by session ID.
 */

export interface TokenEvent {
  type: 'token';
  content: string;
}

export interface ToolStartEvent {
  type: 'tool_start';
  id: string;
  name: string;
  skillId: string;
  icon: string;
  action: string;
  input: string;
}

export interface ToolEndEvent {
  type: 'tool_end';
  id: string;
  name: string;
  output: string;
  duration: number;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

export interface DoneEvent {
  type: 'done';
}

export type AgentEvent = TokenEvent | ToolStartEvent | ToolEndEvent | ErrorEvent | DoneEvent;


/**
 * Create a new agent session on the backend.
 * Returns the session_id.
 */
export async function createAgentSession(
  modelId: string,
  skillIds: string[],
): Promise<string> {
  console.log('[Agent] Creating session:', modelId, skillIds);

  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id: modelId, skill_ids: skillIds }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create agent: ${err}`);
  }

  const data = await response.json();
  console.log('[Agent] Session created:', data.session_id);
  return data.session_id;
}


/**
 * Delete an agent session.
 */
export async function deleteAgentSession(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/agent/${sessionId}`, { method: 'DELETE' });
    console.log('[Agent] Session deleted:', sessionId);
  } catch {
    // Ignore errors on cleanup
  }
}


/**
 * Send a message to an agent session and stream the response.
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  console.log('[Agent] Sending to session', sessionId, ':', message);

  const response = await fetch(`/api/agent/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  console.log('[Agent] Response:', response.status, response.headers.get('content-type'));

  if (!response.ok) {
    const err = await response.text();
    onEvent({ type: 'error', message: `Server error ${response.status}: ${err}` });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onEvent({ type: 'error', message: 'No response body' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[Agent] Stream ended');
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE blocks (separated by double newlines)
      let blockEnd: number;
      while ((blockEnd = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.substring(0, blockEnd);
        buffer = buffer.substring(blockEnd + 2);

        let eventType = '';
        let eventData = '';

        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.substring(5).trim();
          }
        }

        if (!eventType || !eventData) continue;

        try {
          const parsed = JSON.parse(eventData);

          switch (eventType) {
            case 'token':
              onEvent({ type: 'token', content: parsed.content || '' });
              break;
            case 'tool_start':
              onEvent({
                type: 'tool_start',
                id: parsed.id || '',
                name: parsed.name || '',
                skillId: parsed.skillId || 'api',
                icon: parsed.icon || '🔧',
                action: parsed.action || parsed.name || '',
                input: parsed.input || '',
              });
              break;
            case 'tool_end':
              onEvent({
                type: 'tool_end',
                id: parsed.id || '',
                name: parsed.name || '',
                output: parsed.output || '',
                duration: parsed.duration || 0,
              });
              break;
            case 'error':
              onEvent({ type: 'error', message: parsed.message || 'Unknown error' });
              break;
            case 'done':
              onEvent({ type: 'done' });
              break;
          }
        } catch {
          console.warn('[Agent] Failed to parse SSE:', eventData.substring(0, 100));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
