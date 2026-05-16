import React, { useState, useEffect } from 'react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-[#1e1e1e] rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-white transition-colors rounded-xl hover:bg-white/5"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="relative p-8 text-center space-y-6">
              {/* Icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                <ShieldAlert className="text-amber-500" size={36} />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  Límite del plan alcanzado
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  {message}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToPlans();
                  }}
                  className="w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Crown size={16} />
                  Ver planes y suscripciones
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full h-12 rounded-2xl border border-[#1e1e1e] text-zinc-500 font-bold text-xs uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
