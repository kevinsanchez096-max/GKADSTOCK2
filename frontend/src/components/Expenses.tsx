import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui-components';
import { 
 Plus, 
 Search, 
 ArrowDownRight,
 Loader2,
 Calendar,
 Layers,
 ArrowRight,
 TrendingDown,
 Trash2
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { PlanGuard } from './common/PlanGuard';

interface Expense {
 id: string;
 description: string;
 amount: number;
 category: 'Servicios' | 'Mercancía' | 'Nómina' | 'Otros' | 'MERMA_INVENTARIO';
 created_at: string;
 profiles?: { full_name: string };
}

export const Expenses = () => {
 const [expenses, setExpenses] = useState<Expense[]>([]);
 const [loading, setLoading] = useState(true);
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [formData, setFormData] = useState({
 description: '',
 amount: '',
 category: 'Otros' as const
 });

 const { profile } = useAuthStore();

 const fetchData = async () => {
 setLoading(true);
 try {
 const data = await api.get('/expenses');
 setExpenses(data || []);
 } catch (error) {
 toast.error('Error al cargar egresos');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!profile?.organization_id) return;
 
 try {
 await api.post('/expenses', {
 ...formData,
 amount: Number(formData.amount)
 });
 toast.success('Gasto registrado');
 setFormData({ description: '', amount: '', category: 'Otros' });
 setIsFormOpen(false);
 fetchData();
 } catch (error) {
 toast.error('Error al registrar gasto');
 }
 };

 const totalExpensesValue = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

 return (
 <PlanGuard restrictedPlans={['Esencial']} moduleName="Gestión de Gastos">
 <div className="space-y-8 animate-slide-up flex-1 min-h-full flex flex-col">
 
 {/* HEADER ESTRATÉGICO */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
 <div className="space-y-1">
 <h2 className="text-3xl font-black text-foreground flex items-center gap-3 font-outfit uppercase tracking-tight">
 <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 shadow-sm">
 <TrendingDown className="h-6 w-6"/>
 </div>
 FLUJO DE EGRESOS
 </h2>
 <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-[10px] ml-1">Control de Gastos y Salidas Operativas</p>
 </div>

 <div className="flex items-center gap-4">
 <div className="bg-card border border-border px-6 py-3 rounded-2xl flex flex-col items-end shadow-md dark:shadow-none backdrop-blur-xl">
 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">TOTAL EGRESOS ACUMULADOS</span>
 <span className="text-2xl font-black text-red-500 font-outfit tracking-tighter">-${totalExpensesValue.toLocaleString()}</span>
 </div>
 <button 
 onClick={() => setIsFormOpen(!isFormOpen)}
 className="h-14 px-8 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-red-500/20"
 >
 {isFormOpen ? 'CANCELAR' : 'REGISTRAR SALIDA'}
 </button>
 </div>
 </div>

 {isFormOpen && (
 <Card className="p-10 bg-card border border-border shadow-2xl rounded-[3rem] relative overflow-hidden animate-in fade-in zoom-in duration-300">
 <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none"/>
 
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Descripción del Evento</label>
 <input 
 type="text"
 placeholder="Ej. Arriendo Local, Nómina..."
 value={formData.description}
 onChange={e => setFormData({...formData, description: e.target.value})}
 className="w-full h-12 bg-card border border-border rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Clasificación Histórica</label>
 <select 
 value={formData.category || ''}
 onChange={e => setFormData({...formData, category: e.target.value as any})}
 className="w-full h-12 bg-card border border-border rounded-xl px-4 text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-500 text-foreground outline-none appearance-none cursor-pointer shadow-sm"
 >
 <option value="Servicios">Servicios</option>
 <option value="Mercancía">Mercancía</option>
 <option value="Nómina">Nómina</option>
 <option value="Otros">Otros</option>
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Monto de Salida ($)</label>
 <input 
 type="number"
 placeholder="0.00"
 value={formData.amount}
 onChange={e => setFormData({...formData, amount: e.target.value})}
 className="w-full h-12 bg-card border border-border rounded-xl px-4 text-lg font-black text-red-500 focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-muted-foreground dark:placeholder:text-foreground font-outfit shadow-sm"
 />
 </div>
 <button 
 type="submit"
 className="h-12 bg-card text-white dark:text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-500 dark:hover:bg-brand-500 hover:text-white transition-all active:scale-95 shadow-xl"
 >
 CONSOLIDAR GASTO
 </button>
 </form>
 </Card>
 )}

 {/* TABLA DE GASTOS */}
 <Card className="p-0 bg-card border border-border shadow-md dark:shadow-none overflow-hidden rounded-[2.5rem] flex-1 flex flex-col backdrop-blur-xl">
 <div className="overflow-x-auto flex-1">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
 <th className="px-8 py-5">Cronología</th>
 <th className="px-8 py-5">Concepto Operativo</th>
 <th className="px-8 py-5 hidden md:table-cell">Clasificación</th>
 <th className="px-8 py-5 hidden md:table-cell">Responsable</th>
 <th className="px-8 py-5 text-right">Monto Líquido</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {loading ? (
 <tr><td colSpan={5} className="text-center py-32 text-muted-foreground font-black uppercase tracking-widest text-xs animate-pulse">Analizando Registros...</td></tr>
 ) : expenses.length === 0 ? (
 <tr>
 <td colSpan={5} className="text-center py-32 text-foreground">
 <div className="flex flex-col items-center opacity-30">
 <ArrowDownRight className="h-16 w-16 mb-4"strokeWidth={1} />
 <p className="font-black uppercase tracking-[0.4em] text-[10px]">No se detectan egresos en este periodo</p>
 </div>
 </td>
 </tr>
 ) : (
 expenses.map((exp) => (
 <tr key={exp.id} className="hover:bg-muted transition-colors group">
 <td className="px-8 py-5 whitespace-nowrap">
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{new Date(exp.created_at).toLocaleDateString()}</span>
 </td>
 <td className="px-8 py-5">
 <div className="flex flex-col">
 <span className="text-sm font-bold text-foreground uppercase tracking-tight group-hover:text-brand-500 dark:group-hover:text-foreground transition-colors">
 {exp.description}
 </span>
 {exp.category === 'MERMA_INVENTARIO' ? (
 <span className="mt-1.5 w-max px-2.5 py-0.5 text-[9px] font-black text-orange-600 bg-orange-100 rounded-full dark:text-orange-400 dark:bg-orange-500/10 uppercase tracking-widest border border-orange-200 dark:border-orange-500/20">
 Pérdida / Merma
 </span>
 ) : (
 <span className="mt-1.5 w-max px-2.5 py-0.5 text-[9px] font-black text-muted-foreground bg-muted rounded-full uppercase tracking-widest border border-border">
 Gasto Operativo
 </span>
 )}
 </div>
 </td>
 <td className="px-8 py-5 hidden md:table-cell">
 <div className="flex items-center gap-2">
 <div className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${
 exp.category === 'Nómina' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' :
 exp.category === 'Servicios' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' :
 exp.category === 'Mercancía' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
 exp.category === 'MERMA_INVENTARIO' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
 'bg-muted-foreground'
 }`} />
 <span className={`text-[9px] font-black uppercase tracking-widest ${
 exp.category === 'Nómina' ? 'text-purple-500' :
 exp.category === 'Servicios' ? 'text-blue-500' :
 exp.category === 'Mercancía' ? 'text-amber-500' :
 exp.category === 'MERMA_INVENTARIO' ? 'text-orange-500' :
 'text-muted-foreground'
 }`}>
 {exp.category === 'MERMA_INVENTARIO' ? 'MERMA' : exp.category}
 </span>
 </div>
 </td>
 <td className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:table-cell">
 <span className="bg-muted px-3 py-1 rounded-lg border border-border">{exp.profiles?.full_name || 'Sistema'}</span>
 </td>
 <td className="px-8 py-5 text-right">
 <span className="text-lg font-black text-red-500 font-outfit tracking-tighter">-${Number(exp.amount).toLocaleString()}</span>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 <div className="p-6 border-t border-border bg-muted text-center shrink-0">
 <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.5em]">CERTIFICACIÓN DE EGRESOS GKAD CLOUD V4</p>
 </div>
 </Card>
 </div>
 </PlanGuard>
 );
};
