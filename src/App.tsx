import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { skills as allSkills, type Skill } from './data/skills';
import { models, type ModelDef } from './data/models';
import { createAgentSession, deleteAgentSession } from './api/agent';
import { useBlockyBits } from './hooks/useBlockyBits';
import { SoulPicker } from './components/SoulPicker';
import { SkillPalette } from './components/SkillPalette';
import { AgentBuilder } from './components/AgentBuilder';
import { BuildButton } from './components/BuildButton';
import { BuildAnimation } from './components/BuildAnimation';
import { ParticleBackground } from './components/ParticleBackground';
import { ChatSection } from './components/ChatSection';
import { SkillCard } from './components/SkillCard';
import './App.css';

type Phase = 'soul' | 'builder' | 'building' | 'chat';
type InputMode = 'website' | 'visual';

function App() {
  const [phase, setPhase] = useState<Phase>('soul');
  const [inputMode, setInputMode] = useState<InputMode>('website');
  const [selectedModel, setSelectedModel] = useState<ModelDef | null>(null);
  const [addedSkills, setAddedSkills] = useState<Skill[]>([]);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sandboxMap, setSandboxMap] = useState<Record<string, boolean>>({});
  const [sandboxMode, setSandboxMode] = useState(false);
  const [showSandboxInfo, setShowSandboxInfo] = useState(false);

  // Blocky Bits — only polls when visual mode is active
  const blocky = useBlockyBits(inputMode === 'visual' && (phase === 'soul' || phase === 'builder'));
  const prevBlockySkillsRef = useRef<string>('');
  const prevBlockyModelRef = useRef<string | null>(null);

  // Apply accent color CSS variables when model changes
  useEffect(() => {
    const root = document.documentElement;
    if (selectedModel) {
      root.style.setProperty('--accent-color', selectedModel.primaryColor);
      root.style.setProperty('--accent-light', selectedModel.accentColor);
      root.style.setProperty('--accent-glow', selectedModel.glowColor);
      root.style.setProperty('--accent-subtle', selectedModel.subtleColor);
    } else {
      root.style.setProperty('--accent-color', '#76B900');
      root.style.setProperty('--accent-light', '#8dc63f');
      root.style.setProperty('--accent-glow', 'rgba(118, 185, 0, 0.4)');
      root.style.setProperty('--accent-subtle', 'rgba(118, 185, 0, 0.1)');
    }
  }, [selectedModel]);

  // Blocky Bits: auto-select model from physical blocks
  useEffect(() => {
    if (!blocky.connected || phase !== 'soul') return;
    if (blocky.modelId && blocky.modelId !== prevBlockyModelRef.current) {
      prevBlockyModelRef.current = blocky.modelId;
      const model = models.find(m => m.id === blocky.modelId);
      if (model) {
        console.log('[BlockyBits] Auto-selecting model:', model.name);
        setSelectedModel(model);
        setPhase('builder');
      }
    }
  }, [blocky.connected, blocky.modelId, phase]);

  // Blocky Bits: auto-add/remove skills from physical blocks
  useEffect(() => {
    if (!blocky.connected || phase !== 'builder') return;
    const key = blocky.skillIds.sort().join(',');
    if (key === prevBlockySkillsRef.current) return;
    prevBlockySkillsRef.current = key;

    console.log('[BlockyBits] Syncing skills:', blocky.skillIds);

    // Add skills that are in blocky but not in addedSkills
    setAddedSkills(prev => {
      const currentIds = new Set(prev.map(s => s.id));
      const blockyIds = new Set(blocky.skillIds);
      
      // Keep manually added skills + add new blocky skills
      let updated = [...prev];
      
      // Add new blocky skills
      for (const id of blocky.skillIds) {
        if (!currentIds.has(id)) {
          const skill = allSkills.find(s => s.id === id);
          if (skill) updated.push(skill);
        }
      }

      // Remove skills that were added by blocky but are no longer detected
      // (only remove if the skill ID is in our SKILL_BLOCK_MAP — don't remove manually dragged ones)
      updated = updated.filter(s => {
        // Keep if it's still detected by blocky
        if (blockyIds.has(s.id)) return true;
        // Keep if it was manually added (not a blocky-mappable skill)
        // For simplicity, keep all — only add, don't auto-remove
        return true;
      });

      return updated;
    });
  }, [blocky.connected, blocky.skillIds, phase]);

  const handleSoulSelect = useCallback((model: ModelDef) => {
    setSelectedModel(model);
    setPhase('builder');
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const skill = allSkills.find(s => s.id === event.active.id);
    if (skill) setActiveSkill(skill);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveSkill(null);
    const { active, over } = event;
    if (over?.id === 'agent-dropzone') {
      const skill = allSkills.find(s => s.id === active.id);
      if (skill && !addedSkills.find(s => s.id === skill.id)) {
        setAddedSkills(prev => [...prev, skill]);
      }
    }
  }, [addedSkills]);

  const handleRemoveSkill = useCallback((skillId: string) => {
    setAddedSkills(prev => prev.filter(s => s.id !== skillId));
    setSandboxMap(prev => { const next = { ...prev }; delete next[skillId]; return next; });
  }, []);

  const handleToggleSandboxMode = useCallback(() => {
    if (!sandboxMode) {
      // Turning ON — show info popup
      setShowSandboxInfo(true);
    } else {
      // Turning OFF — disable all sandboxes
      setSandboxMode(false);
      setSandboxMap({});
    }
  }, [sandboxMode]);

  const handleConfirmSandboxMode = useCallback(() => {
    setSandboxMode(true);
    setShowSandboxInfo(false);
    // Auto-sandbox all sandboxable tools that are already added
    const newMap: Record<string, boolean> = {};
    addedSkills.forEach(s => { if (s.sandboxable) newMap[s.id] = true; });
    setSandboxMap(newMap);
  }, [addedSkills]);

  const handleBuild = useCallback(() => {
    if (addedSkills.length > 0 && selectedModel) {
      setPhase('building');
    }
  }, [addedSkills.length, selectedModel]);

  const handleBuildComplete = useCallback(async () => {
    if (!selectedModel) {
      console.error('[App] No model selected');
      return;
    }

    try {
      const skillIds = addedSkills.map(s => s.id);
      console.log('[App] Creating agent session:', selectedModel.id, skillIds);
      const id = await createAgentSession(selectedModel.id, skillIds, true, sandboxMap);
      console.log('[App] Session created:', id);
      setSessionId(id);
      setPhase('chat');
    } catch (err) {
      console.error('[App] Failed to create agent session:', err);
      setPhase('chat');
    }
  }, [selectedModel, addedSkills]);

  const handleReset = useCallback(() => {
    if (sessionId) {
      deleteAgentSession(sessionId);
    }
    setSessionId(null);
    setAddedSkills([]);
    setSandboxMap({});
    setSandboxMode(false);
    setPhase('soul');
    setSelectedModel(null);
    prevBlockySkillsRef.current = '';
    prevBlockyModelRef.current = null;
  }, [sessionId]);

  // Reset when switching modes
  const handleModeSwitch = useCallback((mode: InputMode) => {
    if (mode === inputMode) return;
    if (sessionId) deleteAgentSession(sessionId);
    setInputMode(mode);
    setSessionId(null);
    setAddedSkills([]);
    setSandboxMap({});
    setSandboxMode(false);
    setPhase('soul');
    setSelectedModel(null);
    prevBlockySkillsRef.current = '';
    prevBlockyModelRef.current = null;
  }, [inputMode, sessionId]);

  const addedSkillIds = addedSkills.map(s => s.id);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app">
        <ParticleBackground />
        
        {/* Header */}
        <motion.header 
          className="app-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-logo">
            <svg className="nvidia-logo" viewBox="0 0 100 20" fill="currentColor">
              <text x="0" y="16" fontSize="16" fontWeight="bold" fontFamily="system-ui">NVIDIA</text>
            </svg>
            <span className="header-divider">|</span>
            <span className="header-title">Deep Agent Builder</span>
          </div>
          <div className="header-right">
            {/* Mode toggle — only on soul picker screen */}
            {phase === 'soul' && (
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${inputMode === 'website' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('website')}
                >
                  🖱️ Website
                </button>
                <button
                  className={`mode-btn ${inputMode === 'visual' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('visual')}
                >
                  🧊 Visual
                </button>
              </div>
            )}
            {inputMode === 'visual' && (
              <div className={`blocky-indicator ${blocky.connected ? 'connected' : 'disconnected'}`}>
                <span className="blocky-dot" />
                <span>{blocky.connected ? 'Blocks Connected' : 'Waiting for Blocks...'}</span>
              </div>
            )}
            {/* Sandbox mode toggle — show on builder + chat */}
            {(phase === 'builder' || phase === 'building' || phase === 'chat') && (
              <button
                className={`sandbox-mode-btn ${sandboxMode ? 'on' : 'off'}`}
                onClick={handleToggleSandboxMode}
              >
                {sandboxMode ? '🔒 Sandbox On' : '⚠️ Sandbox Off'}
              </button>
            )}
            <div className="header-badge" style={selectedModel ? { borderColor: selectedModel.primaryColor, color: selectedModel.primaryColor, background: selectedModel.subtleColor } : undefined}>
              {selectedModel ? `${selectedModel.name} · GTC 2026` : 'GTC 2026 Demo'}
            </div>
          </div>
        </motion.header>

        {/* Main content */}
        <div className="app-content">
          <AnimatePresence mode="wait">
            {phase === 'soul' && (
              <motion.div
                key="soul"
                className="soul-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <SoulPicker onSelect={handleSoulSelect} />
              </motion.div>
            )}

            {(phase === 'builder' || phase === 'building') && (
              <motion.div
                key="builder"
                className="builder-view"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <SkillPalette addedSkillIds={addedSkillIds} selectedModel={selectedModel} />
                
                <div className="app-main">
                  <AgentBuilder 
                    skills={addedSkills}
                    isBuilding={phase === 'building'}
                    isReady={false}
                    onRemoveSkill={handleRemoveSkill}
                    sandboxMap={sandboxMap}
                  />
                  
                  <BuildButton
                    disabled={addedSkills.length === 0}
                    isBuilding={phase === 'building'}
                    isReady={false}
                    onClick={handleBuild}
                    skillCount={addedSkills.length}
                  />
                </div>
              </motion.div>
            )}

            {phase === 'chat' && (
              <motion.div
                key="chat"
                className="chat-view"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <ChatSection 
                  isVisible={phase === 'chat'}
                  skills={addedSkills}
                  onReset={handleReset}
                  sessionId={sessionId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Build animation overlay */}
        <BuildAnimation 
          isActive={phase === 'building'}
          onComplete={handleBuildComplete}
        />

        {/* Sandbox info modal */}
        <AnimatePresence>
          {showSandboxInfo && (
            <>
              <motion.div
                className="sandbox-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSandboxInfo(false)}
              />
              <motion.div
                className="sandbox-info-modal"
                style={{ x: '-50%', y: '-50%' }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="sandbox-info-icon">🔒</div>
                <h2 className="sandbox-info-title">Enable Sandbox Mode?</h2>
                <p className="sandbox-info-desc">
                  Sandbox mode runs your agent's tools inside an <strong>isolated Docker container</strong> powered by <a href="https://www.daytona.io/" target="_blank" rel="noreferrer">Daytona</a>.
                </p>
                <div className="sandbox-info-benefits">
                  <div className="sandbox-benefit">
                    <span className="benefit-icon">🛡️</span>
                    <div>
                      <strong>Isolated Execution</strong>
                      <p>File writes, shell commands, and code run in a sandboxed container — not on your machine.</p>
                    </div>
                  </div>
                  <div className="sandbox-benefit">
                    <span className="benefit-icon">🔐</span>
                    <div>
                      <strong>Credential Protection</strong>
                      <p>API keys and local files stay outside the sandbox. The agent can't access your host system.</p>
                    </div>
                  </div>
                  <div className="sandbox-benefit">
                    <span className="benefit-icon">🧹</span>
                    <div>
                      <strong>Clean Slate</strong>
                      <p>Each session gets a fresh container. No leftover files or state from previous runs.</p>
                    </div>
                  </div>
                </div>
                <p className="sandbox-info-note">
                  Requires Docker running locally + Daytona server. Without it, tools fall back to local execution.
                </p>
                <div className="sandbox-info-buttons">
                  <button className="sandbox-confirm" onClick={handleConfirmSandboxMode}>
                    🔒 Enable Sandbox Mode
                  </button>
                  <button className="sandbox-cancel" onClick={() => setShowSandboxInfo(false)}>
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <DragOverlay>
          {activeSkill && (
            <div className="drag-overlay-card">
              <SkillCard skill={activeSkill} isInPalette={false} />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default App;
