import { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  RefreshCcw,
  Search,
  Terminal,
  Activity,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { PlatformOrganizations } from './PlatformOrganizations';
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

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white font-outfit uppercase tracking-tight leading-none">
            SaaS Master Panel
          </h1>
          <p className="text-slate-500 dark:text-zinc-500 font-bold text-[11px] uppercase tracking-widest">Vista jerárquica de organizaciones y salud del ecosistema</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Building2 className="h-4 w-4" />
          Nueva Organización
        </button>
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

      {/* BUSCADOR Y LISTADO */}
      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Filtrar por nombre o ID de organización..."
            className="w-full h-16 pl-16 pr-8 bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          <PlatformOrganizations key={refreshKey} searchTerm={searchTerm} />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color, detail }: any) => (
  <div className="bg-white dark:bg-zinc-900/40 p-7 rounded-[2.5rem] border border-slate-200 dark:border-white/5 relative group shadow-sm overflow-hidden">
    <div className={`absolute top-[-10%] right-[-10%] opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-${color}-500`}>
      <Icon className="h-24 w-24" />
    </div>
    
    <div className="relative z-10">
      <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-500">{detail}</p>
      
      <div className="flex items-center justify-between">
         <h3 className={`text-4xl font-black ${color === 'red' ? 'text-red-500' : 'text-slate-900 dark:text-white'} font-outfit tracking-tighter`}>{value}</h3>
         <div className={`h-12 w-12 bg-${color}-500/10 rounded-2xl flex items-center justify-center text-${color}-500 border border-${color}-500/20 group-hover:bg-${color}-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-${color}-500/10`}>
            <Icon className="h-6 w-6" />
         </div>
      </div>
    </div>
  </div>
);
