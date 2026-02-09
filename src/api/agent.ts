/**
 * SSE client for communicating with the Deep Agent backend.
 * Uses a callback pattern for reliable browser streaming.
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
 * Send a message to the Deep Agent and call onEvent for each SSE event.
 * Returns a promise that resolves when the stream is complete.
 */
export async function sendMessage(
  message: string,
  skillIds: string[],
  history: ChatMessage[],
  modelId: string | undefined,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  console.log('[Agent] Sending:', message, 'model:', modelId);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      skill_ids: skillIds,
      model_id: modelId || 'llama',
      history: history.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  console.log('[Agent] Response:', response.status, response.headers.get('content-type'));

  if (!response.ok) {
    onEvent({ type: 'error', message: `Server error: ${response.status}` });
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

        // Parse the SSE block
        let eventType = '';
        let eventData = '';

        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.substring(5).trim();
          }
          // Ignore comments (lines starting with ':')
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
