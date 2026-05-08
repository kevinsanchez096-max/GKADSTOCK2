import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Clock, 
  Plus, 
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Card } from './ui-components';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

const activityData = [
  { name: 'Lun', users: 45 },
  { name: 'Mar', users: 52 },
  { name: 'Mie', users: 48 },
  { name: 'Jue', users: 61 },
  { name: 'Vie', users: 55 },
  { name: 'Sab', users: 42 },
  { name: 'Dom', users: 38 },
];

const recentLogs = [
  { id: 1, org: 'Frubana SAS', event: 'Nueva Organización', time: 'Hace 2h', type: 'new' },
  { id: 2, org: 'SuperAdmin', event: 'Cambio Plan Enterprise', time: 'Hace 4h', type: 'edit' },
  { id: 3, org: 'Gkad Admin', event: 'Inicio Sesión Seguro', time: 'Hace 5h', type: 'security' },
  { id: 4, org: 'Tienda La 80', event: 'Actualización Stock', time: 'Hace 8h', type: 'edit' },
];

export const AdminWelcome = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/saas/stats').then(setStats).catch(() => {});
  }, []);

  const getFormattedDate = () => {
    try {
      return format(new Date(), "EEEE, dd 'de' MMMM", { locale: es });
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* 1. COMPACT PREMIUM HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-500 font-black text-[10px] uppercase tracking-[0.4em]">
            <Sparkles size={14} /> Global Control Hub
          </div>
          <h1 className="text-5xl font-black text-foreground font-heading tracking-tighter">
            Hola, <span className="text-brand-500">{profile?.full_name?.split(' ')[0] || 'Ariosto'}</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} /> {getFormattedDate()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setActiveTab('admin_organizations')}
            icon={Plus} 
            className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-brand-600 shadow-xl shadow-brand-600/20 text-white border-none"
          >
            Añadir Inquilino
          </Button>
          <Button 
            variant="outline"
            icon={FileText} 
            className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-border"
          >
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* 2. CORE METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
            <Users size={64} />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Usuarios Activos</p>
          <h3 className="text-4xl font-black text-foreground font-outfit">{stats?.activeUsersToday || 124}</h3>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">+5.4%</span>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">vs ayer</span>
          </div>
        </Card>

        <Card className="p-8 border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
            <Building2 size={64} />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Licencias Pro</p>
          <h3 className="text-4xl font-black text-foreground font-outfit">{stats?.totalOrganizations || 42}</h3>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">3 Disponibles</span>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">En stock</span>
          </div>
        </Card>

        <Card className="p-8 border-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
            <TrendingUp size={64} />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Ingresos MRR</p>
          <h3 className="text-4xl font-black text-brand-500 font-outfit">
            ${((stats?.totalOrganizations || 42) * 95000).toLocaleString()}
          </h3>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">+12%</span>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Crecimiento mes</span>
          </div>
        </Card>
      </div>

      {/* 3. SYSTEM ACTIVITY & RECENT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 p-8 border-border space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Actividad del Sistema</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Usuarios concurrentes en los últimos 7 días</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-[9px] font-black text-muted-foreground uppercase tracking-widest border border-border">
              <Activity size={12} className="text-brand-500" /> Live Status
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#888', fontSize: 10, fontWeight: 'bold'}}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#111', border: 'none', borderRadius: '12px', fontSize: '10px'}}
                  itemStyle={{color: '#fff'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="rgb(59, 130, 246)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="p-8 border-border space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Log de Actividad</h3>
            <button 
              onClick={() => setActiveTab('admin_organizations')}
              className="text-[9px] font-bold text-brand-500 hover:underline"
            >
              Ver Todo
            </button>
          </div>

          <div className="space-y-6">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 group cursor-pointer">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                  log.type === 'new' ? 'bg-emerald-500/10 text-emerald-500' :
                  log.type === 'security' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-purple-500/10 text-purple-500'
                }`}>
                  <ShieldCheck size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-foreground uppercase truncate">{log.org}</p>
                  <p className="text-[9px] text-muted-foreground font-medium">{log.event}</p>
                </div>
                <div className="text-[8px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                  {log.time}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="p-4 bg-muted rounded-2xl border border-border flex items-center gap-4 group cursor-pointer hover:bg-card transition-all">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black text-foreground uppercase tracking-widest">Base de Datos: Saludable</p>
              <ChevronRight size={14} className="ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};
