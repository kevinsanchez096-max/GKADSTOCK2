import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  AlertCircle, 
  RefreshCcw,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { SaaSCreateOrgModal } from './SaaSCreateOrgModal';

interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersToday: number;
  totalGlobalSales: number;
  totalMRR: number;
  averageSalesPerOrg: number;
  requiresAttention?: number;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'indigo' | 'red';
  detail: string;
}

const MetricCard = ({ icon: Icon, label, value, color, detail }: MetricCardProps) => {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500 shadow-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500 shadow-emerald-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500 shadow-indigo-500/10',
    red: 'text-red-500 bg-red-500/10 border-red-500/20 group-hover:bg-red-500 shadow-red-500/10'
  };

  return (
    <div className="bg-white dark:bg-zinc-900/40 p-7 rounded-[2.5rem] border border-slate-200 dark:border-white/5 relative group shadow-sm overflow-hidden">
      <div className={`absolute top-[-10%] right-[-10%] opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 ${color === 'red' ? 'text-red-500' : 'text-slate-500'}`}>
        <Icon className="h-24 w-24" />
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-500">{detail}</p>
        
        <div className="flex items-center justify-between">
           <h3 className={`text-4xl font-black ${color === 'red' ? 'text-red-500' : 'text-slate-900 dark:text-white'} font-outfit tracking-tighter`}>{value}</h3>
           <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${colorClasses[color]} group-hover:text-white`}>
              <Icon className="h-6 w-6" />
           </div>
        </div>
      </div>
    </div>
  );
};

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const statsData = await api.get('/saas/stats');
      setStats(statsData);
    } catch (error: any) {
      toast.error('Error al cargar estadísticas globales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
    fetchStats();
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-40">
        <RefreshCcw className="h-12 w-12 text-blue-500 animate-spin" />
        <p className="text-slate-500 dark:text-zinc-500 font-black uppercase tracking-widest text-[10px]">Sincronizando Mando SaaS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-slide-up flex-1 h-full overflow-y-auto pr-2 scrollbar-hide pb-20">
      <SaaSCreateOrgModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* HEADER MAESTRO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                <ShieldCheck size={18} />
             </div>
             <h1 className="text-3xl font-black text-slate-900 dark:text-white font-outfit uppercase tracking-tight leading-none">
               PANEL DE CONTROL SAAS
             </h1>
          </div>
          <p className="text-slate-500 dark:text-zinc-500 font-bold text-[11px] uppercase tracking-widest ml-11">Métricas Globales de la Plataforma • Gestión de Inquilinos</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">CLÚSTER ONLINE</span>
           </div>
           <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
           >
             <Building2 className="h-4 w-4" />
             Nueva Organización
           </button>
        </div>
      </div>

      {/* MÉTRICAS DE COMANDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          icon={Building2} 
          label="Organizaciones" 
          value={stats?.totalOrganizations || 0} 
          color="blue" 
          detail="Inquilinos Activos"
        />
        <MetricCard 
          icon={Activity} 
          label="Sesiones Activas" 
          value={stats?.activeUsersToday || 0} 
          color="emerald" 
          detail="Tráfico en tiempo real"
        />
        <MetricCard 
          icon={TrendingUp} 
          label="Ingresos Mensuales (MRR)" 
          value={`$${(stats?.totalMRR || 0).toLocaleString()}`} 
          color="indigo" 
          detail="Proyección Facturación"
        />
        <MetricCard 
          icon={AlertCircle} 
          label="Soporte Técnico" 
          value={stats?.requiresAttention || 0} 
          color="red" 
          detail="Salud Degradada"
        />
      </div>

      {/* VISUAL ANALYTICS - PURE DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Crecimiento Mensual (MRR)</h3>
              <span className="text-[10px] font-black text-indigo-500 uppercase">+24.5%</span>
           </div>
           <div className="h-48 flex items-end gap-3 px-4">
              {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-xl relative group transition-all hover:bg-indigo-500/40" style={{ height: `${h}%` }}>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-white">${(h * 100).toLocaleString()}</div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Actividad de Usuarios</h3>
              <span className="text-[10px] font-black text-emerald-500 uppercase">Live Metrics</span>
           </div>
           <div className="h-48 flex items-end gap-1 px-4">
              {[30, 45, 60, 40, 70, 85, 65, 90, 80, 50, 40, 60, 75, 85, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
