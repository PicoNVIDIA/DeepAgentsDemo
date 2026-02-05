import { motion } from 'framer-motion';
import { skills, skillCategories, type SkillCategory } from '../../data/skills';
import { SkillCard } from '../SkillCard';
import './SkillPalette.css';

interface SkillPaletteProps {
  addedSkillIds: string[];
}

export function SkillPalette({ addedSkillIds }: SkillPaletteProps) {
  const availableSkills = skills.filter(skill => !addedSkillIds.includes(skill.id));
  
  const groupedSkills = availableSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<SkillCategory, typeof skills>);

  const categories = Object.keys(skillCategories) as SkillCategory[];

  return (
    <motion.aside 
      className="skill-palette"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="skill-palette-header">
        <h2 className="skill-palette-title">Skills</h2>
        <p className="skill-palette-subtitle">Drag to add capabilities</p>
      </div>
      
      <div className="skill-palette-content">
        {categories.map((category, categoryIndex) => {
          const categorySkills = groupedSkills[category] || [];
          if (categorySkills.length === 0) return null;
          
          return (
            <motion.div 
              key={category} 
              className="skill-category"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 + 0.2 }}
            >
              <div className="skill-category-header">
                <h3 className="skill-category-name">{skillCategories[category].name}</h3>
                <span className="skill-category-count">{categorySkills.length}</span>
              </div>
              <div className="skill-category-list">
                {categorySkills.map((skill, index) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: categoryIndex * 0.1 + index * 0.05 + 0.3 }}
                  >
                    <SkillCard skill={skill} isInPalette />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
        
        {availableSkills.length === 0 && (
          <motion.div 
            className="skill-palette-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>All skills added!</p>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
