import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
 RotateCcw,
 Check
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
 const [displayLimit, setDisplayLimit] = useState(20); // Límite de registros a mostrar
 const [customMargin, setCustomMargin] = useState<string>(localStorage.getItem('gkad_margin_projection') || '100'); // Margen promedio personalizado

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

 if (timeFilter === 'day') {
   startRange.setHours(0, 0, 0, 0);
 } else if (timeFilter === 'week') {
   startRange.setDate(now.getDate() - 7);
   startRange.setHours(0, 0, 0, 0);
 } else if (timeFilter === 'month') {
   startRange.setDate(1);
   startRange.setHours(0, 0, 0, 0);
 } else if (timeFilter === 'year') {
   startRange.setMonth(0);
   startRange.setDate(1);
   startRange.setHours(0, 0, 0, 0);
 }

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

  const totalGross = useMemo(() => {
  return filteredSales.reduce((acc, sale) => acc + (Number(sale.total) || 0), 0);
  }, [filteredSales]);

  const totalCost = useMemo(() => {
  return filteredSales.reduce((acc, sale) => acc + (Number(sale.total_cost) || 0), 0);
  }, [filteredSales]);

  const estimatedProfit = useMemo(() => {
  return totalGross * (Number(customMargin) / 100);
  }, [totalGross, customMargin]);

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

 // Efecto para recargar cuando cambia el límite, la organización o el filtro de tiempo
 useEffect(() => {
 if (!profile || !profile.organization_id) return;

 const now = new Date();
 const startRange = new Date();
 if (timeFilter === 'day') {
   startRange.setHours(0, 0, 0, 0);
 } else if (timeFilter === 'week') {
   startRange.setDate(now.getDate() - 7);
   startRange.setHours(0, 0, 0, 0);
 } else if (timeFilter === 'month') {
   startRange.setDate(1);
   startRange.setHours(0, 0, 0, 0);
 } else if (timeFilter === 'year') {
   startRange.setMonth(0);
   startRange.setDate(1);
   startRange.setHours(0, 0, 0, 0);
 }
 const startDateStr = startRange.toISOString();
 
 useShopStore.getState().fetchSalesHistory(profile.organization_id, displayLimit, startDateStr);
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
 useShopStore.getState().fetchSalesHistory(profile.organization_id, displayLimit, startDateStr);
 }
 }
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [profile?.organization_id, displayLimit, timeFilter]);

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
 if (!arqueoData) return;
 
 // Generar HTML con estilos inline para impresión
 const printWindow = window.open('', '', 'width=800,height=600');
 if (!printWindow) {
 toast.error('No se pudo abrir ventana de impresión');
 return;
 }
 
 const methodLabels: { [key: string]: string } = {
 cash: 'Efectivo Físico',
 card: 'Terminal Bancaria',
 transfer: 'Transferencia Cloud'
 };
 
 const methodColors: { [key: string]: string } = {
 cash: '#22c55e',
 card: '#3b82f6',
 transfer: '#a855f7'
 };
 
 let methodsHTML = '';
 Object.entries(arqueoData.totalsByMethod).forEach(([method, total]: any) => {
 const color = methodColors[method] || '#666';
 methodsHTML += `
 <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f3f4f6; margin: 12px 0; border-radius: 12px; border: 1px solid #e5e7eb;">
 <span style="color: #666; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 12px;">
 <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 8px rgba(${color}, 0.3);"></div>
 ${methodLabels[method] || method}
 </span>
 <span style="font-weight: 900; font-size: 18px; color: #000;">${(total as number).toLocaleString()}</span>
 </div>
 `;
 });
 
 const html = `
 <!DOCTYPE html>
 <html>
 <head>
 <meta charset="UTF-8">
 <title>Reporte de Arqueo</title>
 <style>
 body {
 font-family: 'Courier New', monospace;
 padding: 20px;
 margin: 0;
 background: white;
 }
 .header {
 border-bottom: 2px solid #000;
 padding-bottom: 20px;
 margin-bottom: 20px;
 text-align: center;
 }
 .header h1 {
 margin: 0;
 font-size: 20px;
 font-weight: 900;
 text-transform: uppercase;
 letter-spacing: 2px;
 }
 .header p {
 margin: 5px 0 0 0;
 font-size: 11px;
 font-weight: 900;
 text-transform: uppercase;
 letter-spacing: 0.2em;
 color: #666;
 }
 .methods-section {
 margin-bottom: 20px;
 }
 .methods-title {
 font-size: 10px;
 font-weight: 900;
 text-transform: uppercase;
 letter-spacing: 0.1em;
 border-bottom: 2px solid #000;
 padding-bottom: 10px;
 margin-bottom: 15px;
 color: #000;
 }
 .footer {
 border-top: 2px solid #000;
 padding-top: 20px;
 margin-top: 20px;
 text-align: center;
 font-size: 10px;
 font-weight: 900;
 text-transform: uppercase;
 letter-spacing: 0.1em;
 color: #666;
 }
 </style>
 </head>
 <body>
 <div class="header">
 <h1>⏱️ CIERRE DE CAJA</h1>
 <p>SESIÓN: ${arqueoData.date}</p>
 </div>
 
 <div class="methods-section">
 <div class="methods-title">Distribución por Canal de Pago</div>
 ${methodsHTML}
 </div>
 
 <div class="footer">
 <p>GKAD STOCK - SISTEMA SEGURO DE AUDITORÍA ENCRIPTADO</p>
 <p>${new Date().toLocaleString()}</p>
 </div>
 </body>
 </html>
 `;
 
 printWindow.document.write(html);
 printWindow.document.close();
 
 // Esperar a que el contenido se cargue antes de imprimir
 printWindow.onload = () => {
 setTimeout(() => {
 printWindow.print();
 printWindow.close();
 }, 500);
 };
 };

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      
      {/* 🟢 CONTENEDOR NO-PRINT */}
      <div className="no-print space-y-12">
        {/* 1. MISSION CONTROL HEADER */}
        <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
          {/* Decorative elements */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
          <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-purple-500/5 blur-[60px] rounded-full pointer-events-none"/>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-10">
            {/* IZQUIERDA: Identidad */}
            <div className="lg:col-span-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"/>
                <FileText size={18} className="text-brand-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Protocolo de Auditoría</span>
              </div>
              <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
                Historial de <span className="text-brand-500">Ventas</span>
              </h1>
              <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Auditoría centralizada de transacciones</p>
            </div>

            {/* CENTRO: Búsqueda y Filtros */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="relative group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors z-10"/>
                <input 
                  type="text"
                  placeholder="Rastrear por ID, cliente o total..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-14 pl-12 pr-6 bg-muted/40 border border-border/50 rounded-2xl text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-muted-foreground shadow-inner"
                />
              </div>

              <div className="flex bg-muted/40 p-1 rounded-2xl border border-border/50 shadow-inner w-fit">
                {(['day', 'week', 'month', 'year'] as FilterRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeFilter(range)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                      timeFilter === range 
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {range === 'day' ? 'Hoy' : range === 'week' ? 'Sem' : range === 'month' ? 'Mes' : 'Año'}
                  </button>
                ))}
              </div>
            </div>

            {/* DERECHA: Acciones */}
            <div className="lg:col-span-4 flex items-center justify-end gap-3">
              <Button 
                onClick={handleRefresh}
                className="h-12 w-12 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all p-0 flex items-center justify-center shadow-inner"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </Button>
              
              <Button 
                className="px-6 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-2xl shadow-brand-500/20 border-none transition-all active:scale-95"
                onClick={fetchArqueo}
                loading={loadingArqueo}
              >
                <DollarSign className="h-4 w-4 mr-2"/>
                Arqueo
              </Button>
            </div>
          </div>
        </Card>

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

 <Card className="glass-dark border-border p-6 rounded-[2rem] flex flex-col justify-center relative overflow-hidden group ring-1 ring-white/5 transition-all duration-300">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-muted rounded-2xl text-muted-foreground border border-border transition-all duration-500">
 <ArrowDownRight className="h-5 w-5"/>
 </div>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rendimiento</span>
 </div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">% MARGEN PROMEDIO</p>
 <div className="flex items-center gap-2">
 <div className="flex items-center w-full sm:w-32 rounded-xl transition-all duration-300 bg-card border border-border shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:shadow-none focus-within:ring-2 focus-within:ring-brand-500">
 <input
 type="number"
 value={customMargin}
 onChange={(e) => setCustomMargin(e.target.value)}
 className="w-full bg-transparent text-foreground font-bold text-2xl text-center py-2 pl-4 outline-none"
 placeholder="100"
 />
 <span className="text-foreground font-bold text-2xl pr-4">%</span>
 </div>
 <button 
 onClick={() => {
 localStorage.setItem('gkad_margin_projection', customMargin);
 toast.success('Margen proyectado guardado con éxito');
 }}
 className="h-12 w-12 flex items-center justify-center bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
 title="Guardar margen por defecto"
 >
 <Check size={20} strokeWidth={3} />
 </button>
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
 <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
 <th className="px-8 py-5 hidden md:table-cell">Referencia</th>
 <th className="px-8 py-5">Cronología</th>
 <th className="px-8 py-5 hidden md:table-cell">Canal de Pago</th>
 <th className="px-8 py-5">Monto Liquido</th>
 <th className="px-8 py-5 text-right">Control</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
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
 <tr key={sale.id} className="hover:bg-muted/30 transition-colors text-xs font-bold group">
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
 {arqueoData && createPortal(
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)'
    }}
  >
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '520px',
      maxHeight: '85vh',
      overflowY: 'auto',
      margin: '0 16px',
      borderRadius: '24px',
      background: 'var(--color-card)',
    }}>
      <Card className="w-full p-0 glass-dark border-border relative rounded-[3rem]">
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
  </div>,
  document.body
)}
 </div>
 );
};
