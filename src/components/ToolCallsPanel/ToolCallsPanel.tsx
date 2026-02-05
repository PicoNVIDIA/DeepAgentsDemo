import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Skill } from '../../data/skills';
import './ToolCallsPanel.css';

export interface ToolCall {
  id: string;
  skillId: string;
  skillName: string;
  skillIcon: string;
  action: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: string;
  output?: string;
}

interface ToolCallsPanelProps {
  toolCalls: ToolCall[];
  skills: Skill[];
  activeToolId: string | null;
}

function getStatusColor(status: ToolCall['status']) {
  switch (status) {
    case 'pending': return 'var(--text-tertiary)';
    case 'running': return 'var(--nvidia-green)';
    case 'success': return 'var(--nvidia-green)';
    case 'error': return 'var(--r400)';
  }
}

function getStatusIcon(status: ToolCall['status']) {
  switch (status) {
    case 'pending': return '○';
    case 'running': return '◉';
    case 'success': return '✓';
    case 'error': return '✕';
  }
}

export function ToolCallsPanel({ toolCalls, skills, activeToolId }: ToolCallsPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [toolCalls]);

  return (
    <div className="tool-calls-panel">
      {/* Panel Header */}
      <div className="tool-panel-header">
        <div className="tool-panel-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v1H2V3zm0 4h12v1H2V7zm0 4h8v1H2v-1z"/>
          </svg>
          <span>Tool Calls</span>
        </div>
        <div className="tool-panel-count">
          {toolCalls.filter(t => t.status === 'success').length}/{toolCalls.length}
        </div>
      </div>

      {/* Skills inventory */}
      <div className="tool-skills-inventory">
        <div className="inventory-label">Available Tools</div>
        <div className="inventory-grid">
          {skills.map(skill => {
            const isActive = activeToolId === skill.id;
            const callCount = toolCalls.filter(t => t.skillId === skill.id && t.status === 'success').length;
            return (
              <motion.div
                key={skill.id}
                className={`inventory-item ${isActive ? 'active' : ''} ${callCount > 0 ? 'used' : ''}`}
                animate={isActive ? {
                  boxShadow: [
                    '0 0 0px rgba(118, 185, 0, 0)',
                    '0 0 20px rgba(118, 185, 0, 0.6)',
                    '0 0 0px rgba(118, 185, 0, 0)',
                  ],
                } : {}}
                transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
              >
                <span className="inventory-icon">{skill.icon}</span>
                <span className="inventory-name">{skill.name}</span>
                {callCount > 0 && (
                  <span className="inventory-count">{callCount}</span>
                )}
                {isActive && (
                  <motion.div
                    className="active-indicator"
                    layoutId="activeIndicator"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tool call log */}
      <div className="tool-call-log">
        <div className="log-label">Execution Log</div>
        <div className="log-entries">
          <AnimatePresence>
            {toolCalls.length === 0 && (
              <motion.div
                className="log-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="log-empty-icon">⚙️</span>
                <span>Tool calls will appear here</span>
              </motion.div>
            )}
            {toolCalls.map((call, index) => (
              <motion.div
                key={call.id}
                className={`log-entry ${call.status}`}
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <div className="log-entry-header">
                  <div className="log-entry-status" style={{ color: getStatusColor(call.status) }}>
                    {call.status === 'running' ? (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {getStatusIcon(call.status)}
                      </motion.span>
                    ) : (
                      getStatusIcon(call.status)
                    )}
                  </div>
                  <div className="log-entry-info">
                    <div className="log-entry-name">
                      <span className="log-entry-icon">{call.skillIcon}</span>
                      <span>{call.skillName}</span>
                    </div>
                    <div className="log-entry-action">{call.action}</div>
                  </div>
                  {call.duration !== undefined && (
                    <div className="log-entry-duration">{call.duration}ms</div>
                  )}
                </div>

                {/* Input/output preview */}
                {(call.input || call.output) && (
                  <div className="log-entry-details">
                    {call.input && (
                      <div className="log-detail">
                        <span className="log-detail-label">Input</span>
                        <code className="log-detail-value">{call.input}</code>
                      </div>
                    )}
                    {call.output && call.status === 'success' && (
                      <div className="log-detail">
                        <span className="log-detail-label">Output</span>
                        <code className="log-detail-value">{call.output}</code>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress bar for running */}
                {call.status === 'running' && (
                  <div className="log-entry-progress">
                    <motion.div
                      className="progress-bar"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.5, ease: 'linear' }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
