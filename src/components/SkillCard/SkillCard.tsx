import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { Skill } from '../../data/skills';
import './SkillCard.css';

interface SkillCardProps {
  skill: Skill;
  isInPalette?: boolean;
}

export function SkillCard({ skill, isInPalette = true }: SkillCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: skill.id,
    data: skill,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`skill-card ${isDragging ? 'dragging' : ''} ${isInPalette ? 'in-palette' : 'in-agent'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="skill-card-icon">{skill.icon}</div>
      <div className="skill-card-content">
        <h4 className="skill-card-name">{skill.name}</h4>
        {isInPalette && (
          <p className="skill-card-description">{skill.description}</p>
        )}
      </div>
      <div className="skill-card-category" data-category={skill.category}>
        {skill.category.toUpperCase()}
      </div>
      <div className="skill-card-glow" />
      <div className="skill-card-tooltip">{skill.description}</div>
    </motion.div>
  );
}
