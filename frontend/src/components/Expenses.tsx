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
  category: 'Servicios' | 'Mercancía' | 'Nómina' | 'Otros';
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
            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 shadow-sm">
                <TrendingDown className="h-6 w-6" />
              </div>
              FLUJO DE EGRESOS
            </h2>
            <p className="text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] ml-1">Control de Gastos y Salidas Operativas</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 px-6 py-3 rounded-2xl flex flex-col items-end shadow-md dark:shadow-none backdrop-blur-xl">
              <span className="text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">TOTAL EGRESOS ACUMULADOS</span>
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
          <Card className="p-10 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 shadow-2xl rounded-[3rem] relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Descripción del Evento</label>
                <input 
                  type="text" 
                  placeholder="Ej. Arriendo Local, Nómina..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full h-12 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Clasificación Histórica</label>
                <select 
                  value={formData.category || ''}
                  onChange={e => setFormData({...formData, category: e.target.value as any})}
                  className="w-full h-12 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white outline-none appearance-none cursor-pointer shadow-sm"
                >
                  <option value="Servicios">Servicios</option>
                  <option value="Mercancía">Mercancía</option>
                  <option value="Nómina">Nómina</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Monto de Salida ($)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  className="w-full h-12 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-lg font-black text-red-500 focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-200 dark:placeholder:text-zinc-800 font-outfit shadow-sm"
                />
              </div>
              <button 
                type="submit"
                className="h-12 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-500 dark:hover:bg-brand-500 hover:text-white transition-all active:scale-95 shadow-xl"
              >
                CONSOLIDAR GASTO
              </button>
            </form>
          </Card>
        )}

        {/* TABLA DE GASTOS */}
        <Card className="p-0 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 shadow-md dark:shadow-none overflow-hidden rounded-[2.5rem] flex-1 flex flex-col backdrop-blur-xl">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-zinc-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-200 dark:border-white/5">
                  <th className="px-8 py-5">Cronología</th>
                  <th className="px-8 py-5">Concepto Operativo</th>
                  <th className="px-8 py-5 hidden md:table-cell">Clasificación</th>
                  <th className="px-8 py-5 hidden md:table-cell">Responsable</th>
                  <th className="px-8 py-5 text-right">Monto Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-32 text-zinc-500 dark:text-zinc-600 font-black uppercase tracking-widest text-xs animate-pulse">Analizando Registros...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-32 text-zinc-700">
                      <div className="flex flex-col items-center opacity-30">
                         <ArrowDownRight className="h-16 w-16 mb-4" strokeWidth={1} />
                         <p className="font-black uppercase tracking-[0.4em] text-[10px]">No se detectan egresos en este periodo</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{new Date(exp.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight group-hover:text-brand-500 dark:group-hover:text-white transition-colors">{exp.description}</p>
                      </td>
                      <td className="px-8 py-5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${
                            exp.category === 'Nómina' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' :
                            exp.category === 'Servicios' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' :
                            exp.category === 'Mercancía' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                            'bg-slate-400'
                          }`} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            exp.category === 'Nómina' ? 'text-purple-500' :
                            exp.category === 'Servicios' ? 'text-blue-500' :
                            exp.category === 'Mercancía' ? 'text-orange-500' :
                            'text-slate-500'
                          }`}>
                            {exp.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest hidden md:table-cell">
                         <span className="bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/5">{exp.profiles?.full_name || 'Sistema'}</span>
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
          <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] text-center shrink-0">
             <p className="text-[8px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.5em]">CERTIFICACIÓN DE EGRESOS GKAD CLOUD V4</p>
          </div>
        </Card>
      </div>
    </PlanGuard>
  );
};
