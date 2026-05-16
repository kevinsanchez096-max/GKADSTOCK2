import React from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  ChevronRight,
  Zap,
  Globe,
  Lock,
  LayoutDashboard
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from './ui-components';

export const AdminWelcome = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuthStore();

  const getFormattedDate = () => {
    try {
      return format(new Date(), "EEEE, dd 'de' MMMM", { locale: es });
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  const protocols = [
    { 
      id: 'admin_organizations', 
      title: 'Infraestructura', 
      desc: 'Gestión de Nodos y Organizaciones', 
      icon: Building2, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      id: 'admin_users', 
      title: 'Seguridad Global', 
      desc: 'Control de Usuarios y Permisos', 
      icon: Users, 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10' 
    },
    { 
      id: 'admin_subscriptions', 
      title: 'Monetización', 
      desc: 'Planes y Ciclos de Facturación', 
      icon: CreditCard, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10' 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20 pt-10">
      
      {/* 1. HERO COMMAND SECTION */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-purple-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-card border border-border/50 rounded-[3rem] p-12 md:p-20 overflow-hidden">
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-brand-500/5 to-transparent pointer-events-none" />
          
          <div className="max-w-2xl space-y-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">Núcleo de Mando GKAD</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black text-foreground font-heading tracking-tighter leading-[0.9]">
                Protocolo <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Maestro</span> Activo.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-lg leading-relaxed">
                Bienvenido, <span className="text-foreground font-black">{profile?.full_name?.split(' ')[0]}</span>. El ecosistema global se encuentra bajo supervisión operativa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex items-center gap-3 px-6 py-3 bg-muted rounded-2xl border border-border">
                <Globe size={16} className="text-brand-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{getFormattedDate()}</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-muted rounded-2xl border border-border">
                <Lock size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Acceso Nivel 5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MISSION PROTOCOLS */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">Protocolos de Misión</h2>
          <div className="h-px flex-1 mx-8 bg-gradient-to-r from-border/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {protocols.map((protocol, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(protocol.id)}
              className="group relative p-10 bg-card border border-border/50 rounded-[2.5rem] text-left hover:border-brand-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-2"
            >
              <div className={`h-16 w-16 rounded-[1.5rem] ${protocol.bg} flex items-center justify-center ${protocol.color} mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <protocol.icon size={32} />
              </div>
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">{protocol.title}</h3>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest leading-relaxed opacity-60">{protocol.desc}</p>
              
              <div className="mt-8 flex items-center gap-2 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-black uppercase tracking-widest">Ejecutar</span>
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. ECOSYSTEM PULSE (SIMPLIFIED) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-10 border-border/50 bg-gradient-to-br from-card to-brand-500/5 flex items-center justify-between overflow-hidden relative">
          <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
            <Zap size={200} />
          </div>
          <div className="space-y-6 relative z-10">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-foreground">Estado del Ecosistema</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Sincronización en tiempo real con nodos globales</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="text-[11px] font-black uppercase text-foreground">Sistemas Operativos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand-500" />
                <span className="text-[11px] font-black uppercase text-foreground">Red de Datos Activa</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('admin_metrics')}
            className="h-14 px-8 rounded-2xl bg-brand-500 text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform flex items-center gap-3 shadow-2xl shadow-brand-500/20"
          >
            Ver Analíticas
            <LayoutDashboard size={16} />
          </button>
        </Card>

        <Card className="p-10 border-border/50 bg-muted/30 flex flex-col justify-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <ShieldCheck size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Seguridad de Infraestructura</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase">Cifrado de grado militar activo</p>
            </div>
            <div className="ml-auto text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Protegido</div>
          </div>
        </Card>
      </div>

    </div>
  );
};
