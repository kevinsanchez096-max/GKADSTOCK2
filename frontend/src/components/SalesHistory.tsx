import { useState, useMemo, useEffect } from 'react';
import { Card, Button, Input } from './ui-components';
import { 
 Search, 
 FileText, 
 Eye, 
 Printer, 
 ChevronRight,
 Calendar,
 DollarSign,
 ShoppingCart,
 X,
 RefreshCw,
 ArrowDownRight,
 Loader2,
 RotateCcw
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { useAuthStore } from '../store/useAuthStore';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { PrintableTicket } from './PrintableTicket';
import { ReturnSaleModal } from './ReturnSaleModal';

type FilterRange = 'day' | 'week' | 'month' | 'year';

export const SalesHistory = () => {
 const { sales } = useShopStore();
 const { profile } = useAuthStore();

 const [searchTerm, setSearchTerm] = useState('');
 const [timeFilter, setTimeFilter] = useState<FilterRange>('day');
 const [selectedSale, setSelectedSale] = useState<any>(null);
 const [saleToPrint, setSaleToPrint] = useState<any>(null);
 const [saleToReturn, setSaleToReturn] = useState<any>(null);
 const [arqueoData, setArqueoData] = useState<any>(null);
 const [loadingArqueo, setLoadingArqueo] = useState(false);
 const [refreshing, setRefreshing] = useState(false);
 const [loadingDetails, setLoadingDetails] = useState(false);
 const [profitMargin, setProfitMargin] = useState(20); // Valor Default 20%
 const [displayLimit, setDisplayLimit] = useState(20); // Límite de registros a mostrar

 // Helper de Seguridad: Parseo de Items (Evita Crash de Pantalla Negra)
 const getSafeItems = (itemsInput: any) => {
 try {
 if (!itemsInput) return [];
 if (Array.isArray(itemsInput)) return itemsInput;
 if (typeof itemsInput === 'string') {
 const parsed = JSON.parse(itemsInput);
 return Array.isArray(parsed) ? parsed : [];
 }
 return [];
 } catch (e) {
 console.error('[SALES_HISTORY] Fallo al parsear items:', e);
 return [];
 }
 };

 // Helper de Seguridad: Formateo de Fecha
 const getSafeDate = (dateInput: any) => {
 try {
 if (!dateInput) return 'Fecha no disp.';
 const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
 return format(date, 'dd/MM/yyyy HH:mm');
 } catch (e) {
 return 'Formato Inválido';
 }
 };

 const filteredSales = useMemo(() => {
 if (!Array.isArray(sales)) return [];

 // Filtro de tiempo
 const now = new Date();
 const startRange = new Date();
 if (timeFilter === 'day') startRange.setHours(0, 0, 0, 0);
 else if (timeFilter === 'week') startRange.setDate(now.getDate() - 7);
 else if (timeFilter === 'month') startRange.setMonth(now.getMonth() - 1);
 else if (timeFilter === 'year') startRange.setFullYear(now.getFullYear() - 1);

 return sales.filter(s => {
 // Filtro por rango de tiempo
 const saleDate = new Date(s.created_at);
 if (saleDate < startRange) return false;

 // Filtro por búsqueda de texto
 const idMatch = (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());
 const method = (s.payment_method || '').toLowerCase();
 const methodMatch = method.includes(searchTerm.toLowerCase());
 return idMatch || methodMatch;
 });
 }, [sales, searchTerm, timeFilter]);

 // CÁLCULO DE INTELIGENCIA FINANCIERA (NEW)
 const totalGross = useMemo(() => {
 return filteredSales.reduce((acc, sale) => acc + (Number(sale.total) || 0), 0);
 }, [filteredSales]);

 const estimatedProfit = useMemo(() => {
 return (totalGross * profitMargin) / 100;
 }, [totalGross, profitMargin]);

 // FUNCIÓN: Ver Detalles (Sólo para el Modal Visual)
 const handleViewDetails = async (sale: any) => {
 setSelectedSale(sale);
 setLoadingDetails(true);
 
 try {
 const items = await api.get(`/sales/${sale.id}`);
 const formattedItems = items.map((item: any) => ({
 name: item.products?.name || 'Producto Desconocido',
 price: item.price,
 quantity: item.quantity,
 subtotal: item.subtotal
 }));
 setSelectedSale({
 ...sale,
 items: formattedItems
 });
 } catch (error) {
 console.error('🔥 [DETALLES_ERROR]:', error);
 toast.error('No se pudieron cargar los productos');
 } finally {
 setLoadingDetails(false);
 }
 };

 // FUNCIÓN: Imprimir Directo (Background Fetch)
 const handlePrintDirectly = async (sale: any) => {
 toast.info('Preparando ticket para impresión...', { icon: '🧾' });
 
 try {
 const items = await api.get(`/sales/${sale.id}`);
 const formattedItems = items.map((item: any) => ({
 name: item.products?.name || 'Producto Desconocido',
 price: item.price,
 quantity: item.quantity,
 is_weighted: item.products?.is_weighted,
 subtotal: item.subtotal
 }));
 
 setSaleToPrint({
 ...sale,
 items: formattedItems
 });
 } catch (error) {
 console.error('🔥 [PRINT_FETCH_ERROR]:', error);
 toast.error('Error al preparar la impresión');
 }
 };

 // EFECTO REACTIVO: El disparador real de la impresora
 useEffect(() => {
 if (saleToPrint && saleToPrint.items && saleToPrint.items.length > 0) {
 const timer = setTimeout(() => {
 window.print();
 // Limpiamos el estado después de imprimir para evitar bucles
 setSaleToPrint(null);
 }, 850);
 return () => clearTimeout(timer);
 }
 }, [saleToPrint]);

 // Efecto para recargar cuando cambia el límite o la organización
 useEffect(() => {
 if (!profile || !profile.organization_id) return;
 
 useShopStore.getState().fetchSalesHistory(profile.organization_id, displayLimit);
 // Sincronizar perfil para asegurar datos de branding actualizados
 api.get('/auth/profile').then(data => {
 if (data) useAuthStore.getState().setProfile(data);
 });

 // AISLAMIENTO REALTIME STRICTO
 const channel = supabase
 .channel('custom-history-sales')
 .on(
 'postgres_changes',
 { 
 event: '*', 
 schema: 'public', 
 table: 'sales', 
 filter: `organization_id=eq.${profile.organization_id}` 
 },
 (payload) => {
 if (payload.new && payload.new.organization_id === profile.organization_id) {
 // Silenciosamente refrescar sin invadir al usuario
 useShopStore.getState().fetchSalesHistory(profile.organization_id, displayLimit);
 }
 }
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [profile?.organization_id, displayLimit]);

 const handlePrint = (sale: any) => {
 if (!sale) return;
 toast.info('Iniciando impresión...');
 setTimeout(() => {
 window.print();
 }, 500);
 };

 const handleRefresh = async () => {
 if (!profile?.organization_id) return;
 setRefreshing(true);
 try {
 await useShopStore.getState().fetchSalesHistory(profile.organization_id, displayLimit);
 toast.success('Historial actualizado');
 } catch (error) {
 toast.error('Error al sincronizar ventas');
 } finally {
 setRefreshing(false);
 }
 };

 const fetchArqueo = async () => {
 if (!profile?.organization_id) return;
 setLoadingArqueo(true);
 try {
 const data = await api.get(`/sales/closing?organization_id=${profile.organization_id}`);
 setArqueoData(data);
 } catch (error) {
 toast.error('Error al generar arqueo');
 } finally {
 setLoadingArqueo(false);
 }
 };

 const handlePrintArqueo = () => {
 window.print();
 };

 return (
 <div className="space-y-8 animate-slide-up pb-20">
 
 {/* 🟢 CONTENEDOR NO-PRINT: Todo lo que ves en pantalla pero NO en la impresora */}
 <div className="no-print space-y-8">
 <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
 <div className="flex items-start space-x-3">
 <div className="space-y-1">
 <h2 className="text-3xl font-black text-foreground flex items-center gap-3 font-outfit uppercase tracking-tight">
 <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20 text-brand-500">
 <FileText className="h-6 w-6"/>
 </div>
 AUDITORÍA DE VENTAS
 </h2>
 <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-[10px] ml-1">Registro Centralizado de Transacciones</p>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
 {/* Selector de Periodo de Tiempo */}
 <div className="flex items-center space-x-1 p-1 rounded-full transition-colors duration-300 bg-muted border border-border">
 {(['day', 'week', 'month', 'year'] as FilterRange[]).map((range) => (
 <button
 key={range}
 onClick={() => setTimeFilter(range)}
 className={`px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all rounded-full shadow-sm ${
 timeFilter === range 
 ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' 
 : 'text-muted-foreground hover:text-foreground '
 }`}
 >
 {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
 </button>
 ))}
 </div>

 {/* Botones de Acción Existentes */}
 <div className="flex items-center space-x-3">
 <Button 
 variant="outline"
 className="px-4 h-14 rounded-2xl border-border bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
 onClick={handleRefresh}
 loading={refreshing}
 >
 <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
 </Button>
 <Button 
 className="px-8 h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl glow-blue transition-all active:scale-95"
 onClick={fetchArqueo}
 loading={loadingArqueo}
 >
 <DollarSign className="h-4 w-4 mr-2"/>
 GENERAR ARQUEO DIARIO
 </Button>
 </div>
 </div>
 </div>

 {/* MÉTRICAS INTELIGENTES (NEW: Calculadora de Utilidad) */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="glass-dark border-border p-6 rounded-[2rem] flex flex-col justify-center relative overflow-hidden group">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-500 border border-brand-500/20 group-hover:bg-brand-500 group-hover:text-white transition-all duration-500">
 <ShoppingCart className="h-5 w-5"/>
 </div>
 <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest bg-brand-500/10 px-3 py-1 rounded-full">Bruto</span>
 </div>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ventas Totales Proyectadas</p>
 <h3 className="text-3xl font-black text-foreground font-outfit tracking-tighter leading-none">${totalGross.toLocaleString()}</h3>
 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-[50px] -mr-16 -mt-16 rounded-full"/>
 </Card>

 <Card className="glass-dark border-border p-6 rounded-[2rem] flex flex-col justify-center relative overflow-hidden group ring-1 ring-white/5 focus-within:ring-brand-500/50 transition-all duration-300">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-muted rounded-2xl text-muted-foreground border border-border group-focus-within:bg-brand-500 group-focus-within:text-white transition-all duration-500">
 <ArrowDownRight className="h-5 w-5"/>
 </div>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Configuración</span>
 </div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">% MARGEN DE UTILIDAD</p>
 <div className="flex items-center w-full sm:w-32 rounded-xl transition-all duration-300 bg-card border border-border shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:shadow-none focus-within:ring-2 focus-within:ring-red-400">
 <input
 type="number"
 min="0"
 max="100"
 className="w-full bg-transparent text-foreground font-bold text-2xl text-center outline-none py-2 pl-4"
 value={profitMargin}
 onChange={(e) => setProfitMargin(Number(e.target.value) || 0)}
 />
 <span className="text-foreground font-bold text-2xl pr-4">%</span>
 </div>
 </Card>

 <Card className="bg-emerald-500/5 border-emerald-500/20 p-6 rounded-[2rem] flex flex-col justify-center relative overflow-hidden group shadow-[0_0_30px_rgba(16,185,129,0.05)] border-2">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20 border-2 border-border">
 <DollarSign className="h-5 w-5"/>
 </div>
 <div className="flex flex-col items-end">
 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Cálculo Proy.</span>
 <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tight">Utilidad Neta</span>
 </div>
 </div>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ganancia Estimada Líquida</p>
 <h3 className="text-3xl font-black text-emerald-500 font-outfit tracking-tighter leading-none glow-emerald">
 ${Math.floor(estimatedProfit).toLocaleString()}
 </h3>
 <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[40px] -mr-12 -mb-12 rounded-full"/>
 </Card>
 </div>

 <Card className="p-0 glass-dark border-border shadow-2xl overflow-hidden rounded-[2.5rem]">
 <div className="p-6 border-b border-border bg-background/50 flex flex-col md:flex-row gap-6 items-center justify-between transition-colors duration-300">
 <div className="flex items-center w-full rounded-full p-1.5 transition-colors duration-300 bg-card border border-border shadow-sm dark:shadow-none focus-within:ring-2 focus-within:ring-red-400">
 <div className="flex items-center flex-1 pl-4 pr-2">
 <Search className="w-5 h-5 text-muted-foreground"/>
 <input
 type="text"
 placeholder="Rastrear por Factura ID o Método..."
 className="w-full bg-transparent px-3 py-2 outline-none font-medium text-foreground placeholder:text-muted-foreground text-foreground"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>
 <div className="flex items-center gap-3 ml-2">
 <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"/>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
 {filteredSales.length} OPERACIONES ENCONTRADAS
 </span>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/40 border-b border-border">
 <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hidden md:table-cell">Referencia</th>
 <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cronología</th>
 <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hidden md:table-cell">Canal de Pago</th>
 <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Monto Liquido</th>
 <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Control</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {filteredSales.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-8 py-32 text-center text-foreground">
 <div className="flex flex-col items-center opacity-30">
 <FileText className="h-20 w-20 mb-4"strokeWidth={1} />
 <p className="font-black uppercase tracking-[0.4em] text-[10px]">No se detectan registros en esta frecuencia</p>
 </div>
 </td>
 </tr>
 ) : (
 filteredSales?.map((sale) => (
 <tr key={sale.id} className="hover:bg-card transition-colors group">
 <td className="px-8 py-5 whitespace-nowrap hidden md:table-cell">
 <span className="font-mono text-[10px] font-black bg-muted px-3 py-1.5 rounded-lg text-muted-foreground border border-border shadow-inner">
 {sale.id.substring(0, 8).toUpperCase()}
 </span>
 </td>
 <td className="px-8 py-5 whitespace-nowrap">
 <div className="flex items-center gap-3">
 <Calendar className="h-4 w-4 text-brand-500 opacity-50"/>
 <span className="text-sm font-bold">
 {getSafeDate(sale?.created_at)}
 </span>
 </div>
 </td>
 <td className="px-8 py-5 whitespace-nowrap hidden md:table-cell">
 <div className="flex items-center gap-2">
 {(() => {
 const method = (sale.payment_method || 'cash').toLowerCase();
 return (
 <>
 <div className={`h-1.5 w-1.5 rounded-full ${
 method === 'cash' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
 method === 'card' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
 }`} />
 <span className={`text-[9px] font-black uppercase tracking-widest ${
 method === 'cash' ? 'text-green-500' :
 method === 'card' ? 'text-blue-500' : 'text-purple-500'
 }`}>
 {method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'Transferencia'}
 </span>
 </>
 )
 })()}
 </div>
 </td>
 <td className="px-8 py-5 whitespace-nowrap">
 <span className="text-base font-black text-foreground font-outfit tracking-tighter">${(Number(sale.total) || 0).toLocaleString()}</span>
 </td>
 <td className="px-8 py-5 whitespace-nowrap text-right space-x-3">
 <button 
 onClick={() => handleViewDetails(sale)}
 className="p-3 bg-muted text-muted-foreground hover:text-brand-500 hover:bg-brand-500/10 rounded-xl border border-transparent hover:border-brand-500/20 transition-all opacity-40 group-hover:opacity-100"
 title="Ver Detalles"
 >
 <Eye size={18} />
 </button>
 <button 
 onClick={() => handlePrintDirectly(sale)}
 className="p-3 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl border border-transparent hover:border-border transition-all opacity-40 group-hover:opacity-100"
 title="Imprimir Directamente"
 >
 <Printer size={18} />
 </button>
 {!['returned', 'partially_returned'].includes(sale.status) && (
 <button 
 onClick={() => setSaleToReturn(sale)}
 className="p-3 bg-muted text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/20 transition-all opacity-20 group-hover:opacity-100"
 title="Procesar Devolución"
 >
 <RotateCcw size={18} />
 </button>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 <div className="p-6 border-t border-border bg-card text-center">
 <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.5em]">GKAD STOCK - SEGURIDAD NIVEL 5 ENCRIPTADO</p>
 </div>
 </Card>
 </div> {/* Fin de .no-print */}

 {/* DETAIL MODAL - POS Ticket Receipt */}
 {selectedSale && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in no-print">
 <Card className="w-full max-w-[380px] p-0 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden rounded-[2rem] border-none">
 <button 
 onClick={() => setSelectedSale(null)}
 className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-all z-20"
 >
 <X size={18} />
 </button>

 <div className="p-8 pt-10 text-center space-y-2 font-mono">
 <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
 <ShoppingCart className="h-6 w-6 text-foreground"/>
 </div>
 <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tighter">FACTURA DE VENTA</h3>
 <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
 <p>Referencia: {selectedSale?.id?.slice(0, 8).toUpperCase()}</p>
 <p>{getSafeDate(selectedSale?.created_at || selectedSale?.date)}</p>
 </div>
 </div>

 <div className="px-8">
 <div className="border-t border-dashed border-border"/>
 </div>

 <div className="p-8 py-6 space-y-4 font-mono">
 {loadingDetails ? (
 <div className="py-10 flex flex-col items-center justify-center gap-3">
 <Loader2 className="h-8 w-8 text-brand-500 animate-spin"/>
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Recuperando Productos...</p>
 </div>
 ) : (() => {
 const parsedItems = getSafeItems(selectedSale?.items);
 if (parsedItems.length > 0) {
 return (
 <div className="space-y-3">
 <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest pb-1">
 <span>DESCRIPCIÓN</span>
 <span>VALOR</span>
 </div>
 {parsedItems.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between items-start text-[11px] leading-tight text-foreground">
 <div className="flex-1 pr-4">
 <p className="font-bold uppercase">{item?.name || item?.product_name || 'Articulo'}</p>
 <p className="text-[9px] opacity-60">{item?.quantity || 0} x ${(Number(item?.price) || 0).toLocaleString()}</p>
 </div>
 <span className="font-black">${((Number(item?.quantity) || 0) * (Number(item?.price) || 0)).toLocaleString()}</span>
 </div>
 ))}
 </div>
 );
 } else {
 return (
 <p className="py-6 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40 leading-relaxed">
 --- LOS PRODUCTOS NO FUERON <br/> REGISTRADOS EN ESTE FOLIO ---
 </p>
 );
 }
 })()}
 </div>

 <div className="px-8">
 <div className="border-t border-dashed border-border"/>
 </div>

 <div className="p-8 py-6 space-y-2 font-mono text-foreground">
 <div className="flex justify-between text-[11px]">
 <span>SUBTOTAL:</span>
 <span>${(Number(selectedSale?.subtotal) || 0).toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-[11px]">
 <span>IVA (19%):</span>
 <span>${(Number(selectedSale?.tax) || 0).toLocaleString()}</span>
 </div>
 <div className="pt-2 flex justify-between text-base font-black border-t border-dotted border-border mt-2">
 <span>TOTAL:</span>
 <span className="text-foreground font-outfit tracking-tighter text-xl">${(Number(selectedSale?.total) || 0).toLocaleString()}</span>
 </div>
 
 <div className="pt-4 space-y-1 border-t border-border/50 mt-4 opacity-70">
 <div className="flex justify-between text-[10px]">
 <span>PAGÓ CON:</span>
 <span>${(Number(selectedSale?.amount_received) || 0).toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-[10px] font-bold">
 <span>SU CAMBIO:</span>
 <span>${(Number(selectedSale?.change_given) || 0).toLocaleString()}</span>
 </div>
 </div>
 </div>

 <div className="px-8 pb-4">
 <div className="p-4 bg-muted/40 rounded-2xl flex flex-col items-center justify-center space-y-1 text-center border border-border">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Canal de Pago</p>
 <p className="text-xs font-black text-foreground uppercase tracking-tight">{selectedSale?.payment_method || 'EFECTIVO'}</p>
 </div>
 </div>

 <div className="p-8 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-10">
 <Button variant="outline"onClick={() => setSelectedSale(null)} className="h-10 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all">
 CERRAR
 </Button>
 <Button 
 icon={Printer} 
 onClick={() => handlePrint(selectedSale)} 
 disabled={loadingDetails}
 className="h-10 text-[9px] font-black uppercase tracking-widest rounded-xl bg-card text-foreground dark:text-black hover:opacity-90"
 >
 IMPRIMIR
 </Button>
 </div>

 <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent"/>
 </Card>
 </div>
 )}


 {/* ÁREA DE IMPRESIÓN UNIFICADA (Fuente de Verdad Única) */}
 {/* Se renderiza dinámicamente según lo que se necesite imprimir */}
 <PrintableTicket sale={saleToPrint || selectedSale} profile={profile} />
 
 {/* MODAL DE DEVOLUCIÓN (Nivel 2) */}
 {saleToReturn && (
 <ReturnSaleModal 
 sale={saleToReturn} 
 onClose={() => setSaleToReturn(null)}
 onSuccess={() => {
 if (profile?.organization_id) {
 useShopStore.getState().fetchSalesHistory(profile.organization_id, displayLimit);
 }
 }}
 />
 )}

 {/* ARQUEO MODAL - No Print */}
 {arqueoData && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-fade-in no-print">
 <Card className="w-full max-w-lg p-0 glass-dark border-border relative overflow-hidden rounded-[3rem]">
 <button onClick={() => setArqueoData(null)} className="absolute right-8 top-8 p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl z-10"><X size={20} /></button>
 <div className="p-10 border-b border-border bg-brand-500/5">
 <div className="flex items-center gap-4 mb-2">
 <div className="p-3 bg-brand-500 rounded-2xl text-white shadow-xl shadow-brand-500/30 border-2 border-border"><DollarSign className="h-6 w-6"/></div>
 <div>
 <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight">CIERRE DE CAJA</h3>
 <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.3em]">SESIÓN: {arqueoData.date}</p>
 </div>
 </div>
 </div>
 <div className="p-10 space-y-8">
 <div className="space-y-4">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Distribución por Canal</p>
 {Object.entries(arqueoData.totalsByMethod).map(([method, total]: any) => (
 <div key={method} className="flex justify-between items-center group p-4 bg-muted rounded-2xl border border-border">
 <span className="capitalize text-muted-foreground font-black text-[11px] uppercase tracking-widest flex items-center gap-3">
 <div className={`h-2 w-2 rounded-full ${method === 'cash' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : method === 'card' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]'}`} />
 {method === 'cash' ? 'Efectivo Fisico' : method === 'card' ? 'Terminal Bancaria' : 'Transferencia Cloud'}
 </span>
 <span className="font-black text-lg text-foreground font-outfit tracking-tighter">${total.toLocaleString()}</span>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
 <Button variant="outline"onClick={() => setArqueoData(null)} className="h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl">DESCARTAR</Button>
 <Button icon={Printer} onClick={handlePrintArqueo} className="h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl glow-blue">IMPRIMIR REPORTE</Button>
 </div>
 </div>
 </Card>
 </div>
 )}
 </div>
 );
};
