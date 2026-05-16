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
 Plus,
 Trash2,
 Info
} from 'lucide-react';
import { Button, Input, Card } from './ui-components';
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
    name: 'Esencial',
    price: 39000,
    userLimit: 1,
    features: { pos: true, inventory: true, expenses: false, reports: false },
    color: 'slate'
  },
  {
    id: 'Avanzado',
    name: 'Avanzado',
    price: 65000,
    userLimit: 5,
    features: { pos: true, inventory: true, expenses: true, reports: false },
    color: 'blue'
  },
  {
    id: 'Emprendedor',
    name: 'Emprendedor',
    price: 95000,
    userLimit: 25,
    features: { pos: true, inventory: true, expenses: true, reports: true },
    color: 'purple'
  },
  {
    id: 'Premium',
    name: 'Premium',
    price: 145000,
    userLimit: 100,
    features: { pos: true, inventory: true, expenses: true, reports: true },
    color: 'amber'
  }
];

export const SubscriptionsManager = () => {
  const [plans, setPlans] = useState<PlanConfig[]>(initialPlans);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<PlanConfig>>({
    name: '',
    price: 0,
    userLimit: 1,
    features: { pos: true, inventory: false, expenses: false, reports: false },
    color: 'blue'
  });

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
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Configuración de suscripciones actualizada');
    } catch (error) {
      toast.error('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPlan = () => {
    if (!newPlan.name || !newPlan.price) {
      toast.error('Nombre y precio son obligatorios');
      return;
    }
    const plan: PlanConfig = {
      ...newPlan as PlanConfig,
      id: newPlan.name.replace(/\s+/g, '-'),
      features: newPlan.features as PlanConfig['features']
    };
    setPlans([...plans, plan]);
    setIsAddModalOpen(false);
    setNewPlan({
      name: '',
      price: 0,
      userLimit: 1,
      features: { pos: true, inventory: false, expenses: false, reports: false },
      color: 'blue'
    });
    toast.success('Nuevo plan añadido localmente');
  };

  const handleDeletePlan = (id: string) => {
    setPlans(plans.filter(p => p.id !== id));
    toast.info('Plan eliminado');
  };

 return (
 <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
 
  {/* HEADER */}
  <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
    {/* Decorative elements */}
    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"/>
    <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"/>

    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"/>
          <CreditCard size={18} className="text-purple-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500">Revenue Management</span>
        </div>
        <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
          Suscripciones <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">& Licencias</span>
        </h1>
        <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Matriz de precios y control de capacidades globales</p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Button 
          variant="outline"
          onClick={() => setIsAddModalOpen(true)}
          className="h-14 px-8 rounded-2xl border-border/50 hover:bg-muted font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <Plus size={18} className="mr-2" /> Añadir Nuevo Plan
        </Button>
        
        <Button 
          onClick={handleSave}
          loading={isSaving}
          className="h-14 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl shadow-purple-500/20 border-none"
        >
          <Save size={18} className="mr-2" /> Guardar Cambios
        </Button>
      </div>
    </div>
  </Card>
   

 {/* PRICING MATRIX */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
 {plans.map((plan) => (
 <div key={plan.id} className="bg-card border border-border rounded-[3rem] p-10 space-y-10 relative overflow-hidden group shadow-sm hover:shadow-lg transition-shadow">
 {/* Plan Header */}
 <div className="space-y-4">
  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
    plan.color === 'slate' ? 'bg-muted-foreground/10 text-muted-foreground' :
    plan.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
    plan.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
    'bg-purple-500/10 text-purple-400'
  }`}>
    <ShieldCheck size={28} />
  </div>
  <div className="flex items-start justify-between">
    <h3 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tight">{plan.name}</h3>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => {
        toast('¿Eliminar plan?', {
          description: `Esta acción borrará el plan ${plan.name} de la matriz.`,
          action: {
            label: 'Eliminar',
            onClick: () => handleDeletePlan(plan.id)
          },
          cancel: {
            label: 'Cancelar',
            onClick: () => {}
          }
        });
      }}
      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
      icon={Trash2}
    />

  </div>
 <div className="flex items-baseline gap-1">
 <span className="text-muted-foreground text-sm font-bold">$</span>
 <input 
 type="number"
 value={plan.price}
 onChange={(e) => handleUpdatePrice(plan.id, parseInt(e.target.value))}
 className="bg-transparent text-3xl font-black text-foreground font-outfit outline-none w-32 border-b border-transparent focus:border-purple-500/50 transition-all"
 />
 <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">/ Mes</span>
 </div>
 </div>

 {/* Limits */}
 <div className="space-y-6 pt-6 border-t border-border">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 text-muted-foreground">
 <Users size={16} />
 <span className="text-[10px] font-black uppercase tracking-widest">Límite Usuarios</span>
 </div>
 <input 
 type="number"
 value={plan.userLimit}
 onChange={(e) => handleUpdateUsers(plan.id, parseInt(e.target.value))}
 className="bg-muted text-[11px] font-black text-foreground outline-none w-14 h-8 rounded-lg text-center border border-border"
 />
 </div>
 </div>

 {/* Feature Toggles */}
 <div className="space-y-4">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6">Módulos Activos</p>
 
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
 ? 'bg-purple-500/10 border-purple-500/30 text-foreground' 
 : 'bg-muted border-border text-muted-foreground'
 }`}
 >
 <div className="flex items-center gap-3">
 <feat.icon size={16} className={isActive ? 'text-purple-500' : 'text-muted-foreground'} />
 <span className="text-[10px] font-bold uppercase tracking-widest">{feat.label}</span>
 </div>
 {isActive ? <Check size={14} className="text-emerald-500"/> : <X size={14} className="text-muted-foreground"/>}
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
 <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
 Cualquier cambio en esta matriz afectará de inmediato las validaciones de backend en el middleware <code>checkSubscriptionTier</code>.
 Asegúrese de comunicar cambios de precios con 30 días de antelación.
 </p>
 </div>
 </div>

  {/* MODAL PARA AÑADIR PLAN */}
  {isAddModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500 border border-border shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Nuevo Plan Comercial</h2>
          <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={24} /></button>
        </div>

        <div className="space-y-6">
          <Input 
            label="Nombre del Plan" 
            placeholder="Ej. Plan Empresarial"
            value={newPlan.name}
            onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-6">
            <Input 
              label="Precio Mensual" 
              type="number"
              value={newPlan.price || ''}
              onChange={(e) => setNewPlan({...newPlan, price: parseInt(e.target.value)})}
            />
            <Input 
              label="Límite Usuarios" 
              type="number"
              value={newPlan.userLimit || ''}
              onChange={(e) => setNewPlan({...newPlan, userLimit: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Color de Identidad</p>
            <div className="flex gap-3">
              {['slate', 'blue', 'purple', 'amber'].map(c => (
                <button 
                  key={c}
                  type="button"
                  onClick={() => setNewPlan({...newPlan, color: c})}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    newPlan.color === c ? 'border-foreground scale-110' : 'border-transparent'
                  } ${
                    c === 'slate' ? 'bg-slate-500' : 
                    c === 'blue' ? 'bg-blue-500' : 
                    c === 'purple' ? 'bg-purple-500' : 'bg-amber-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <Button onClick={handleAddPlan} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-purple-600 shadow-xl shadow-purple-600/20 text-white">
          Crear Plan de Suscripción
        </Button>
      </Card>
    </div>
  )}
  </div>
 );
};
