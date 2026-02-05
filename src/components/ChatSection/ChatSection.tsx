import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Skill } from '../../data/skills';
import type { ToolCall } from '../ToolCallsPanel';
import { ToolCallsPanel } from '../ToolCallsPanel';
import './ChatSection.css';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  toolCallIds?: string[];
}

interface ChatSectionProps {
  isVisible: boolean;
  skills: Skill[];
  onReset: () => void;
}

// Maps user intent to tool call sequences
function getToolCallSequence(userMessage: string, skills: Skill[]): Array<{
  skillId: string;
  action: string;
  input: string;
  output: string;
  duration: number;
}> {
  const msg = userMessage.toLowerCase();
  const skillMap = new Map(skills.map(s => [s.id, s]));
  const available = (id: string) => skillMap.has(id);

  if (msg.includes('hello') || msg.includes('hi')) {
    const calls = [];
    if (available('rag')) calls.push({ skillId: 'rag', action: 'context_lookup', input: `query: "${userMessage}"`, output: 'Context loaded: user_preferences, history', duration: 120 });
    return calls;
  }

  if (msg.includes('what can you do') || msg.includes('capabilities')) {
    return [
      ...(available('rag') ? [{ skillId: 'rag', action: 'retrieve_capabilities', input: 'system.capabilities', output: `Found ${skills.length} capabilities`, duration: 85 }] : []),
    ];
  }

  if (msg.includes('search') || msg.includes('find') || msg.includes('look up')) {
    const calls = [];
    if (available('websearch')) calls.push({ skillId: 'websearch', action: 'web_search', input: `query: "${userMessage}"`, output: 'Retrieved 12 results (0.3s)', duration: 320 });
    if (available('rag')) calls.push({ skillId: 'rag', action: 'index_results', input: 'source: web_search_results', output: 'Indexed 12 documents', duration: 150 });
    if (available('cuml')) calls.push({ skillId: 'cuml', action: 'rank_relevance', input: 'model: semantic_similarity', output: 'Top 5 results ranked', duration: 90 });
    return calls;
  }

  if (msg.includes('optimize') || msg.includes('performance') || msg.includes('fast')) {
    const calls = [];
    if (available('cublas')) calls.push({ skillId: 'cublas', action: 'matrix_benchmark', input: 'dims: [4096, 4096]', output: '12.4 TFLOPS achieved', duration: 250 });
    if (available('tensorrt')) calls.push({ skillId: 'tensorrt', action: 'optimize_model', input: 'precision: FP16, batch: 32', output: 'Optimized: 3.2x speedup', duration: 480 });
    if (available('cuopt')) calls.push({ skillId: 'cuopt', action: 'solve_routing', input: 'constraints: latency < 10ms', output: 'Optimal path found (4 nodes)', duration: 180 });
    return calls;
  }

  if (msg.includes('code') || msg.includes('program') || msg.includes('write')) {
    const calls = [];
    if (available('codeinterpreter')) calls.push({ skillId: 'codeinterpreter', action: 'generate_code', input: `task: "${userMessage}"`, output: 'Generated 24 lines of Python', duration: 200 });
    if (available('tensorrt')) calls.push({ skillId: 'tensorrt', action: 'validate_syntax', input: 'language: python', output: 'Syntax valid ✓', duration: 45 });
    return calls;
  }

  if (msg.includes('image') || msg.includes('picture') || msg.includes('photo') || msg.includes('see')) {
    const calls = [];
    if (available('vision')) calls.push({ skillId: 'vision', action: 'analyze_image', input: 'model: NVLM-D-72B', output: 'Detected: 3 objects, 2 faces', duration: 380 });
    if (available('cudnn')) calls.push({ skillId: 'cudnn', action: 'conv_forward', input: 'layers: 72, batch: 1', output: 'Inference: 28ms', duration: 280 });
    return calls;
  }

  if (msg.includes('data') || msg.includes('database') || msg.includes('query')) {
    const calls = [];
    if (available('database')) calls.push({ skillId: 'database', action: 'execute_query', input: 'SELECT * FROM analysis', output: 'Returned 1,247 rows', duration: 65 });
    if (available('cugraph')) calls.push({ skillId: 'cugraph', action: 'graph_analytics', input: 'algo: PageRank, nodes: 1247', output: 'Top 10 nodes identified', duration: 140 });
    if (available('cuml')) calls.push({ skillId: 'cuml', action: 'cluster_analysis', input: 'method: DBSCAN, eps: 0.5', output: 'Found 5 clusters', duration: 170 });
    return calls;
  }

  if (msg.includes('file') || msg.includes('read') || msg.includes('open')) {
    const calls = [];
    if (available('fileio')) calls.push({ skillId: 'fileio', action: 'read_file', input: 'path: ./data/input.csv', output: 'Read 2.4MB (15,000 lines)', duration: 35 });
    return calls;
  }

  if (msg.includes('api') || msg.includes('connect') || msg.includes('service')) {
    const calls = [];
    if (available('api')) calls.push({ skillId: 'api', action: 'http_request', input: 'POST /api/v1/analyze', output: 'Status: 200 OK (142ms)', duration: 142 });
    return calls;
  }

  // Default: pick 2-3 random skills
  const shuffled = [...skills].sort(() => Math.random() - 0.5).slice(0, Math.min(3, skills.length));
  return shuffled.map(s => ({
    skillId: s.id,
    action: 'process_request',
    input: `query: "${userMessage.slice(0, 40)}..."`,
    output: 'Processing complete ✓',
    duration: Math.floor(80 + Math.random() * 300),
  }));
}

