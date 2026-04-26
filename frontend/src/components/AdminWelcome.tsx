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
      return format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es });
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-16 py-12 px-4"
    >
      {/* PREMIUM MINIMAL HEADER */}
      <div className="flex flex-col items-center text-center space-y-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "backOut" }}
          className="relative"
        >
          <div className="h-28 w-28 bg-gradient-to-br from-brand-500/20 to-brand-600/5 rounded-[3rem] flex items-center justify-center border-2 border-brand-500/20 shadow-2xl backdrop-blur-xl">
             <User className="h-12 w-12 text-brand-500" strokeWidth={2.5} />
          </div>
          <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 dark:border-white/10">
             <ShieldCheck className="h-5 w-5 text-emerald-500" strokeWidth={3} />
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white font-outfit uppercase tracking-tighter leading-none"
          >
            Hola, <span className="text-brand-500">{profile?.full_name?.split(' ')[0] || 'Administrador'}</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.5em] max-w-2xl mx-auto leading-relaxed"
          >
            Bienvenido al centro de mando global de <span className="text-slate-900 dark:text-white">GKAD STOCK</span>.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 px-8 py-4 bg-slate-50 dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm"
        >
           <Calendar className="h-5 w-5 text-brand-500" />
           <p className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
              {getFormattedDate()}
           </p>
        </motion.div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="grid md:grid-cols-2 gap-8 px-4">
        <QuickAction 
          title="Panel de Métricas" 
          desc="Analíticas globales y salud del SaaS" 
          icon={LayoutDashboard} 
          color="bg-brand-600" 
          delay={0.6}
          onClick={() => setActiveTab('admin_metrics')}
        />
        <QuickAction 
          title="Organizaciones" 
          desc="Gestión de inquilinos y empresas" 
          icon={Building2} 
          color="bg-blue-600" 
          delay={0.7}
          onClick={() => setActiveTab('admin_organizations')}
        />
        <QuickAction 
          title="Usuarios Globales" 
          desc="Auditoría y control de accesos" 
          icon={Users} 
          color="bg-orange-600" 
          delay={0.8}
          onClick={() => setActiveTab('admin_users')}
        />
        <QuickAction 
          title="Configuración SaaS" 
          desc="Ajustes de infraestructura y red" 
          icon={ShieldCheck} 
          color="bg-slate-700" 
          delay={0.9}
          onClick={() => setActiveTab('admin_settings')}
        />
      </div>

      {/* FOOTER STATUS */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.2 }}
        className="text-center pt-12"
      >
        <p className="text-[9px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.6em]">GKAD STOCK SYSTEM • MASTER COMMAND CENTER • v4.0</p>
      </motion.div>
    </motion.div>
  );
};
