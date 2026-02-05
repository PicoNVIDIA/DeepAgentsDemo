/**
 * SSE client for communicating with the Deep Agent backend.
 * Parses the stream into typed events for the chat UI.
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

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

/**
 * Send a message to the Deep Agent and yield streaming events.
 */
export async function* sendMessage(
  message: string,
  skillIds: string[],
  history: ChatMessage[],
): AsyncGenerator<AgentEvent> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      skill_ids: skillIds,
      history: history.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    yield { type: 'error', message: `Server error: ${response.status}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines from the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let eventType = '';
    let eventData = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        eventData = line.slice(5).trim();
      } else if (line === '' && eventType && eventData) {
        // Complete SSE event
        try {
          const parsed = JSON.parse(eventData);

          switch (eventType) {
            case 'token':
              yield { type: 'token', content: parsed.content };
              break;
            case 'tool_start':
              yield {
                type: 'tool_start',
                id: parsed.id,
                name: parsed.name,
                skillId: parsed.skillId,
                icon: parsed.icon,
                action: parsed.action,
                input: parsed.input,
              };
              break;
            case 'tool_end':
              yield {
                type: 'tool_end',
                id: parsed.id,
                name: parsed.name,
                output: parsed.output,
                duration: parsed.duration,
              };
              break;
            case 'error':
              yield { type: 'error', message: parsed.message };
              break;
            case 'done':
              yield { type: 'done' };
              break;
          }
        } catch {
          // skip malformed JSON
        }
        eventType = '';
        eventData = '';
      }
    }
  }
}
