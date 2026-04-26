import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  ChevronRight,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GlassCardProps {
  title: string;
  desc: string;
  icon: React.ElementType;
  onClick: () => void;
  isSolid: boolean;
}

const GlassCard = ({ title, desc, icon: Icon, onClick, isSolid }: GlassCardProps) => (
  <button 
    onClick={onClick}
    className={`
      group relative p-10 rounded-[2.5rem] text-left transition-all duration-700 hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50
      ${isSolid 
        ? 'bg-zinc-900 border-zinc-800 shadow-xl hover:bg-zinc-800' 
        : 'bg-white/[0.03] backdrop-blur-xl border-white/10 hover:bg-white/[0.07] hover:border-white/20'
      } border
    `}
  >
    {/* Background Glow */}
    <div className={`absolute inset-0 bg-gradient-to-br from-brand-600/0 to-brand-600/0 group-hover:from-brand-600/5 group-hover:to-transparent rounded-[2.5rem] transition-all duration-700`} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
         <div className="h-14 w-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:text-brand-400 group-hover:scale-110 transition-all duration-500 border border-brand-500/20 shadow-lg shadow-brand-500/5">
            <Icon size={28} strokeWidth={1.5} />
         </div>
         <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500">
            <ChevronRight className="text-white/40" size={18} />
         </div>
      </div>
      <h3 className="text-base font-bold text-white/90 uppercase tracking-[0.2em] mb-3 font-outfit">{title}</h3>
      <p className="text-[11px] text-white/40 font-medium leading-relaxed tracking-wide max-w-[200px]">{desc}</p>
    </div>
  </button>
);

export const AdminWelcome = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuthStore();
  const uiStyle = localStorage.getItem('admin_ui_style') || 'glass';
  const isSolid = uiStyle === 'solid';

  const getFormattedDate = () => {
    try {
      return format(new Date(), "EEEE, dd 'de' MMMM", { locale: es });
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-[80vh] flex flex-col justify-center space-y-20 animate-in fade-in zoom-in-95 duration-1000 px-6">
      
      {/* MINIMALIST HEADER */}
      <div className="text-center space-y-8">
        <div className="flex items-center justify-center gap-4 opacity-30">
           <div className="h-px w-8 bg-white" />
           <Sparkles size={12} className="text-brand-500" />
           <div className="h-px w-8 bg-white" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-white font-outfit tracking-tight">
            Hola, <span className="font-medium text-brand-500/90">{profile?.full_name?.split(' ')[0] || 'Ariosto'}</span>.
          </h1>
          <p className="text-sm md:text-base text-white/30 font-light tracking-[0.15em] uppercase">
            Bienvenido al centro de mando global.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/[0.02] border border-white/5 rounded-full text-white/20">
           <Calendar size={12} />
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">{getFormattedDate()}</span>
        </div>
      </div>

      {/* CENTERED QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <GlassCard 
          title="Analíticas" 
          desc="Monitor de rendimiento y KPIs financieros" 
          icon={LayoutDashboard}
          onClick={() => setActiveTab('admin_metrics')}
          isSolid={isSolid}
        />
        <GlassCard 
          title="Organizaciones" 
          desc="Gestión de inquilinos y control de licencias" 
          icon={Building2}
          onClick={() => setActiveTab('admin_organizations')}
          isSolid={isSolid}
        />
      </div>

      {/* SUBTLE FOOTER */}
      <div className="pt-10 flex flex-col items-center gap-4 border-t border-white/5 opacity-10">
         <p className="text-[7px] font-black uppercase tracking-[0.8em] text-white">GKAD STOCK • SISTEMA DE GESTIÓN MAESTRA</p>
         <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.8)]" />
            <span className="text-[7px] font-black text-white uppercase tracking-widest">Conexión Segura Establecida</span>
         </div>
      </div>
    </div>
  );
};