function getAgentResponse(userMessage: string, skills: Skill[]): string {
  const skillNames = skills.map(s => s.name).join(', ');
  const msg = userMessage.toLowerCase();

  if (msg.includes('hello') || msg.includes('hi')) {
    return `Hello! I'm your Deep Agent powered by ${skillNames}. How can I assist you today?`;
  }

  if (msg.includes('what can you do') || msg.includes('capabilities')) {
    return `I'm equipped with ${skills.length} powerful capabilities:\n\n${skills.map(s => `• **${s.name}**: ${s.description}`).join('\n')}\n\nWhat would you like me to help you with?`;
  }

  if (msg.includes('search') || msg.includes('find') || msg.includes('look up')) {
    return `I've searched the web and analyzed the results using GPU-accelerated ranking. Here are the most relevant findings based on your query.\n\nWould you like me to dive deeper into any of these results?`;
  }

  if (msg.includes('optimize') || msg.includes('performance') || msg.includes('fast')) {
    return `I've run performance benchmarks and optimization passes:\n\n• Matrix operations: 12.4 TFLOPS via cuBLAS\n• Model inference: 3.2x speedup with TensorRT FP16\n• Routing: Optimal path found in 180ms\n\nWould you like to optimize a specific workload?`;
  }

  if (msg.includes('code') || msg.includes('program') || msg.includes('write')) {
    return `I've generated the code using my Code Interpreter capability and validated it through TensorRT.\n\nThe code is ready for execution. Would you like me to run it or make any modifications?`;
  }

  if (msg.includes('image') || msg.includes('picture') || msg.includes('see')) {
    return `I've analyzed the image using NVLM-D-72B vision model:\n\n• Detected 3 objects with bounding boxes\n• Identified 2 faces with 98.7% confidence\n• Inference completed in 28ms on GPU\n\nWhat would you like to know about the image?`;
  }

  if (msg.includes('data') || msg.includes('database') || msg.includes('query')) {
    return `Query executed successfully! Here's what I found:\n\n• 1,247 records analyzed\n• 5 clusters identified via GPU-accelerated DBSCAN\n• Top 10 entities ranked by PageRank\n\nWant me to visualize the results or drill deeper?`;
  }

  return `I've processed your request using my ${skillNames} capabilities.\n\nThe analysis is complete. What would you like to explore next?`;
}

export function ChatSection({ isVisible, skills, onReset }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  const simulateToolCalls = useCallback((userMessage: string, onAllComplete: () => void) => {
    const sequence = getToolCallSequence(userMessage, skills);
    if (sequence.length === 0) {
      setTimeout(onAllComplete, 800);
      return;
    }

    const skillMap = new Map(skills.map(s => [s.id, s]));
    const newCallIds: string[] = [];
    let completed = 0;

    // Stagger tool calls
    sequence.forEach((call, i) => {
      const callId = `tc-${Date.now()}-${i}`;
      newCallIds.push(callId);
      const skill = skillMap.get(call.skillId);
      if (!skill) return;

      const delay = i * 400;

      // Add as pending
      setTimeout(() => {
        setToolCalls(prev => [...prev, {
          id: callId,
          skillId: call.skillId,
          skillName: skill.name,
          skillIcon: skill.icon,
          action: call.action,
          status: 'pending',
          startTime: new Date(),
          input: call.input,
        }]);
      }, delay);

      // Switch to running
      setTimeout(() => {
        setActiveToolId(call.skillId);
        setToolCalls(prev => prev.map(tc =>
          tc.id === callId ? { ...tc, status: 'running' as const } : tc
        ));
      }, delay + 100);

      // Complete
      setTimeout(() => {
        setToolCalls(prev => prev.map(tc =>
          tc.id === callId ? {
            ...tc,
            status: 'success' as const,
            endTime: new Date(),
            duration: call.duration,
            output: call.output,
          } : tc
        ));
        setActiveToolId(null);
        completed++;
        if (completed === sequence.length) {
          setTimeout(onAllComplete, 300);
        }
      }, delay + 100 + call.duration + 200);
    });
  }, [skills]);

  const handleSend = useCallback(() => {
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

    // Simulate tool calls then respond
    simulateToolCalls(currentInput, () => {
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: getAgentResponse(currentInput, skills),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
      setIsTyping(false);
    });
  }, [input, isTyping, skills, simulateToolCalls]);

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
                
                {/* Typing indicator */}
                <AnimatePresence>
                  {isTyping && (
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
                  Try: "Search for GPU optimization tips" · "Analyze my data" · "Write some code"
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
