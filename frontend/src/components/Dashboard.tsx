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

  // Color dinámico de acento
  const [accentColor, setAccentColor] = useState('emerald');

  useEffect(() => {
    // Ciclar o aleatorizar el color al cargar
    const colors = ['violet', 'blue', 'teal', 'emerald'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setAccentColor(randomColor);
  }, []);

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

    // Nuevos cálculos
    const transactionCount = filteredSales.length;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

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
      transactionCount,
      averageTicket,
      chartData: chartData.length > 0 ? chartData : [{ name: 'Sin Datos', ventas: 0 }]
    };
  }, [sales, expenses, timeFilter]);

  const totalSoldInRanking = ranking.reduce((acc, p) => acc + p.quantity, 0);

  return (
    <PlanGuard restrictedPlans={['Esencial']} moduleName="Dashboard de Analítica">
      <div className="relative space-y-12 animate-slide-up pb-10">
        {/* Fondo Degradado Verde-Azul */}
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-blue-600/10 dark:from-emerald-900/20 dark:via-blue-900/20 dark:to-blue-950/20 pointer-events-none" />
        <div className="relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 dark:border-white/5 pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold dark:text-white tracking-tight uppercase font-outfit">ANALYTICS ENGINE</h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-lg shadow-brand-500/50" />
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.3em]">GKAD STOCK - MONITORIZACIÓN EN TIEMPO REAL</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 p-1 rounded-full transition-colors duration-300
                          bg-gray-100 border border-gray-200
                          dark:bg-gray-800 dark:border-gray-700">
            {(['day', 'week', 'month', 'year'] as FilterRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeFilter(range)}
                className={`px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all rounded-full shadow-sm ${
                  timeFilter === range 
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <KPICard title="Ingresos Brutos" value={`$${analytics.totalSales.toLocaleString()}`} icon={TrendingUp} trend="+12.5%" trendUp={true} description={`Ventas en el periodo: ${timeFilter}`} accentColor={accentColor} />
          <KPICard title="Egresos Operativos" value={`$${analytics.totalExpenses.toLocaleString()}`} icon={ArrowDownRight} trendUp={false} trend="Fijo" description="Gastos detectados" alert={analytics.totalExpenses > analytics.totalSales} accentColor={accentColor} />
          <KPICard title="Utilidad Real" value={`$${analytics.netUtility.toLocaleString()}`} icon={DollarSign} trendUp={analytics.netUtility > 0} trend="Neto" description="Margen del periodo" success={analytics.netUtility > 0} accentColor={accentColor} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <KPICard title="Transacciones Totales" value={analytics.transactionCount} icon={Package} trend="+3" trendUp={true} description="Facturas emitidas" variant="mini" accentColor={accentColor} />
          <KPICard title="Ticket Promedio" value={`$${analytics.averageTicket.toLocaleString()}`} icon={Layers} trend="Asset" trendUp={true} description="Gasto promedio por venta" variant="mini" accentColor={accentColor} />
          <KPICard title="Divisiones" value={baseStats.activeCategories} icon={ArrowUpRight} trend="Activas" description="Categorías de stock" variant="mini" accentColor={accentColor} />
          <KPICard title="Riesgos" value={baseStats.lowStockCount} icon={AlertTriangle} trendUp={false} trend={baseStats.lowStockCount > 0 ? "ALERTA" : "OK"} alert={baseStats.lowStockCount > 0} description="Stock crítico detectado" variant="mini" accentColor={accentColor} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <Card className="lg:col-span-2 p-8 h-[450px] flex flex-col bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 rounded-3xl relative overflow-hidden group">
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

          <Card className="p-8 flex flex-col bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 rounded-3xl relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-brand-500/10 blur-[60px] rounded-full" />
            <h3 className="font-black text-xl dark:text-white mb-8 font-outfit uppercase tracking-tight flex items-center gap-3">
               <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400"><ShoppingCart size={20} /></div>
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
      </div>
    </PlanGuard>
  );
};

const KPICard = ({ title, value, icon: Icon, trend, trendUp, description, alert, success, variant = 'large', accentColor = 'emerald' }: any) => {
  // Mapa de clases para tendencias positivas basado en el color de acento
  const trendClassesMap: Record<string, string> = {
    violet: 'text-violet-600 bg-violet-50/20 dark:text-violet-400 dark:bg-violet-500/10',
    blue: 'text-blue-600 bg-blue-50/20 dark:text-blue-400 dark:bg-blue-500/10',
    teal: 'text-teal-600 bg-teal-50/20 dark:text-teal-400 dark:bg-teal-500/10',
    emerald: 'text-emerald-600 bg-emerald-50/20 dark:text-emerald-400 dark:bg-emerald-500/10'
  };

  const activeTrendClass = trendClassesMap[accentColor] || trendClassesMap['emerald'];

  return (
  <Card className={`${variant === 'large' ? 'p-8' : 'p-6'} flex flex-col rounded-3xl transition-all duration-300
                bg-white/80 border border-gray-200/50 shadow-sm backdrop-blur-md
                dark:bg-slate-900/40 dark:border-slate-700/50 dark:shadow-none
                hover:shadow-lg hover:-translate-y-1 dark:hover:bg-slate-800/50 group overflow-hidden relative`}>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl transition-all duration-500 ${
          alert ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' : 
          success ? 'bg-green-50 text-green-500 dark:bg-green-500/10 dark:text-green-400' : 
          'bg-brand-500/10 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white'
        }`}>
          <Icon size={variant === 'large' ? 24 : 18} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest transition-all duration-500 ${
            trendUp === true ? activeTrendClass : 
            trendUp === false ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 
            'bg-gray-50 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400'
          }`}>
            {trendUp === true && <ArrowUpRight size={10} />}
            {trendUp === false && <ArrowDownRight size={10} />}
            {trend}
          </div>
        )}
      </div>
      <div className="flex flex-col space-y-2 mt-2">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</p>
        <h2 className={`${variant === 'large' ? 'text-3xl md:text-4xl' : 'text-2xl'} font-extrabold text-gray-900 dark:text-white tracking-tight font-outfit uppercase`}>{value}</h2>
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-1">{description}</p>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 h-1 w-0 bg-brand-500 group-hover:w-full transition-all duration-700 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
  </Card>
);
};
