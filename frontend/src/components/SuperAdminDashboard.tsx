import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  RefreshCcw,
  Activity,
  ShieldCheck,
  Zap,
  Globe,
  Server,
  CalendarDays
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersToday: number;
  totalGlobalSales: number;
  totalMRR: number;
  averageSalesPerOrg: number;
}

type TimeFilter = 'Hoy' | 'Semana' | 'Mes' | 'Año';

const MetricCard = ({ icon: Icon, label, value, detail, trend, isSolid }: { icon: any, label: string, value: string | number, detail: string, trend?: string, isSolid?: boolean }) => (
  <div className={`
    ${isSolid 
      ? 'bg-zinc-900 border-zinc-800 shadow-xl' 
      : 'bg-white/[0.02] border-white/5 backdrop-blur-xl'
    } border p-8 rounded-[2rem] relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.04]
  `}>
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
      <Icon size={80} />
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-light text-white font-outfit tracking-tighter">{value}</h3>
        {trend && <span className="text-[10px] font-bold text-emerald-500">{trend}</span>}
      </div>
      <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-2">{detail}</p>
    </div>
  </div>
);

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Mes');

  // Estilo de interfaz (Local Storage)
  const isSolid = localStorage.getItem('admin_ui_style') === 'solid';

  // Simulación de datos de MRR dinámicos según el filtro
  const getMRRData = () => {
    const baseData = [
      { month: 'Ene', value: 350000 },
      { month: 'Feb', value: 480000 },
      { month: 'Mar', value: 520000 },
      { month: 'Abr', value: 650000 },
      { month: 'May', value: 720000 },
      { month: 'Jun', value: 800000 },
    ];

    switch(timeFilter) {
      case 'Hoy': return baseData.slice(-1).map(d => ({ ...d, value: d.value / 30 }));
      case 'Semana': return baseData.slice(-1).map(d => ({ ...d, value: d.value / 4 }));
      case 'Año': return [
        { month: '2023', value: 4500000 },
        { month: '2024', value: 7800000 }
      ];
      default: return baseData;
    }
  };

  const mrrData = getMRRData();

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

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 pt-40">
        <RefreshCcw className="h-10 w-10 text-brand-500 animate-spin" />
        <p className="text-white/20 font-black uppercase tracking-widest text-[9px]">Calculando Proyecciones SaaS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* HEADER TÁCTICO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-white font-outfit tracking-tight uppercase">Analíticas <span className="font-black text-brand-500">Globales</span></h1>
          <p className="text-white/20 font-bold text-[10px] uppercase tracking-[0.3em]">Monitoreo de Salud Financiera y Operativa</p>
        </div>

        <div className="flex items-center gap-4 bg-white/[0.03] p-1 rounded-2xl border border-white/5 backdrop-blur-md">
           {(['Hoy', 'Semana', 'Mes', 'Año'] as TimeFilter[]).map((filter) => (
             <button
               key={filter}
               onClick={() => setTimeFilter(filter)}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                 timeFilter === filter 
                 ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                 : 'text-white/30 hover:text-white hover:bg-white/5'
               }`}
             >
               {filter}
             </button>
           ))}
        </div>
      </div>

      {/* MÉTRICAS DE ALTO NIVEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          icon={Building2} 
          label="Inquilinos" 
          value={stats?.totalOrganizations || 8} 
          detail="Organizaciones Activas"
          trend="+12%"
          isSolid={isSolid}
        />
        <MetricCard 
          icon={Activity} 
          label="Uso de Plataforma" 
          value={stats?.activeUsersToday || 14} 
          detail="Usuarios Hoy"
          trend="+5.2%"
          isSolid={isSolid}
        />
        <MetricCard 
          icon={TrendingUp} 
          label="MRR Proyectado" 
          value={`$${((stats?.totalOrganizations || 8) * 100000).toLocaleString()}`} 
          detail="Facturación Mensual"
          trend="+24%"
          isSolid={isSolid}
        />
        <MetricCard 
          icon={Zap} 
          label="Eficiencia" 
          value="98.4%" 
          detail="Conversión de Prueba"
          isSolid={isSolid}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICA DE MRR DINÁMICA */}
        <div className={`
          lg:col-span-2 border rounded-[2.5rem] p-10 space-y-10
          ${isSolid ? 'bg-zinc-900 border-zinc-800' : 'bg-white/[0.02] border-white/5 backdrop-blur-xl'}
        `}>
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/60">Crecimiento de Ingresos (MRR)</h3>
                <p className="text-[10px] text-white/20 font-medium">Basado en licencias activas y planes promedio</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[9px] font-black text-white/40 uppercase">Real</span>
                 </div>
              </div>
           </div>

           <div className="h-64 flex items-end justify-between gap-4 px-4 relative">
              <div className="absolute inset-0 flex flex-col justify-between opacity-5">
                 {[1,2,3,4].map(l => <div key={l} className="h-px bg-white w-full" />)}
              </div>

              {mrrData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group relative z-10">
                   <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-600 text-white text-[9px] font-black px-2 py-1 rounded shadow-xl">
                      ${Math.round(d.value).toLocaleString()}
                   </div>
                   <div 
                     className="w-full bg-gradient-to-t from-brand-600/20 to-brand-500 rounded-t-xl transition-all duration-700 hover:scale-x-105 hover:brightness-125" 
                     style={{ height: `${(d.value / Math.max(...mrrData.map(x => x.value)) * 100) || 5}%` }}
                   />
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{d.month}</span>
                </div>
              ))}
           </div>
        </div>

        {/* SAAS HEALTH MONITOR */}
        <div className={`
          border rounded-[2.5rem] p-10 flex flex-col justify-between
          ${isSolid ? 'bg-zinc-900 border-zinc-800' : 'bg-white/[0.02] border-white/5 backdrop-blur-xl'}
        `}>
           <div className="space-y-8">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/60">Health Monitor</h3>
              
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                       <Server className="text-emerald-500" size={18} />
                       <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Uptime</p>
                          <p className="text-[9px] text-white/30 font-bold">Infraestructura Global</p>
                       </div>
                    </div>
                    <span className="text-xs font-black text-emerald-500">99.9%</span>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                       <Globe className="text-blue-500" size={18} />
                       <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Nodos</p>
                          <p className="text-[9px] text-white/30 font-bold">AWS East Region</p>
                       </div>
                    </div>
                    <span className="text-xs font-black text-blue-500">12</span>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                       <ShieldCheck className="text-brand-500" size={18} />
                       <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Seguridad</p>
                          <p className="text-[9px] text-white/30 font-bold">Zero-Trust Active</p>
                       </div>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded-full font-black uppercase">Stable</span>
                 </div>
              </div>
           </div>

           <div className="pt-8">
              <div className="p-6 bg-brand-600 rounded-3xl shadow-xl shadow-brand-900/20 group cursor-pointer transition-all hover:scale-105 active:scale-95">
                 <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.3em] mb-1">Alertas Críticas</p>
                 <h4 className="text-lg font-black text-white flex items-center gap-2">
                    0 Incidentes <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                 </h4>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
