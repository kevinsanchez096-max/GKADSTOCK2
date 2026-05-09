import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
 ShoppingCart, 
 ArrowDownRight, 
 Users, 
 LayoutDashboard, 
 TrendingUp, 
 Wallet, 
 PlusCircle,
 Clock,
 ChevronRight,
 User,
 Calendar,
 ShieldCheck,
 Activity,
 AlertTriangle,
 History
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useShopStore } from '../store/useShopStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminWelcome } from './AdminWelcome';

interface QuickActionProps {
 icon: React.ElementType;
 title: string;
 desc: string;
 onClick: () => void;
 color: string;
 delay: number;
}

const QuickAction = ({ icon: Icon, title, desc, onClick, color, delay }: QuickActionProps) => (
 <motion.button
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay, duration: 0.4 }}
 onClick={onClick}
 className="group relative flex items-center p-6 bg-card border border-border rounded-3xl shadow-sm hover:shadow-xl hover:border-brand-500/40 transition-all duration-300"
 >
 <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center mr-6 shadow-sm group-hover:scale-105 transition-transform`}>
 {Icon && <Icon className="text-white h-6 w-6"/>}
 </div>
 <div className="text-left flex-1">
 <h3 className="text-[11px] font-black uppercase tracking-widest mb-0.5 text-foreground group-hover:text-brand-500 transition-colors">{title}</h3>
 <p className="text-[10px] font-medium tracking-tight leading-tight uppercase text-muted-foreground">{desc}</p>
 </div>
 <ChevronRight className="text-muted-foreground h-4 w-4 group-hover:text-brand-500 transition-all translate-x-0 group-hover:translate-x-1"/>
 </motion.button>
);

export const Home = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { profile } = useAuthStore();
  const { sales, fetchSalesHistory, products, fetchProducts } = useShopStore();

  if (profile?.role === 'super_admin') {
    return <AdminWelcome setActiveTab={setActiveTab} />;
  }

  React.useEffect(() => {
 if (profile?.organization_id) {
 fetchSalesHistory(profile.organization_id);
 fetchProducts(profile.organization_id);
 }
 }, [profile?.organization_id, fetchSalesHistory, fetchProducts]);

 const lowStockItems = useMemo(() => 
 (products || []).filter(p => Number(p.stock) <= Number(p.min_stock)).slice(0, 3),
 [products]
 );

 const recentActivity = useMemo(() => 
 (sales || []).slice(0, 3),
 [sales]
 );

 const today = new Date().toISOString().split('T')[0];
 const todaySales = (sales || [])
 .filter(s => s.created_at?.startsWith(today))
 .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

 const containerVariants = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: {
 staggerChildren: 0.08
 }
 }
 };

 const actions = [
 { id: 'pos', title: 'Punto de Venta', desc: 'Nueva Venta POS', icon: ShoppingCart, color: 'bg-brand-600' },
 { id: 'inventory', title: 'Inventario', desc: 'Gestionar Stock', icon: PlusCircle, color: 'bg-emerald-600' },
 { id: 'expenses', title: 'Gastos', desc: 'Registrar Egreso', icon: ArrowDownRight, color: 'bg-red-600' },
 { id: 'users', title: 'Equipo', desc: 'Control de Usuarios', icon: Users, color: 'bg-amber-600' },
 ];

 const getFormattedDate = () => {
 try {
 return format(new Date(),"EEEE, dd 'de' MMMM", { locale: es });
 } catch (e) {
 return new Date().toLocaleDateString();
 }
 };

 return (
 <motion.div 
 variants={containerVariants}
 initial="hidden"
 animate="show"
 className="space-y-10 animate-fade-in"
 >
 {/* MODERN ELEGANT HEADER */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border">
 <div className="flex items-center gap-6">
 <div className="h-20 w-20 bg-brand-500/10 rounded-full flex items-center justify-center border-2 border-brand-500/20 shadow-inner">
 <User className="h-10 w-10 text-brand-500"/>
 </div>
 <div className="space-y-1">
 <h1 className="text-4xl md:text-5xl font-black text-foreground font-outfit uppercase tracking-tighter leading-none">
 Hola, <span className="text-brand-500">{profile?.full_name?.split(' ')[0] || 'Líder'}</span>
 </h1>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Gestión: {profile?.organization_name || 'GKAD Stock'}</span>
 <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"/>
 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Sistema Activo</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-4 px-6 py-3 bg-muted rounded-2xl border border-border shadow-sm">
 <Calendar className="h-4 w-4 text-brand-500"/>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
 {getFormattedDate()}
 </p>
 </div>
 </div>

 <div className="grid lg:grid-cols-3 gap-8">
 {/* QUICK ACTIONS LIST */}
 <div className="lg:col-span-2 grid md:grid-cols-2 gap-4 h-fit">
 {actions.map((action, idx) => (
 <QuickAction 
 key={action.id}
 {...action}
 delay={0.1 * idx}
 onClick={() => setActiveTab(action.id)}
 />
 ))}
 </div>

 {/* FINANCIAL SUMMARY CARD */}
 <motion.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.4 }}
 className="bg-brand-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-brand-500/20 border border-border"
 >
 <div className="absolute top-0 right-0 p-8 opacity-10">
 <TrendingUp size={140} />
 </div>
 
 <div className="relative z-10 space-y-12">
 <div className="flex items-center justify-between">
 <div className="px-5 py-2 bg-card/10 backdrop-blur-md rounded-full border border-border">
 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Ventas Brutas Hoy</span>
 </div>
 <div className="h-2 w-2 rounded-full bg-card shadow-[0_0_15px_white] animate-pulse"/>
 </div>

 <div className="space-y-3">
 <h2 className="text-5xl font-black font-outfit tracking-tighter">
 ${todaySales.toLocaleString()}
 </h2>
 <div className="flex items-center gap-2">
 <div className="h-px w-8 bg-card/30"/>
 <p className="text-xs font-bold text-brand-100 uppercase tracking-widest opacity-80">Reporte Operacional</p>
 </div>
 </div>

 <button 
 onClick={() => setActiveTab('dashboard')}
 className="w-full h-16 bg-card text-brand-600 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-2xl"
 >
 ACCEDER AL DASHBOARD
 <LayoutDashboard size={18} />
 </button>
 </div>
 </motion.div>
 </div>

 {/* MÓDULO DE PULSO OPERATIVO */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 className="bg-card border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-sm overflow-hidden relative"
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
 
 {/* COLUMNA IZQUIERDA: ALERTAS DE INVENTARIO */}
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
 <AlertTriangle size={18} />
 </div>
 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Alertas de Inventario</h3>
 </div>
 
 <div className="space-y-4">
 {lowStockItems.length > 0 ? (
 lowStockItems.map((item, idx) => (
 <div key={idx} className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
 <div className="flex items-center gap-3">
 <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse"/>
 <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{item.name}</span>
 </div>
 <span className="text-[10px] font-mono font-black text-red-500 px-3 py-1 bg-red-500/5 rounded-lg border border-red-500/10">
 {item.is_weighted ? `${Number(item.stock).toFixed(3)} KG` : `${item.stock} UND`}
 </span>
 </div>
 ))
 ) : (
 <div className="py-8 text-center border-2 border-dashed border-border rounded-3xl opacity-40">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">Inventario en niveles óptimos</p>
 </div>
 )}
 </div>
 </div>

 {/* COLUMNA DERECHA: ACTIVIDAD RECIENTE */}
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
 <History size={18} />
 </div>
 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Actividad Reciente</h3>
 </div>

 <div className="space-y-4">
 {recentActivity.length > 0 ? (
 recentActivity.map((sale, idx) => (
 <div key={idx} className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
 <div className="flex items-center gap-3">
 <div className="h-1 w-1 rounded-full bg-emerald-500"/>
 <div className="flex flex-col">
 <span className="text-[10px] font-black text-foreground uppercase tracking-tight">Venta #{(sale.id?.toString() || '').split('-')[0]}</span>
 <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(sale.created_at), 'HH:mm')}</span>
 </div>
 </div>
 <span className="text-[11px] font-black text-emerald-500 px-3 py-1 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
 ${Number(sale.total).toLocaleString()}
 </span>
 </div>
 ))
 ) : (
 <div className="py-8 text-center border-2 border-dashed border-border rounded-3xl opacity-40">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">Esperando nuevas transacciones</p>
 </div>
 )}
 </div>
 </div>

 </div>
 <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 text-foreground">
 <Activity size={200} />
 </div>
 </motion.div>

 <div className="grid md:grid-cols-3 gap-6 opacity-40 hover:opacity-100 transition-all duration-500 pt-6">
 <div className="flex items-center gap-3 p-5 bg-muted rounded-3xl border border-border group hover:bg-card hover:shadow-md transition-all">
 <Clock className="h-5 w-5 text-brand-500"/>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servidor: Online</span>
 </div>
 <div className="flex items-center gap-3 p-5 bg-muted rounded-3xl border border-border group hover:bg-card hover:shadow-md transition-all">
 <ShieldCheck className="h-5 w-5 text-emerald-500"/>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Protección: AES-256</span>
 </div>
 <div className="flex items-center gap-3 p-5 bg-muted rounded-3xl border border-border group hover:bg-card hover:shadow-md transition-all">
 <Activity className="h-5 w-5 text-blue-500"/>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sync: Latencia 20ms</span>
 </div>
 </div>
 </motion.div>
 );
};
