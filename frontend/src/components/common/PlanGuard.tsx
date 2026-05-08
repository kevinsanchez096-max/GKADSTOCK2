import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Lock, ArrowUpCircle, X } from 'lucide-react';
import { Button } from '../ui-components';

interface PlanGuardProps {
 children: React.ReactNode;
 restrictedPlans: string[];
 moduleName: string;
}

export const PlanGuard = ({ children, restrictedPlans, moduleName }: PlanGuardProps) => {
 const { profile } = useAuthStore();
 const organization = profile?.organizations;
 const currentPlan = organization?.plan || 'Esencial';

 const isRestricted = restrictedPlans.includes(currentPlan);

 if (isRestricted) {
 return (
 <div className="relative h-full w-full min-h-[400px] flex items-center justify-center p-8">
 {/* BLUR BACKGROUND OF ACTUAL CONTENT (OPTIONAL) */}
 <div className="absolute inset-0 blur-xl opacity-20 pointer-events-none grayscale">
 {children}
 </div>

 {/* ELEGANT MODAL */}
 <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-[3rem] shadow-2xl p-12 text-center animate-in zoom-in-95 duration-500">
 <div className="h-20 w-20 bg-blue-600/10 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-600/20 shadow-xl shadow-blue-600/5">
 <Lock size={40} />
 </div>
 
 <h3 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tight mb-4">
 Módulo Bloqueado
 </h3>
 
 <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed mb-10">
 El módulo de <span className="text-blue-600 font-black">"{moduleName}"</span> no está disponible en el <span className="text-foreground font-black">Plan {currentPlan}</span>.
 </p>

 <div className="space-y-4">
 <div className="p-4 bg-blue-50 dark:bg-blue-600/5 rounded-2xl border border-blue-500/10">
 <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">
 ¡Sube a Plan Avanzado para desbloquearlo!
 </p>
 </div>

 <button 
 className="w-full h-16 bg-background text-foreground dark:text-black rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
 onClick={() => window.location.hash = '#/settings'} 
 >
 <ArrowUpCircle size={18} />
 Ver mi suscripción
 </button>
 </div>
 </div>
 </div>
 );
 }

 return <>{children}</>;
};
