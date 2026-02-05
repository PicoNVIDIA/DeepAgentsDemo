import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Skill } from '../../data/skills';
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
}

const agentResponses = [
  "I'm analyzing your request using my CUDA-accelerated capabilities...",
  "Processing with optimized tensor operations via TensorRT...",
  "Leveraging cuML for advanced pattern recognition...",
  "Running parallel computations on GPU cores...",
  "Executing graph analytics with cuGraph...",
];

const getAgentResponse = (userMessage: string, skills: Skill[]): string => {
  const skillNames = skills.map(s => s.name).join(', ');
  const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
  
  if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
    return `Hello! I'm your Deep Agent powered by ${skillNames}. How can I assist you today?`;
  }
  
  if (userMessage.toLowerCase().includes('what can you do') || userMessage.toLowerCase().includes('capabilities')) {
    return `I'm equipped with ${skills.length} powerful capabilities:\n\n${skills.map(s => `• **${s.name}**: ${s.description}`).join('\n')}\n\nWhat would you like me to help you with?`;
  }
  
  if (userMessage.toLowerCase().includes('optimize') || userMessage.toLowerCase().includes('performance')) {
    return `${randomResponse}\n\nUsing my ${skillNames} capabilities, I can help optimize your workloads with GPU-accelerated computing. What specific task would you like to optimize?`;
  }
  
  return `${randomResponse}\n\nWith my ${skillNames} capabilities at your disposal, I'm ready to tackle complex computational challenges. How can I help you further?`;
};

export function ChatSection({ isVisible, skills, onReset }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      // Add initial greeting
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

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: getAgentResponse(input, skills),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
                transition={{ delay: index * 0.1 }}
              >
                <div className="message-avatar">
                  {message.role === 'agent' ? '🤖' : '👤'}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, (_, text) => text)}</p>
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
                onKeyPress={handleKeyPress}
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
              Try asking: "What can you do?" or "Help me optimize my workflow"
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
