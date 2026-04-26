import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Zap, 
  BarChart3, 
  CreditCard,
  Check,
  X,
  Save,
  Info
} from 'lucide-react';
import { Button } from './ui-components';
import { toast } from 'sonner';

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  userLimit: number;
  features: {
    pos: boolean;
    inventory: boolean;
    expenses: boolean;
    reports: boolean;
  };
  color: string;
}

const initialPlans: PlanConfig[] = [
  {
    id: 'Esencial',
    name: 'Básico',
    price: 39000,
    userLimit: 1,
    features: { pos: true, inventory: true, expenses: false, reports: false },
    color: 'slate'
  },
  {
    id: 'Avanzado',
    name: 'Pro',
    price: 65000,
    userLimit: 3,
    features: { pos: true, inventory: true, expenses: true, reports: false },
    color: 'blue'
  },
  {
    id: 'Emprendedor',
    name: 'Enterprise',
    price: 95000,
    userLimit: 25,
    features: { pos: true, inventory: true, expenses: true, reports: true },
    color: 'purple'
  }
];

export const SubscriptionsManager = () => {
  const [plans, setPlans] = useState<PlanConfig[]>(initialPlans);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdatePrice = (id: string, newPrice: number) => {
    setPlans(plans.map(p => p.id === id ? { ...p, price: newPrice } : p));
  };

  const handleUpdateUsers = (id: string, newLimit: number) => {
    setPlans(plans.map(p => p.id === id ? { ...p, userLimit: newLimit } : p));
  };

  const toggleFeature = (planId: string, feature: keyof PlanConfig['features']) => {
    setPlans(plans.map(p => p.id === planId ? {
      ...p,
      features: { ...p.features, [feature]: !p.features[feature] }
    } : p));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Aquí se llamaría a un endpoint de configuración global en el backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Configuración de suscripciones actualizada');
    } catch (error) {
      toast.error('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-white font-outfit tracking-tight uppercase">Suscripciones <span className="font-black text-purple-500">&</span> Licencias</h1>
          <p className="text-white/20 font-bold text-[10px] uppercase tracking-[0.3em]">Matriz de Precios y Control de Capacidades</p>
        </div>
        <Button 
          onClick={handleSave}
          loading={isSaving}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-3 px-8 rounded-2xl h-14 font-black uppercase tracking-widest shadow-xl shadow-purple-900/20"
        >
          <Save size={18} /> Guardar Cambios
        </Button>
      </div>

      {/* PRICING MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 space-y-10 relative overflow-hidden group">
            {/* Plan Header */}
            <div className="space-y-4">
               <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                 plan.color === 'slate' ? 'bg-slate-500/10 text-slate-400' :
                 plan.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                 'bg-purple-500/10 text-purple-400'
               }`}>
                  <ShieldCheck size={28} />
               </div>
               <h3 className="text-2xl font-black text-white uppercase font-outfit tracking-tight">{plan.name}</h3>
               <div className="flex items-baseline gap-1">
                  <span className="text-white/20 text-sm font-bold">$</span>
                  <input 
                    type="number" 
                    value={plan.price}
                    onChange={(e) => handleUpdatePrice(plan.id, parseInt(e.target.value))}
                    className="bg-transparent text-3xl font-black text-white font-outfit outline-none w-32 border-b border-transparent focus:border-purple-500/50 transition-all"
                  />
                  <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">/ Mes</span>
               </div>
            </div>

            {/* Limits */}
            <div className="space-y-6 pt-6 border-t border-white/5">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white/40">
                     <Users size={16} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Límite Usuarios</span>
                  </div>
                  <input 
                    type="number" 
                    value={plan.userLimit}
                    onChange={(e) => handleUpdateUsers(plan.id, parseInt(e.target.value))}
                    className="bg-white/5 text-[11px] font-black text-white outline-none w-14 h-8 rounded-lg text-center border border-white/10"
                  />
               </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-4">
               <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Módulos Activos</p>
               
               <div className="space-y-3">
                  {[
                    { key: 'pos', label: 'Punto de Venta', icon: Zap },
                    { key: 'inventory', label: 'Inventario Maestro', icon: ShieldCheck },
                    { key: 'expenses', label: 'Gastos & Mermas', icon: CreditCard },
                    { key: 'reports', label: 'Reportes Pro', icon: BarChart3 },
                  ].map((feat) => {
                    const isActive = plan.features[feat.key as keyof PlanConfig['features']];
                    return (
                      <button 
                        key={feat.key}
                        onClick={() => toggleFeature(plan.id, feat.key as keyof PlanConfig['features'])}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isActive 
                          ? 'bg-purple-500/5 border-purple-500/20 text-white' 
                          : 'bg-white/[0.01] border-white/5 text-white/20'
                        }`}
                      >
                         <div className="flex items-center gap-3">
                            <feat.icon size={16} className={isActive ? 'text-purple-400' : 'text-white/10'} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{feat.label}</span>
                         </div>
                         {isActive ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-white/10" />}
                      </button>
                    );
                  })}
               </div>
            </div>

            {/* Subtle Overlay for Enterprise */}
            {plan.id === 'Emprendedor' && (
              <div className="absolute top-0 right-0 p-4">
                 <span className="bg-purple-500 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg">RECOMENDADO</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER INFO */}
      <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] flex items-center gap-6">
         <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Info size={24} />
         </div>
         <div className="space-y-1">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Nota de Arquitectura</h4>
            <p className="text-[11px] text-white/30 font-medium leading-relaxed">
               Cualquier cambio en esta matriz afectará de inmediato las validaciones de backend en el middleware <code>checkSubscriptionTier</code>.
               Asegúrese de comunicar cambios de precios con 30 días de antelación.
            </p>
         </div>
      </div>
    </div>
  );
};
