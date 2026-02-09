import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Skill } from '../../data/skills';
import type { ToolCall } from '../ToolCallsPanel';
import { ToolCallsPanel } from '../ToolCallsPanel';
import { sendMessage } from '../../api/agent';
import './ChatSection.css';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface ChatSectionProps {
  isVisible: boolean;
  skills: Skill[];
  onReset: () => void;
  modelId?: string;
}

export function ChatSection({ isVisible, skills, onReset, modelId }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Greeting on first show
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const skillNames = skills.slice(0, 3).map(s => s.name).join(', ');
      setMessages([{
        id: 'greeting',
        role: 'agent',
        content: `🤖 **Deep Agent Online**\n\nI've been configured with ${skills.length} capabilities including ${skillNames}${skills.length > 3 ? ' and more' : ''}.\n\nHow can I assist you today?`,
        timestamp: new Date(),
      }]);
    }
  }, [isVisible, skills, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-focus
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    setStreamingContent('');

    // Build history from existing messages (exclude greeting)
    const history = messages
      .filter(m => m.id !== 'greeting')
      .map(m => ({ role: m.role, content: m.content }));

    const skillIds = skills.map(s => s.id);
    let fullContent = '';

    try {
      console.log('[Chat] Starting stream for:', currentInput);

      await sendMessage(currentInput, skillIds, history, modelId, (event) => {
        console.log('[Chat] Event:', event.type);
        switch (event.type) {
          case 'token':
            fullContent += event.content;
            setStreamingContent(fullContent);
            break;

          case 'tool_start': {
            const skill = skills.find(s => s.id === event.skillId);
            setActiveToolId(event.skillId);
            setToolCalls(prev => [...prev, {
              id: event.id,
              skillId: event.skillId,
              skillName: skill?.name || event.name,
              skillIcon: skill?.icon || event.icon,
              action: event.action,
              status: 'running',
              startTime: new Date(),
              input: event.input,
            }]);
            break;
          }

          case 'tool_end':
            setToolCalls(prev => prev.map(tc =>
              tc.id === event.id
                ? {
                    ...tc,
                    status: 'success' as const,
                    endTime: new Date(),
                    duration: event.duration,
                    output: event.output,
                  }
                : tc
            ));
            setActiveToolId(null);
            break;

          case 'error':
            fullContent += `\n\n⚠️ Error: ${event.message}`;
            setStreamingContent(fullContent);
            break;

          case 'done':
            break;
        }
      });
    } catch (err) {
      console.error('[Chat] Stream error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      fullContent = fullContent || `⚠️ Could not reach the agent backend.\n\n${errorMsg}\n\nMake sure the backend is running: \`cd backend && python server.py\``;
    }

    // Finalize the streamed message
    if (fullContent) {
      setMessages(prev => [...prev, {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: fullContent,
        timestamp: new Date(),
      }]);
    }
    setStreamingContent('');
    setIsTyping(false);
  }, [input, isTyping, skills, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="chat-section"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="chat-main-area">
            {/* Chat Panel */}
            <div className="chat-panel">
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-status">
                    <span className="status-dot" />
                    <span>Deep Agent Active</span>
                  </div>
                  <div className="chat-skills">
                    {skills.slice(0, 4).map(skill => (
                      <span key={skill.id} className="skill-tag">
                        {skill.icon} {skill.name}
                      </span>
                    ))}
                    {skills.length > 4 && (
                      <span className="skill-tag more">+{skills.length - 4}</span>
                    )}
                  </div>
                </div>
                <button className="reset-btn" onClick={onReset}>
                  Build New Agent
                </button>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    className={`message ${message.role}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index === 0 ? 0 : 0.1 }}
                  >
                    <div className="message-avatar">
                      {message.role === 'agent' ? '🤖' : '👤'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {message.content.split('\n').map((line, i) => (
                          <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, (_: string, text: string) => text)}</p>
                        ))}
                      </div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Streaming content (in-progress agent message) */}
                {streamingContent && (
                  <motion.div
                    className="message agent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <div className="message-text streaming">
                        {streamingContent.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                        <span className="cursor-blink">▊</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Typing indicator (before first token arrives) */}
                <AnimatePresence>
                  {isTyping && !streamingContent && (
                    <motion.div
                      className="message agent typing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    placeholder="Message your Deep Agent..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                  </button>
                </div>
                <p className="chat-hint">
                  Try: "Search for GPU optimization tips" · "What's new at GTC 2026?" · "Write some code"
                </p>
              </div>
            </div>

            {/* Tool Calls Panel */}
            <ToolCallsPanel
              toolCalls={toolCalls}
              skills={skills}
              activeToolId={activeToolId}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
