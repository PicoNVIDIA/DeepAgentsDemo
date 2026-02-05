import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import './BuildAnimation.css';

interface BuildAnimationProps {
  isActive: boolean;
  onComplete: () => void;
}

export function BuildAnimation({ isActive, onComplete }: BuildAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'charging' | 'burst' | 'complete'>('idle');

  useEffect(() => {
    if (isActive) {
      setPhase('charging');
      
      const burstTimer = setTimeout(() => {
        setPhase('burst');
      }, 1500);

      const completeTimer = setTimeout(() => {
        setPhase('complete');
        onComplete();
      }, 2500);

      return () => {
        clearTimeout(burstTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setPhase('idle');
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="build-animation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Radial energy lines */}
          <div className="energy-lines">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="energy-line"
                style={{
                  transform: `rotate(${i * 30}deg)`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={phase === 'charging' || phase === 'burst' ? {
                  scaleY: [0, 1, 0],
                  opacity: [0, 1, 0],
                } : {}}
                transition={{
                  duration: 1.5,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Central burst */}
          <AnimatePresence>
            {phase === 'burst' && (
              <motion.div
                className="central-burst"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* Particle explosion */}
          <AnimatePresence>
            {phase === 'burst' && (
              <div className="particle-explosion">
                {[...Array(24)].map((_, i) => {
                  const angle = (i / 24) * Math.PI * 2;
                  const distance = 200 + Math.random() * 100;
                  return (
                    <motion.div
                      key={i}
                      className="explosion-particle"
                      initial={{ 
                        x: 0, 
                        y: 0, 
                        scale: 1,
                        opacity: 1,
                      }}
                      animate={{
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance,
                        scale: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.8,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Screen flash */}
          <AnimatePresence>
            {phase === 'burst' && (
              <motion.div
                className="screen-flash"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>

          {/* Progress ring */}
          <svg className="progress-ring" viewBox="0 0 100 100">
            <circle
              className="progress-ring-bg"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="2"
            />
            <motion.circle
              className="progress-ring-fill"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={phase !== 'idle' ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              style={{
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
              }}
            />
          </svg>

          {/* Status text */}
          <motion.div
            className="build-status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {phase === 'charging' && 'Initializing neural pathways...'}
            {phase === 'burst' && 'Activating skills...'}
            {phase === 'complete' && 'Agent Ready!'}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
