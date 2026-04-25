import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Layers,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card } from './ui-components';
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useShopStore } from '../store/useShopStore';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { PlanGuard } from './common/PlanGuard';

// Helper para formatear fechas en la gráfica de forma elegante
const formatChartDate = (dateStr: string, range: string) => {
  const date = new Date(dateStr);
  if (range === 'day') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (range === 'week') return date.toLocaleDateString([], { weekday: 'short' });
  if (range === 'month') return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  return date.toLocaleDateString([], { month: 'short' });
};

type FilterRange = 'day' | 'week' | 'month' | 'year' | 'all';

export const Dashboard = () => {
  const { profile } = useAuthStore();
  const [timeFilter, setTimeFilter] = useState<FilterRange>('month');
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Base (Fallback)
  const [baseStats, setBaseStats] = useState({
    totalProducts: 0,
    inventoryValue: 0,
    activeCategories: 0,
    lowStockCount: 0
  });

  // CARGA DE DATOS MAESTRA (Históricos + Stats Base)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.organization_id) return;
      setLoading(true);
      try {
        const [statsData, rankingData, salesData, expensesData] = await Promise.all([
          api.get(`/dashboard/stats?organization_id=${profile.organization_id}`),
          api.get(`/dashboard/ranking?organization_id=${profile.organization_id}`),
          api.get('/sales/history'),
          api.get('/expenses')
        ]);
        
        setBaseStats({
          totalProducts: statsData.totalProducts,
          inventoryValue: statsData.inventoryValue,
          activeCategories: statsData.activeCategories,
          lowStockCount: statsData.lowStockCount
        });
        
        setRanking(rankingData);
        setSales(salesData);
        setExpenses(expensesData);
        
      } catch (error) {
        console.error('Error cargando ecosistema analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // AISLAMIENTO REALTIME STRICTO: Solo escuchar ventas de ESTE organization_id
    const channel = supabase
      .channel('custom-dashboard-sales')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sales', 
          filter: `organization_id=eq.${profile.organization_id}` 
        },
        (payload) => {
          // Double-check de seguridad
          if (payload.new && payload.new.organization_id === profile.organization_id) {
            console.log('[Dashboard] Nueva venta local detectada, actualizando stats...');
            fetchDashboardData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id]); 

  // MOTOR DE ANALYTICS REACTIVO (Filtrado en Frontend)
  const analytics = useMemo(() => {
    const now = new Date();
    const startRange = new Date();

    if (timeFilter === 'day') startRange.setHours(0, 0, 0, 0);
    else if (timeFilter === 'week') startRange.setDate(now.getDate() - 7);
    else if (timeFilter === 'month') startRange.setMonth(now.getMonth() - 1);
    else if (timeFilter === 'year') startRange.setFullYear(now.getFullYear() - 1);
    else startRange.setFullYear(2000); // All time

    // Filtrar Arreglos
    const filteredSales = sales.filter(s => new Date(s.created_at) >= startRange);
    const filteredExpenses = expenses.filter(e => new Date(e.created_at) >= startRange);

    // Calcular Totales
    const totalSales = filteredSales.reduce((acc, s) => acc + Number(s.total), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

    // Generar Datos para Gráfica (Agrupación simple para el demo)
    const chartMap: Record<string, number> = {};
    filteredSales.slice().reverse().forEach(s => {
      const label = formatChartDate(s.created_at, timeFilter);
      chartMap[label] = (chartMap[label] || 0) + Number(s.total);
    });

    const chartData = Object.entries(chartMap).map(([name, ventas]) => ({ name, ventas }));

    return {
      totalSales,
      totalExpenses,
      netUtility: totalSales - totalExpenses,
      chartData: chartData.length > 0 ? chartData : [{ name: 'Sin Datos', ventas: 0 }]
    };
  }, [sales, expenses, timeFilter]);

  const totalSoldInRanking = ranking.reduce((acc, p) => acc + p.quantity, 0);

  return (
    <PlanGuard restrictedPlans={['Esencial']} moduleName="Dashboard de Analítica">
      <div className="space-y-10 animate-slide-up">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase font-outfit">ANALYTICS ENGINE</h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-lg shadow-brand-500/50" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">GKAD STOCK - MONITORIZACIÓN EN TIEMPO REAL</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            {(['day', 'week', 'month', 'year'] as FilterRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeFilter(range)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  timeFilter === range 
                    ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 scale-105' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard title="Ingresos Brutos" value={`$${analytics.totalSales.toLocaleString()}`} icon={TrendingUp} trend="+12.5%" trendUp={true} description={`Ventas en el periodo: ${timeFilter}`} />
          <KPICard title="Egresos Operativos" value={`$${analytics.totalExpenses.toLocaleString()}`} icon={ArrowDownRight} trendUp={false} trend="Fijo" description="Gastos detectados" alert={analytics.totalExpenses > analytics.totalSales} />
          <KPICard title="Utilidad Real" value={`$${analytics.netUtility.toLocaleString()}`} icon={DollarSign} trendUp={analytics.netUtility > 0} trend="Neto" description="Margen del periodo" success={analytics.netUtility > 0} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <KPICard title="Unidades" value={baseStats.totalProducts} icon={Package} trend="+3" trendUp={true} description="Items en catálogo" variant="mini" />
          <KPICard title="Capital" value={`$${baseStats.inventoryValue.toLocaleString()}`} icon={Layers} trend="Asset" trendUp={true} description="Valorización total" variant="mini" />
          <KPICard title="Divisiones" value={baseStats.activeCategories} icon={ArrowUpRight} trend="Activas" description="Categorías de stock" variant="mini" />
          <KPICard title="Riesgos" value={baseStats.lowStockCount} icon={AlertTriangle} trendUp={false} trend={baseStats.lowStockCount > 0 ? "ALERTA" : "OK"} alert={baseStats.lowStockCount > 0} description="Stock crítico detectado" variant="mini" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <Card className="lg:col-span-2 p-8 h-[450px] flex flex-col glass-dark border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-30" />
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-xl dark:text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
                  <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20 text-brand-500"><TrendingUp size={20} /></div>
                  FLUJO TRANSACCIONAL
                </h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Histórico de rendimiento por periodo</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-brand-500 bg-brand-500/5 px-3 py-1 rounded-full border border-brand-500/10">
                 <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" /> LIVE STREAM
              </div>
            </div>
            
            <div className="w-full min-h-[300px] flex-1 mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }} dy={10} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} 
                    itemStyle={{ color: 'var(--brand-primary)', fontWeight: 'bold', fontSize: '12px' }}
                    labelStyle={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="var(--brand-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-8 flex flex-col glass-dark border-white/5 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-brand-500/10 blur-[60px] rounded-full" />
            <h3 className="font-black text-xl dark:text-white mb-8 font-outfit uppercase tracking-tight flex items-center gap-3">
               <div className="p-2 bg-zinc-900 rounded-lg border border-white/5 text-zinc-400"><ShoppingCart size={20} /></div>
               TOP VENTAS
            </h3>
            <div className="flex-1 space-y-8 py-2">
              {ranking.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                  <ShoppingCart className="h-20 w-20 mb-4 text-zinc-700" strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">No se registran datos en el radar</p>
                </div>
              ) : (
                ranking.map((p, idx) => {
                  const percentage = totalSoldInRanking > 0 ? Math.round((p.quantity / totalSoldInRanking) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-3 group">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1 min-w-0">
                           <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest opacity-60">Puesto #0{idx+1}</p>
                           <h4 className="font-black dark:text-zinc-100 truncate text-sm uppercase tracking-tight group-hover:text-white transition-colors">{p.name}</h4>
                        </div>
                        <span className="font-black text-xs text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 shadow-inner">{p.quantity} U</span>
                      </div>
                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div className={`h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000 shadow-md shadow-brand-500/30`} style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex justify-between">
                        <span>Rendimiento del Mercado</span>
                        <span className="text-zinc-400">{percentage}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">Optimización de Flujo IA v4.0</p>
            </div>
          </Card>
        </div>

      </div>
    </PlanGuard>
  );
};

const KPICard = ({ title, value, icon: Icon, trend, trendUp, description, alert, success, variant = 'large' }: any) => (
  <Card className={`${variant === 'large' ? 'p-8' : 'p-6'} glass-dark border-white/5 hover:border-brand-500/40 hover:-translate-y-1 transition-all group overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.3)]`}>
    <div className="absolute -right-6 -top-6 opacity-0 group-hover:opacity-10 transition-all duration-700 -rotate-12 scale-150"><Icon size={120} className="text-brand-500" /></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div className={`p-4 rounded-[1.25rem] border transition-all duration-500 ${
          alert ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
          success ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
          'bg-brand-500/10 text-brand-500 border-brand-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:bg-brand-500 group-hover:text-white'
        }`}>
          <Icon size={variant === 'large' ? 24 : 18} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border transition-all duration-500 ${
            trendUp === true ? 'text-green-500 bg-green-500/10 border-green-500/20' : 
            trendUp === false ? 'text-red-500 bg-red-500/10 border-red-500/20' : 
            'text-zinc-500 bg-white/5 border-white/5'
          }`}>
            {trendUp === true && <ArrowUpRight size={10} />}
            {trendUp === false && <ArrowDownRight size={10} />}
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{title}</p>
        <h2 className={`${variant === 'large' ? 'text-4xl' : 'text-2xl'} font-black dark:text-white tracking-tighter font-outfit uppercase`}>{value}</h2>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-4">{description}</p>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 h-1 w-0 bg-brand-500 group-hover:w-full transition-all duration-700 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
  </Card>
);
