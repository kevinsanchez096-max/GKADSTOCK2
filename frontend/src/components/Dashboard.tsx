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
 
 // Detectar tema para configuración de Recharts
 const darkMode = document.documentElement.classList.contains('dark');
 
 const [timeFilter, setTimeFilter] = useState<FilterRange>('month');
 const [sales, setSales] = useState<any[]>([]);
 const [expenses, setExpenses] = useState<any[]>([]);
 const [ranking, setRanking] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
  const totalCost = filteredSales.reduce((acc, s) => acc + Number(s.total_cost || 0), 0);
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
 netUtility: (totalSales - totalCost) - totalExpenses,
 transactionCount,
 averageTicket,
 chartData: chartData.length > 0 ? chartData : [{ name: 'Sin Datos', ventas: 0 }]
 };
 }, [sales, expenses, timeFilter]);

 const totalSoldInRanking = ranking.reduce((acc, p) => acc + p.quantity, 0);

 return (
 <PlanGuard restrictedPlans={['Esencial']} moduleName="Dashboard de Analítica">
 <div className="relative space-y-10 md:space-y-12 animate-slide-up pb-10 min-h-screen -m-6 p-6 bg-muted/50">
 <div className="relative z-10">
 
 {/* HEADER DE LA SECCIÓN */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 md:pb-8">
 <div className="space-y-1">
 <h1 className="text-4xl md:text-[3.5rem] leading-none font-black text-foreground tracking-tighter uppercase font-outfit drop-shadow-sm transition-colors duration-300">
 ANALYTICS ENGINE
 </h1>
 <div className="flex items-center gap-2 mt-2">
 <div className="h-2.5 w-2.5 rounded-full bg-brand-400 animate-pulse shadow-[0_0_8px_rgba(var(--brand-primary),0.8)] glow-brand"/>
 <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.25em]">
 GKAD STOCK - MONITORIZACIÓN EN TIEMPO REAL
 </p>
 </div>
 </div>

 {/* BOTONES DE FILTRO (PÍLDORA GRIS) */}
 <div className="flex items-center p-1.5 rounded-[2rem] transition-colors duration-300 bg-border/80 shadow-inner">
 {(['day', 'week', 'month', 'year'] as FilterRange[]).map((range) => (
 <button
 key={range}
 onClick={() => setTimeFilter(range)}
 className={`px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-[1.5rem] ${
 timeFilter === range 
 ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 dark:shadow-brand-500/20'
 : 'text-muted-foreground hover:text-foreground hover:bg-border/50 /50'
 }`}
 >
 {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
 </button>
 ))}
 </div>
 </div>

 {/* GRILLA SUPERIOR (3 COLUMNAS GRANDES) */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
 <KPICard title="Ingresos Brutos"value={`$${analytics.totalSales.toLocaleString()}`} icon={TrendingUp} trend="+12.5%"trendUp={true} description={`Ventas en el periodo: ${timeFilter}`} />
 <KPICard title="Egresos Operativos"value={`$${analytics.totalExpenses.toLocaleString()}`} icon={ArrowDownRight} trendUp={false} trend="Fijo"description="Gastos detectados"alert={analytics.totalExpenses > analytics.totalSales} />
 <KPICard title="Utilidad Real"value={`$${analytics.netUtility.toLocaleString()}`} icon={DollarSign} trendUp={analytics.netUtility > 0} trend="Neto"description="Margen del periodo"success={analytics.netUtility > 0} />
 </div>

 {/* GRILLA INFERIOR (4 COLUMNAS PEQUEÑAS) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mt-6">
 <KPICard title="Transacciones Totales"value={analytics.transactionCount} icon={Package} trend="+3"trendUp={true} description="Facturas emitidas"variant="mini"/>
 <KPICard title="Ticket Promedio"value={`$${analytics.averageTicket.toLocaleString()}`} icon={Layers} trend="Asset"trendUp={true} description="Gasto promedio por venta"variant="mini"/>
 <KPICard title="Divisiones"value={baseStats.activeCategories} icon={ArrowUpRight} trend="Activas"description="Categorías de stock"variant="mini"/>
 <KPICard title="Riesgos"value={baseStats.lowStockCount} icon={AlertTriangle} trendUp={false} trend={baseStats.lowStockCount > 0 ?"ALERTA":"OK"} alert={baseStats.lowStockCount > 0} description="Stock crítico detectado"variant="mini"/>
 </div>

 {/* GRÁFICA Y TOP VENTAS */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
 
 <Card className="lg:col-span-2 p-8 h-[450px] flex flex-col bg-card dark:bg-[#151b2b] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent/60 relative overflow-hidden group">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h3 className="font-black text-2xl text-foreground flex items-center gap-3 font-outfit uppercase tracking-tight">
 <div className="p-2.5 bg-brand-50 dark:bg-brand-500/10 rounded-full text-brand-500"><TrendingUp size={24} /></div>
 FLUJO TRANSACCIONAL
 </h3>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2 ml-1">Histórico de rendimiento por periodo</p>
 </div>
 <div className="flex items-center gap-2 text-[10px] font-black text-brand-500 bg-brand-500/5 px-3 py-1 rounded-full border border-brand-500/10">
 <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse"/> LIVE STREAM
 </div>
 </div>
 
   <div style={{ position: 'relative', width: '100%', height: '300px' }}>
    {chartReady && (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSales"x1="0"y1="0"x2="0"y2="1">
              <stop offset="5%"stopColor="var(--brand-primary)"stopOpacity={0.3}/>
              <stop offset="95%"stopColor="var(--brand-primary)"stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#334155"opacity={0.2} />
          <XAxis dataKey="name"axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} tickFormatter={(value) => `$${value/1000}k`} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
              backdropFilter: 'blur(8px)', 
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
              borderRadius: '16px', 
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' 
            }}
            itemStyle={{ color: darkMode ? '#e2e8f0' : '#0f172a', fontWeight: 'bold' }}
            labelStyle={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}
          />
          <Area type="monotone" dataKey="ventas" stroke="var(--brand-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 8, fill: 'var(--brand-primary)', stroke: '#fff', strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    )}
  </div>
 </Card>

 <Card className="p-8 flex flex-col bg-card dark:bg-[#151b2b] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent/60 relative overflow-hidden">
 <h3 className="font-black text-2xl text-foreground mb-8 font-outfit uppercase tracking-tight flex items-center gap-3">
 <div className="p-2.5 bg-brand-50 dark:bg-brand-500/10 rounded-full text-brand-500"><ShoppingCart size={24} /></div>
 TOP VENTAS
 </h3>
 <div className="flex-1 space-y-8 py-2">
 {ranking.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
 <ShoppingCart className="h-20 w-20 mb-4 text-foreground"strokeWidth={1} />
 <p className="text-[10px] font-black uppercase tracking-[0.4em]">No se registran datos en el radar</p>
 </div>
 ) : (
 ranking.map((p, idx) => {
 const percentage = totalSoldInRanking > 0 ? Math.round((p.quantity / totalSoldInRanking) * 100) : 0;
 return (
 <div key={idx} className="space-y-3 group">
 <div className="flex justify-between items-end">
 <div className="space-y-1 min-w-0">
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Puesto #0{idx+1}</p>
 <h4 className="font-black text-foreground truncate text-base uppercase tracking-tight group-hover:text-brand-500 transition-colors">{p.name}</h4>
 </div>
 <span className="font-black text-sm text-foreground bg-muted px-3 py-1.5 rounded-xl">{p.quantity} U</span>
 </div>
 <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
 <div className={`h-full bg-brand-400 rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
 </div>
 <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex justify-between">
 <span>Rendimiento del Mercado</span>
 <span className="text-muted-foreground">{percentage}%</span>
 </div>
 </div>
 );
 })
 )}
 </div>
 <div className="mt-8 pt-6 border-t border-border text-center">
 <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em]">Optimización de Flujo IA v4.0</p>
 </div>
 </Card>
 </div>

 </div>
 </div>
 </PlanGuard>
 );
};

const KPICard = ({ title, value, icon: Icon, trend, trendUp, description, alert, success, variant = 'large' }: any) => {
 return (
 <Card className={`group relative overflow-hidden transition-all duration-300 flex flex-col justify-between
 bg-card dark:bg-[#151b2b] 
 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none
 border border-transparent/60
 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:border-border
 rounded-[2.5rem]
 ${variant === 'large' ? 'p-8 h-[220px]' : 'p-7 h-[200px]'}`}>
 
 {/* Cabecera de la Tarjeta (Icono + Tendencia) */}
 <div className="flex justify-between items-start relative w-full">
 <div className={`p-3.5 rounded-full flex items-center justify-center
 ${alert ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' : 
 success ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400' : 
 'bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400'
 }`}>
 <Icon size={24} strokeWidth={2.5} />
 </div>

 {trend && (
 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest
 ${trendUp === true ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 
 trendUp === false ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 
 'bg-muted text-muted-foreground'
 }`}>
 {trendUp === true && <ArrowUpRight size={14} strokeWidth={3} />}
 {trendUp === false && <ArrowDownRight size={14} strokeWidth={3} />}
 {trend}
 </div>
 )}
 </div>

 {/* Cuerpo de la Tarjeta (Valores) */}
 <div className="mt-auto relative w-full flex flex-col gap-1.5">
 <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
 {title}
 </p>
 <div className="flex items-baseline gap-2">
 <h2 className={`${variant === 'large' ? 'text-5xl' : 'text-4xl'} font-black text-foreground tracking-tighter font-outfit transition-colors duration-300`}>
 {value}
 </h2>
 </div>
 <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
 {description}
 </p>
 </div>
 </Card>
 );
};
