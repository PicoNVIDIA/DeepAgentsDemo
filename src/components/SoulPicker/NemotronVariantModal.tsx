import { motion, AnimatePresence } from 'framer-motion';
import { nemotronVariants, type NemotronVariant } from '../../data/models';
import './NemotronVariantModal.css';

interface NemotronVariantModalProps {
  isOpen: boolean;
  onSelect: (variant: NemotronVariant) => void;
  onClose: () => void;
}

export function NemotronVariantModal({ isOpen, onSelect, onClose }: NemotronVariantModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="variant-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Modal — use x/y style for centering so Framer doesn't override */}
          <motion.div
            className="variant-modal"
            style={{ x: '-50%', y: '-50%' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="variant-header">
              <div className="variant-nvidia-badge">NVIDIA</div>
              <h2 className="variant-title">Choose Your Nemotron</h2>
              <p className="variant-subtitle">Select a specialized variant for your agent</p>
            </div>

            <div className="variant-grid">
              {nemotronVariants.map((variant, i) => (
                <motion.div
                  key={variant.id}
                  className={`variant-card ${variant.available ? 'available' : 'coming-soon'}`}
                  style={{
                    '--variant-color': variant.color,
                    '--variant-glow': variant.glowColor,
                  } as React.CSSProperties}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 250, damping: 20 }}
                  onClick={() => variant.available && onSelect(variant)}
                  whileHover={variant.available ? { scale: 1.03 } : {}}
                  whileTap={variant.available ? { scale: 0.97 } : {}}
                >
                  {/* Coming soon ribbon */}
                  {!variant.available && (
                    <div className="variant-ribbon">Coming Soon</div>
                  )}

                  <div className="variant-card-icon">{variant.icon}</div>
                  <div className="variant-card-info">
                    <div className="variant-card-name">{variant.name}</div>
                    <div className="variant-card-type" style={{ color: variant.color }}>{variant.subtitle}</div>
                    <div className="variant-card-desc">{variant.description}</div>
                  </div>

                  {/* Glow border for available */}
                  {variant.available && (
                    <div className="variant-card-glow" />
                  )}
                </motion.div>
              ))}
            </div>

            <motion.button
              className="variant-close"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
