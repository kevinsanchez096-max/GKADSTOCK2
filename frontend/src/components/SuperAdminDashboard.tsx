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
  PieChart as PieChartIcon,
  ArrowUpRight,
  ChevronRight,
  Filter,
  Plus,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Card, Button } from './ui-components';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersToday: number;
  totalGlobalSales: number;
  totalMRR: number;
  requiresAttention: number;
  averageSalesPerOrg: string;
}

interface SystemHealth {
  status: string;
  latency: string;
  database: string;
  timestamp: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

import { CreateOrganizationModal } from './CreateOrganizationModal';

export const SuperAdminDashboard = ({ setActiveTab }: { setActiveTab?: (tab: string) => void }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('Mes');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPlan, setFilterPlan] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [pulseFilter, setPulseFilter] = useState('Semana');
  const [pulseActivity, setPulseActivity] = useState<any[]>([]);
  const [pulseLoading, setPulseLoading] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, orgsData, healthData, logsData] = await Promise.all([
        api.get(`/saas/stats?range=${timeFilter}`),
        api.get('/saas/organizations'),
        api.get('/saas/health'),
        api.get('/saas/logs')
      ]);
      
      setStats(statsData);
      setOrganizations(Array.isArray(orgsData) ? orgsData : []);
      setHealth(healthData);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error: any) {
      toast.error('Error al sincronizar centro de control');
    } finally {
      setLoading(false);
    }
  };

  const fetchPulseData = async () => {
    setPulseLoading(true);
    try {
      const data = await api.get(`/saas/pulse-stats?range=${pulseFilter}`);
      setPulseActivity(data.activity || []);
    } catch (err) {
      console.error("Pulse fetch error", err);
    } finally {
      setPulseLoading(false);
    }
  };

  useEffect(() => {
    fetchPulseData();
  }, [pulseFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const filteredOrgs = Array.isArray(organizations) ? organizations.filter(org => {
    if (!org) return false;
    if (filterPlan === 'All') return true;
    return org.plan === filterPlan;
  }) : [];

  // Procesar datos reales para gráficos
  const distributionData = Array.isArray(organizations) ? organizations.reduce((acc: any[], org: any) => {
    if (!org) return acc;
    const planName = org.plan || 'Sin Plan';
    const existing = acc.find(p => p.name === planName);
    if (existing) existing.value += 1;
    else acc.push({ name: planName, value: 1 });
    return acc;
  }, []) : [];

  // Datos dinámicos para el gráfico basados en el filtro de tiempo
  const growthData = stats?.growthData || [];

  const topOrganizations = [...filteredOrgs]
    .sort((a, b) => (Number(b?.license_price) || 0) - (Number(a?.license_price) || 0))
    .slice(0, 10);

  const exportDataset = () => {
    toast.success('Preparando dataset para exportación...', {
      description: `Generando reporte de ${organizations.length} organizaciones.`
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <RefreshCcw className="h-10 w-10 text-brand-500 animate-spin"/>
        <p className="text-muted-foreground font-black uppercase tracking-widest text-[9px]">Sincronizando Nodo Central...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      
      {/* 1. MISSION CONTROL HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-card/30 p-8 rounded-[2rem] border border-border/50 backdrop-blur-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"/>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Sistema Operativo</span>
          </div>
          <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">Control <span className="text-brand-500">Maestro</span></h1>
          <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70">Monitor de Infraestructura y Negocios Globales</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
            {['Hoy', 'Semana', 'Mes', 'Año'].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  timeFilter === f ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/30' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            className="h-12 px-8 rounded-2xl bg-brand-500 text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform shadow-2xl shadow-brand-500/20"
          >
            Nuevo Nodo
          </Button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ingresos Mensuales', value: `$${(stats?.totalMRR || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-500/10' },
          { label: 'Nodos Corporativos', value: stats?.totalOrganizations || 0, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Usuarios Activos', value: stats?.activeUsersToday || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Atención Crítica', value: stats?.requiresAttention || 0, icon: ShieldCheck, color: stats?.requiresAttention ? 'text-rose-500' : 'text-muted-foreground', bg: stats?.requiresAttention ? 'bg-rose-500/10' : 'bg-muted/10' },
        ].map((kpi, i) => (
          <Card key={i} className="p-8 border-border/50 hover:border-brand-500/30 transition-all duration-500 group overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
              <kpi.icon size={64} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className={`h-12 w-12 rounded-2xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                <kpi.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
                <h4 className="text-3xl font-black text-foreground tracking-tighter">{kpi.value}</h4>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 3. CORE ANALYTICS & HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Growth Chart */}
        <Card className="lg:col-span-2 p-10 space-y-10 border-border/50 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-foreground">Crecimiento del Ecosistema</h3>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest opacity-60">Datos históricos reales de MRR y Bajas</p>
            </div>
            <div className="flex gap-6 bg-black/20 p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-brand-500"/><span className="text-[9px] font-black uppercase text-muted-foreground">Suscripciones</span></div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-rose-500"/><span className="text-[9px] font-black uppercase text-muted-foreground">Pérdidas</span></div>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '350px' }}>
            {chartReady && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 10, fontWeight: '900'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 10, fontWeight: '900'}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px'}} 
                    formatter={(value: any, name: string) => [
                      `$${Number(value).toLocaleString()}`, 
                      name
                    ]}
                  />
                  <Line name="Suscripciones" type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={5} dot={{ r: 8, fill: '#3b82f6', strokeWidth: 4, stroke: '#000' }} activeDot={{ r: 10, strokeWidth: 0 }} />
                  <Line name="Pérdidas" type="monotone" dataKey="churn" stroke="#ef4444" strokeWidth={3} strokeDasharray="8 8" dot={false} opacity={0.5} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Platform Health & Strategy */}
        <div className="space-y-8">
          <Card className="p-8 border-border/50 bg-black/40 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
              <Server size={120} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground mb-8">Estado de Plataforma</h3>
            <div className="space-y-6">
              {[
                { label: 'Servidor Central', value: health?.status === 'operational' ? 'Operativo' : 'Degradado', color: health?.status === 'operational' ? 'text-emerald-500' : 'text-rose-500' },
                { label: 'Latencia Global', value: health?.latency || '-- ms', color: 'text-brand-500' },
                { label: 'Base de Datos', value: health?.database === 'connected' ? 'En Línea' : 'Error', color: health?.database === 'connected' ? 'text-emerald-500' : 'text-rose-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                  <span className={`text-[11px] font-black uppercase ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground mb-8">Salud de Negocio Real</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Eficiencia Operativa</p>
                  <span className="text-brand-500 font-black text-xs">{stats?.businessHealth?.efficiency || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                    style={{ width: `${stats?.businessHealth?.efficiency || 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                <p className="text-[9px] text-muted-foreground leading-relaxed font-medium italic">
                  {stats?.businessHealth?.summary || "Calculando diagnóstico situacional del ecosistema..."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. PERFORMANCE TABLE */}
      <Card className="p-0 overflow-hidden border-border/50 bg-card/50">
        <div className="p-10 border-b border-border/50 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground leading-none">Ranking de Nodos</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Rendimiento por facturación y actividad</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest border-border hover:bg-brand-500 hover:text-white transition-all"
            onClick={exportDataset}
          >
            Generar Reporte Completo
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/20">
              <tr>
                {['Organización', 'Plan', 'Usuarios', 'Ingresos', 'Estado', ''].map((h) => (
                  <th key={h} className="px-10 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topOrganizations.map((org, i) => (
                <tr key={i} className="hover:bg-brand-500/5 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center text-brand-500 font-black text-sm border border-brand-500/20 group-hover:scale-110 transition-transform">
                        {org.name?.[0] || 'O'}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-foreground uppercase tracking-tight block">{org.name}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">ID: {org.id.slice(0,8)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="px-4 py-1.5 rounded-xl bg-purple-500/10 text-purple-500 text-[9px] font-black uppercase border border-purple-500/20">{org.plan}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground">{(org.adminCount || 0) + (org.vendedorCount || 0)}</span>
                      <p className="text-[8px] font-black text-muted-foreground uppercase">ACTIVOS</p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-xs font-black text-emerald-500">${Number(org.license_price || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2 w-2 rounded-full ${org.is_active ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}/>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${org.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>{org.is_active ? 'Activo' : 'Suspendido'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button 
                      onClick={() => setActiveTab?.('admin_organizations')}
                      className="p-3 rounded-2xl bg-muted/50 hover:bg-brand-500 text-muted-foreground hover:text-white transition-all duration-300"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {topOrganizations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-24 text-center">
                    <div className="space-y-4">
                      <Globe className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                      <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.3em]">No hay nodos globales detectados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* 5. SYSTEM ACTIVITY & AUDIT TRAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Real-time Activity Pulse */}
        <Card className="lg:col-span-2 p-10 space-y-10 border-border/50 bg-black/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground leading-none">Pulso de Actividad Real</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Tráfico global basado en accesos verificados</p>
            </div>
            
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
              {['Hoy', 'Semana', 'Mes', 'Año'].map((f) => (
                <button
                  key={f}
                  onClick={() => setPulseFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                    pulseFilter === f ? 'bg-brand-500 text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: '300px' }}>
            {chartReady && !pulseLoading ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pulseActivity.length > 0 ? pulseActivity : (stats?.dailyActivity || [])}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 10, fontWeight: '900'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '15px'}}
                    itemStyle={{color: '#8b5cf6'}}
                  />
                  <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center opacity-30 gap-4">
                <RefreshCcw className="h-8 w-8 animate-spin text-brand-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando flujo de datos específicos...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Strategic Audit Log */}
        <Card className="p-10 border-border/50 bg-card/30 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground leading-none">Auditoría</h3>
            <span className="text-[9px] font-black px-3 py-1 bg-muted rounded-full text-muted-foreground border border-border/50 uppercase">Reciente</span>
          </div>

          <div className="space-y-6">
            {logs.slice(0, 5).map((log, i) => (
              <div key={log.id || i} className="flex items-start gap-4 group">
                <div className="mt-1 h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-brand-500 group-hover:text-white transition-all">
                  <ShieldAlert size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-foreground uppercase truncate group-hover:text-brand-500 transition-colors">
                    {log.organization_name || 'Evento Global'}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium truncate leading-relaxed">
                    {log.action || 'Operación de Sistema'}
                  </p>
                  <p className="text-[8px] font-black text-muted-foreground/40 mt-1 uppercase">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Hace un momento'}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <FileText className="h-10 w-10 mx-auto mb-4" />
                <p className="text-[9px] font-black uppercase tracking-widest">Sin registros</p>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full text-[9px] font-black uppercase tracking-[0.2em] py-6 border-t border-border/50 rounded-none"
            onClick={() => setActiveTab?.('admin_organizations')}
          >
            Ver Bitácora Completa
          </Button>
        </Card>
      </div>

      <CreateOrganizationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};
