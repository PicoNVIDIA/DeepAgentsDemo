import { useState, useCallback, useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { skills as allSkills, type Skill } from './data/skills';
import type { ModelDef } from './data/models';
import { SoulPicker } from './components/SoulPicker';
import { SkillPalette } from './components/SkillPalette';
import { AgentBuilder } from './components/AgentBuilder';
import { BuildButton } from './components/BuildButton';
import { BuildAnimation } from './components/BuildAnimation';
import { ParticleBackground } from './components/ParticleBackground';
import { ChatSection } from './components/ChatSection';
import { SkillCard } from './components/SkillCard';
import './App.css';

type Phase = 'soul' | 'builder' | 'chat';

function App() {
  const [phase, setPhase] = useState<Phase>('soul');
  const [selectedModel, setSelectedModel] = useState<ModelDef | null>(null);
  const [addedSkills, setAddedSkills] = useState<Skill[]>([]);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

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
  }, []);

  const handleBuild = useCallback(() => {
    if (addedSkills.length > 0) {
      setIsBuilding(true);
    }
  }, [addedSkills.length]);

  const handleBuildComplete = useCallback(() => {
    setIsBuilding(false);
    setPhase('chat');
  }, []);

  const handleReset = useCallback(() => {
    setAddedSkills([]);
    setIsBuilding(false);
    setPhase('soul');
    setSelectedModel(null);
  }, []);

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
          <div className="header-badge" style={selectedModel ? { borderColor: selectedModel.primaryColor, color: selectedModel.primaryColor, background: selectedModel.subtleColor } : undefined}>
            {selectedModel ? `${selectedModel.name} · GTC 2026` : 'GTC 2026 Demo'}
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

            {phase === 'builder' && (
              <motion.div
                key="builder"
                className="builder-view"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <SkillPalette addedSkillIds={addedSkillIds} />
                
                <div className="app-main">
                  <AgentBuilder 
                    skills={addedSkills}
                    isBuilding={isBuilding}
                    isReady={false}
                    onRemoveSkill={handleRemoveSkill}
                  />
                  
                  <BuildButton
                    disabled={addedSkills.length === 0}
                    isBuilding={isBuilding}
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
                  modelId={selectedModel?.id}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Build animation overlay */}
        <BuildAnimation 
          isActive={isBuilding}
          onComplete={handleBuildComplete}
        />

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
