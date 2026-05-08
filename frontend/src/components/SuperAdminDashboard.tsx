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
  Filter
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
  Legend
} from 'recharts';

interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersToday: number;
  totalGlobalSales: number;
  totalMRR: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('Mes');

  const distributionData = [
    { name: 'Esencial', value: 400 },
    { name: 'Avanzado', value: 300 },
    { name: 'Emprendedor', value: 300 },
    { name: 'Premium', value: 200 },
  ];

  const growthData = [
    { name: 'Ene', mrr: 4000, churn: 400 },
    { name: 'Feb', mrr: 5000, churn: 300 },
    { name: 'Mar', mrr: 4800, churn: 500 },
    { name: 'Abr', mrr: 6000, churn: 200 },
    { name: 'May', mrr: 7500, churn: 100 },
  ];

  const fetchStats = async () => {
    setLoading(true);
    try {
      const statsData = await api.get('/saas/stats');
      setStats(statsData);
    } catch (error: any) {
      toast.error('Error al cargar analíticas profundas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <RefreshCcw className="h-10 w-10 text-brand-500 animate-spin"/>
        <p className="text-muted-foreground font-black uppercase tracking-widest text-[9px]">Sincronizando Nodo Central...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* 1. TECHNICAL HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-foreground font-heading tracking-tight uppercase italic">Data <span className="font-black text-brand-500 not-italic">Intelligence</span></h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.4em]">Auditando el Ecosistema Global SaaS</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl border border-border">
            {['Hoy', 'Semana', 'Mes', 'Año'].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeFilter === f ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-muted-foreground hover:bg-card'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" icon={Filter} className="h-10 rounded-xl border-border">Filtros Avanzados</Button>
        </div>
      </div>

      {/* 2. DEEP ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MRR & Churn Multi-Series */}
        <Card className="lg:col-span-2 p-10 space-y-10 border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Retención & Crecimiento</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Relación entre ingresos nuevos vs cancelaciones</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-brand-500"/><span className="text-[8px] font-black uppercase text-muted-foreground">MRR</span></div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500"/><span className="text-[8px] font-black uppercase text-muted-foreground">Churn</span></div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{backgroundColor: '#111', border: 'none', borderRadius: '12px'}} />
                <Line type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }} />
                <Line type="monotone" dataKey="churn" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Plan Distribution */}
        <Card className="p-10 border-border flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground mb-8">Mezcla de Planes</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-8">
            {distributionData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS[i]}}/>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{d.name}</span>
                </div>
                <span className="text-[10px] font-black text-foreground">{Math.round((d.value/1200)*100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3. PERFORMANCE TABLE */}
      <Card className="p-0 overflow-hidden border-border">
        <div className="p-8 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Top Organizations por Facturación</h3>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Ranking de rendimiento mensual</p>
          </div>
          <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-500">Exportar Dataset</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/10">
              <tr>
                {['Organización', 'Plan', 'Usuarios', 'MRR', 'Status', ''].map((h) => (
                  <th key={h} className="px-8 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { name: 'Frubana SAS', plan: 'Premium', users: 24, mrr: 145000, status: 'Active' },
                { name: 'Tienda La 80', plan: 'Emprendedor', users: 12, mrr: 95000, status: 'Active' },
                { name: 'Gkad Demo', plan: 'Avanzado', users: 5, mrr: 65000, status: 'Trialing' },
                { name: 'Distribuidora Norte', plan: 'Esencial', users: 2, mrr: 39000, status: 'Active' },
              ].map((org, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500 font-black text-[10px]">
                        {org.name[0]}
                      </div>
                      <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-[8px] font-black uppercase">{org.plan}</span>
                  </td>
                  <td className="px-8 py-6 text-[11px] font-bold text-muted-foreground">{org.users} <span className="text-[8px]">ACTIVE</span></td>
                  <td className="px-8 py-6 text-[11px] font-black text-foreground">${org.mrr.toLocaleString()}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${org.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}/>
                      <span className="text-[9px] font-black text-muted-foreground uppercase">{org.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 rounded-lg hover:bg-brand-500/10 text-muted-foreground hover:text-brand-500 transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
