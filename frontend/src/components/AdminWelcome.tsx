import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuickActionProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  onClick: () => void;
  color: string;
  delay: number;
}

const QuickAction = ({ icon: Icon, title, desc, onClick, color, delay }: QuickActionProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    onClick={onClick}
    className="group relative flex items-center p-8 bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-500/30 transition-all duration-500 overflow-hidden"
  >
    <div className={`absolute top-[-20%] right-[-10%] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700`}>
       <Icon size={180} />
    </div>
    
    <div className={`h-16 w-16 rounded-2xl ${color} flex items-center justify-center mr-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
      {Icon && <Icon className="text-white h-8 w-8" strokeWidth={2.5} />}
    </div>
    
    <div className="text-left flex-1 relative z-10">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2 group-hover:text-brand-500 transition-colors font-outfit">{title}</h3>
      <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-500 tracking-widest uppercase opacity-60 leading-relaxed">{desc}</p>
    </div>
    
    <div className="h-10 w-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-all duration-500 translate-x-2 group-hover:translate-x-0">
       <ChevronRight size={20} strokeWidth={3} />
    </div>
  </motion.button>
);

export const AdminWelcome = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuthStore();

  const getFormattedDate = () => {
    try {
      return format(new Date(), "EEEE, dd 'de' MMMM", { locale: es });
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  return (
    <div className="max-w-5xl mx-auto min-h-[70vh] flex flex-col justify-center space-y-16 animate-fade-in px-6">
      
      {/* SUBTLE LUXURY HEADER */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 opacity-50">
           <div className="h-px w-12 bg-white" />
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Central Command</p>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-light text-white/90 font-outfit tracking-tight">
            Hola, <span className="font-bold">{profile?.full_name?.split(' ')[0] || 'Administrador'}</span>.
          </h1>
          <p className="text-lg text-white/40 font-light tracking-wide">
            Bienvenido al núcleo de gestión global de la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-3 text-white/30">
           <Calendar size={14} />
           <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{getFormattedDate()}</span>
        </div>
      </div>

      {/* GLASSMORPHISM QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard 
          title="Ir a Analíticas" 
          desc="Monitor de métricas y rendimiento global" 
          icon={LayoutDashboard}
          onClick={() => setActiveTab('admin_metrics')}
        />
        <GlassCard 
          title="Ir a Organizaciones" 
          desc="Directorio maestro de clientes y planes" 
          icon={Building2}
          onClick={() => setActiveTab('admin_organizations')}
        />
      </div>

      {/* MINIMAL STATUS LINE */}
      <div className="pt-12 flex items-center justify-between border-t border-white/5 opacity-20">
         <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white">GKAD STOCK • ENCRYPTED NODE 01</p>
         <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest">System Operational</span>
         </div>
      </div>
    </div>
  );
};

const GlassCard = ({ title, desc, icon: Icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="group relative p-8 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[2rem] text-left transition-all duration-500 hover:bg-white/[0.07] hover:border-white/20 hover:-translate-y-1"
  >
    <div className="flex items-center justify-between mb-6">
       <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 group-hover:text-white transition-colors border border-white/10">
          <Icon size={24} strokeWidth={1.5} />
       </div>
       <ChevronRight className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
    </div>
    <h3 className="text-sm font-bold text-white/90 uppercase tracking-widest mb-2 font-outfit">{title}</h3>
    <p className="text-[11px] text-white/40 font-medium leading-relaxed tracking-wide">{desc}</p>
  </button>
);
