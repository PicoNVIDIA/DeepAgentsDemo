import { useState, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { skills as allSkills, type Skill } from './data/skills';
import { SkillPalette } from './components/SkillPalette';
import { AgentBuilder } from './components/AgentBuilder';
import { BuildButton } from './components/BuildButton';
import { BuildAnimation } from './components/BuildAnimation';
import { ParticleBackground } from './components/ParticleBackground';
import { SkillCard } from './components/SkillCard';
import './App.css';

function App() {
  const [addedSkills, setAddedSkills] = useState<Skill[]>([]);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const skill = allSkills.find(s => s.id === event.active.id);
    if (skill) {
      setActiveSkill(skill);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveSkill(null);
    
    const { active, over } = event;
    
    if (over?.id === 'agent-dropzone') {
      const skill = allSkills.find(s => s.id === active.id);
      if (skill && !addedSkills.find(s => s.id === skill.id)) {
        setAddedSkills(prev => [...prev, skill]);
        setIsReady(false); // Reset ready state when adding new skills
      }
    }
  }, [addedSkills]);

  const handleRemoveSkill = useCallback((skillId: string) => {
    setAddedSkills(prev => prev.filter(s => s.id !== skillId));
    setIsReady(false);
  }, []);

  const handleBuild = useCallback(() => {
    if (isReady) {
      // Reset everything
      setAddedSkills([]);
      setIsReady(false);
    } else if (addedSkills.length > 0) {
      setIsBuilding(true);
    }
  }, [addedSkills.length, isReady]);

  const handleBuildComplete = useCallback(() => {
    setIsBuilding(false);
    setIsReady(true);
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
          <div className="header-badge">GTC 2026 Demo</div>
        </motion.header>

        {/* Main content */}
        <div className="app-content">
          <SkillPalette addedSkillIds={addedSkillIds} />
          
          <div className="app-main">
            <AgentBuilder 
              skills={addedSkills}
              isBuilding={isBuilding}
              isReady={isReady}
              onRemoveSkill={handleRemoveSkill}
            />
            
            <BuildButton
              disabled={addedSkills.length === 0}
              isBuilding={isBuilding}
              isReady={isReady}
              onClick={handleBuild}
              skillCount={addedSkills.length}
            />
          </div>
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
