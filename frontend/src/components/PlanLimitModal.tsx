import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Crown, X } from 'lucide-react';

// ── Global Event System for Plan Limit Modals ────────────────────────────
const PLAN_LIMIT_EVENT = 'gkad:plan-limit-reached';

export function triggerPlanLimitModal(message?: string) {
  window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail: { message } }));
}

interface PlanLimitModalProps {
  onNavigateToPlans: () => void;
}

export const PlanLimitModal: React.FC<PlanLimitModalProps> = ({ onNavigateToPlans }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setMessage(e.detail?.message || 'Has alcanzado el límite de tu plan. Actualiza tu suscripción para continuar.');
      setIsOpen(true);
    };
    window.addEventListener(PLAN_LIMIT_EVENT, handler as EventListener);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, handler as EventListener);
  }, []);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)'
          }}
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-card border border-border rounded-[3rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Modal Header */}
            <div 
              style={{
                padding: '40px',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 95%)'
              }}
              className="relative shrink-0 text-center flex flex-col items-center justify-center gap-4"
            >
              <div 
                style={{ 
                  padding: '16px',
                  backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 90%)', 
                  borderRadius: '9999px', 
                  color: 'var(--brand-primary)', 
                  border: '2px solid var(--border)',
                  boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--brand-primary), transparent 80%)'
                }}
                className="flex items-center justify-center animate-pulse"
              >
                <ShieldAlert className="h-8 w-8"/>
              </div>
              <div>
                <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tight margin: 0">
                  LÍMITE DEL PLAN <span style={{ color: 'var(--brand-primary)' }}>ALCANZADO</span>
                </h3>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: '4px 0 0' }}>
                  Protocolo de Suscripción
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-8 top-8 p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all"
              >
                <X className="h-5 w-5"/>
              </button>
            </div>

            {/* Content */}
            <div className="relative p-10 text-center space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {message}
              </p>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToPlans();
                  }}
                  className="w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  <Crown size={16} />
                  Ver planes y suscripciones
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-foreground hover:bg-muted transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
