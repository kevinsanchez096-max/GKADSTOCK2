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
 ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { Card } from './ui-components';
import { BarChart3 } from 'lucide-react';
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

  const translateTimeFilter = (filter: string) => {
    const map: Record<string, string> = {
      day: 'HOY',
      week: 'ESTA SEMANA',
      month: 'ESTE MES',
      year: 'ESTE AÑO',
    };
    return map[filter] || filter.toUpperCase();
  };

 return (
 <PlanGuard restrictedPlans={['Esencial']} moduleName="Dashboard de Analítica">
 <div className="relative space-y-10 md:space-y-12 animate-slide-up pb-10 min-h-screen -m-6 p-10 bg-[#000]">
 <div className="relative z-10">
 
 {/* HEADER DE LA SECCIÓN */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 md:pb-8">
  <div className="flex items-center gap-6">
 <div className="p-4 rounded-2xl flex items-center justify-center transition-all duration-300" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 90%)', border: '0.5px solid color-mix(in srgb, var(--brand-primary), transparent 70%)' }}>
 <BarChart3 size={32} strokeWidth={2.5} style={{ color: 'var(--brand-primary)' }} />
 </div>
 <div className="flex flex-col">
 <p className="text-[10px] font-bold text-[#888] uppercase tracking-[4px] mb-2">
 GKAD STOCK · MONITORIZACIÓN EN TIEMPO REAL
 </p>
 <h1 className="text-[42px] font-[900] text-white tracking-[-2px] uppercase leading-none">
 ANÁLISIS <span style={{ color: 'var(--brand-primary)' }}>FINANCIERO</span>
 </h1>
 </div>
 </div>

 {/* BOTONES DE FILTRO (PÍLDORA NEGRA) */}
 <div className="flex items-center p-1.5 rounded-[50px] transition-colors duration-300 bg-[#0f0f0f] border border-[#1a1a1a]/50">
 {(['day', 'week', 'month', 'year'] as FilterRange[]).map((range) => (
 <button
 key={range}
 onClick={() => setTimeFilter(range)}
 className={`px-8 py-2.5 text-[11px] font-black uppercase tracking-[2px] transition-all duration-300 rounded-[50px] ${
 timeFilter === range 
 ? 'text-white shadow-xl'
 : 'text-[#444] hover:text-white'
 }`}
 style={timeFilter === range ? { backgroundColor: 'var(--brand-primary)' } : {}}
 >
 {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
 </button>
 ))}
 </div>
 </div>
 
 {/* GRILLA SUPERIOR (3 COLUMNAS GRANDES) */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
 <KPICard title="Ingresos Brutos"value={`$${analytics.totalSales.toLocaleString()}`} icon={TrendingUp} trend="+12.5%"trendUp={true} description={`Ventas en el periodo: ${translateTimeFilter(timeFilter)}`} />
 <KPICard title="Egresos Operativos"value={`$${analytics.totalExpenses.toLocaleString()}`} icon={ArrowDownRight} trendUp={false} trend="Fijo"description="Gastos detectados"alert={analytics.totalExpenses > analytics.totalSales} />
 <KPICard title="Utilidad Real"value={`$${analytics.netUtility.toLocaleString()}`} icon={DollarSign} trendUp={analytics.netUtility > 0} trend="Neto"description="Margen del periodo"success={analytics.netUtility > 0} />
 </div>

 {/* GRILLA INFERIOR (4 COLUMNAS PEQUEÑAS) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mt-6">
 <KPICard title="Transacciones Totales"value={analytics.transactionCount} icon={Package} trend="+3"trendUp={true} description="Facturas emitidas"variant="mini"/>
  <KPICard title="Ticket Promedio"value={`$${analytics.averageTicket.toLocaleString()}`} icon={Layers} trend="ACTIVO"trendUp={true} description="Gasto promedio por venta"variant="mini"/>
 <KPICard title="Divisiones"value={baseStats.activeCategories} icon={ArrowUpRight} trend="Activas"description="Categorías de stock"variant="mini"/>
 <KPICard title="Riesgos"value={baseStats.lowStockCount} icon={AlertTriangle} trendUp={false} trend={baseStats.lowStockCount > 0 ?"ALERTA":"BIEN"} alert={baseStats.lowStockCount > 0} description="Stock crítico detectado"variant="mini"/>
 </div>

 {/* GRÁFICA Y TOP VENTAS */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
 
 <Card className="lg:col-span-2 p-10 h-[450px] flex flex-col bg-[#0d0d0d] rounded-[35px] border-[0.5px] border-[#1a1a1a] relative overflow-hidden group">
 <div className="flex items-center justify-between mb-10">
 <div>
 <h3 className="font-[900] text-2xl text-white font-outfit uppercase tracking-[-1px]">
 FLUJO TRANSACCIONAL
 </h3>
 <p className="text-[10px] text-[#444] font-bold uppercase tracking-[2px] mt-2">Histórico de rendimiento por periodo</p>
 </div>
  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px]" style={{ color: 'var(--brand-primary)' }}>
 <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-primary)' }}/> RADAR EN VIVO
 </div>
 </div>
 
   <div style={{ position: 'relative', width: '100%', height: '300px' }}>
    {chartReady && (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#1a1a1a" opacity={0.5} />
          <XAxis dataKey="name"axisLine={false} tickLine={false} tick={{ fill: '#444', fontSize: 10, fontWeight: 900 }} dy={10} />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            contentStyle={{ 
              backgroundColor: '#000', 
              border: '1px solid #1a1a1a', 
              borderRadius: '12px', 
            }}
            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
            labelStyle={{ color: '#444', marginBottom: '4px', fontSize: '10px', fontWeight: '900' }}
          />
          <Bar dataKey="ventas" radius={[4, 4, 0, 0]} barSize={60}>
           {analytics.chartData.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={index >= analytics.chartData.length - 3 ? 'var(--brand-primary)' : '#1a1a1a'} />
           ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
 </Card>

 <Card className="p-10 flex flex-col bg-[#0d0d0d] rounded-[35px] border-[0.5px] border-[#1a1a1a] relative overflow-hidden">
 <h3 className="font-[900] text-2xl text-white mb-10 font-outfit uppercase tracking-[-1px]">
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
 const colors = ['var(--brand-primary)', '#8b5cf6', '#f59e0b'];
 const barColor = colors[idx] || '#334155';
 return (
 <div key={idx} className="space-y-3 group">
 <div className="flex justify-between items-end">
 <h4 className="font-bold text-white text-base truncate flex items-baseline gap-2">
 {p.name}
 </h4>
 <span className="text-[10px] font-bold text-[#444] uppercase tracking-[1px]">{p.quantity} u · {percentage}%</span>
 </div>
 <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
 <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: barColor }} />
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
 const isUtilidadReal = title === "Utilidad Real";
 
 if (variant === 'mini') {
 return (
  <Card className="p-6 px-12 flex items-center gap-10 bg-[#0d0d0d] border-[#1a1a1a] border-[0.5px] rounded-[35px] transition-all hover:border-[var(--brand-primary)]/30 overflow-hidden">
 <div className="p-4 bg-[#1a1a1a] rounded-[10px] text-[var(--brand-primary)]">
 <Icon size={24} />
 </div>
 <div className="min-w-0 flex-1">
 <h2 className={`font-black text-white leading-none tracking-tighter transition-all duration-300 ${value.toString().length > 10 ? 'text-lg' : value.toString().length > 8 ? 'text-xl' : 'text-2xl'}`}>
 {value}
 </h2>
 <p className="text-[10px] font-bold text-[#444] uppercase tracking-[2px] mt-2 leading-none truncate">{title}</p>
 </div>
 </Card>
 );
 }

 return (
  <Card className={`group relative p-12 h-[260px] rounded-[35px] border-[0.5px] border-[#1a1a1a] flex flex-col justify-between overflow-hidden
 ${isUtilidadReal ? 'text-white' : 'bg-[#0d0d0d] text-white'}`}
 style={isUtilidadReal ? { background: 'var(--brand-primary)' } : {}}
 >
  {/* Círculo Decorativo */}
 {isUtilidadReal && (
 <div className="absolute -top-[20px] -right-[20px] w-[100px] h-[100px] rounded-full bg-white/10 blur-xl" />
 )}

 <div className="flex justify-between items-start relative z-10">
 <div className={`p-4 rounded-[12px] ${isUtilidadReal ? 'bg-white/10' : 'bg-[#1a1a1a]'}`}>
 <Icon size={28} strokeWidth={2.5} style={{ color: isUtilidadReal ? 'white' : (alert ? '#ef4444' : 'var(--brand-primary)') }} />
 </div>
 {trend && (
 <div className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[2px] ${isUtilidadReal ? 'bg-white/20' : 'bg-[#1a1a1a] text-[var(--brand-primary)]'}`}>
 {trend}
 </div>
 )}
 </div>

 <div className="mt-auto relative z-10">
 <p className={`text-[11px] font-bold uppercase tracking-[3px] mb-2 ${isUtilidadReal ? 'text-white/70' : 'text-[#444]'}`}>
 {title}
 </p>
 <h2 className={`font-[900] tracking-[-3px] font-outfit transition-all duration-300 ${value.toString().length > 12 ? 'text-2xl' : value.toString().length > 9 ? 'text-3xl' : 'text-4xl'}`}>
 {value}
 </h2>
 <p className={`text-[10px] font-bold uppercase tracking-[2px] mt-3 ${isUtilidadReal ? 'text-white/70' : 'text-[#444]'}`}>
 {description}
 </p>
 </div>
 </Card>
 );
};
