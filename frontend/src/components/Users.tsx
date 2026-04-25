import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui-components';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2, 
  X,
  Loader2,
  AlertCircle,
  ArrowUpCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'vendedor' | 'super_admin';
  status: 'active' | 'inactive';
  creator_name?: string;
  organization_name?: string;
}

export const Users = () => {
  const { profile } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor' as 'admin' | 'vendedor',
    status: 'active' as 'active' | 'inactive'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/users');
      setEmployees(data || []);
    } catch (error) {
      toast.error('Error al cargar personal');
    }
  };

  const currentPlan = profile?.organizations?.plan || 'Esencial';
  const limits: Record<string, number> = { 'Esencial': 1, 'Avanzado': 3, 'Emprendedor': 25 };
  const userLimit = limits[currentPlan] || Infinity;
  const isLimitReached = employees.length >= userLimit;

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/users', {
        email: newEmployee.email,
        password: newEmployee.password,
        fullName: newEmployee.name,
        role: newEmployee.role
      });
      toast.success('Usuario creado correctamente');
      fetchData();
      setIsModalOpen(false);
      setNewEmployee({ name: '', email: '', password: '', role: 'vendedor', status: 'active' });
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario? Perderá el acceso permanentemente.')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuario eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-8 animate-slide-up flex-1 min-h-full">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
            <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-500 shadow-sm">
              <UsersIcon className="h-6 w-6" />
            </div>
            ESTRUCTURA DE EQUIPO
          </h2>
          <p className="text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] ml-1">Control de Accesos y Jerarquía Operativa</p>
        </div>
        {profile?.role === 'super_admin' && (
          <Button 
            className={`h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border ${
              isLimitReached 
              ? 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5 cursor-not-allowed' 
              : 'glow-blue border-brand-400/30'
            }`}
            icon={isLimitReached ? AlertCircle : UserPlus} 
            onClick={() => !isLimitReached && setIsModalOpen(true)}
            disabled={isLimitReached}
          >
            {isLimitReached ? 'LÍMITE ALCANZADO' : 'VINCULAR COLABORADOR'}
          </Button>
        )}
      </div>

      {isLimitReached && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between group animate-in slide-in-from-top-2">
           <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500 h-5 w-5" />
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                 Tu plan <span className="underline">{currentPlan}</span> está limitado a {userLimit} usuario(s). Has alcanzado el máximo permitido.
              </p>
           </div>
           <button 
             onClick={() => window.location.hash = '#/settings'}
             className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-tighter hover:scale-105 transition-all"
           >
              <ArrowUpCircle size={14} /> MEJORAR PLAN
           </button>
        </div>
      )}

      {/* TABLE */}
      <Card className="p-0 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 shadow-md dark:shadow-none overflow-hidden rounded-[2.5rem] flex-1 backdrop-blur-xl">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-zinc-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-200 dark:border-white/5">
                <th className="px-8 py-5">Identidad / Perfil</th>
                <th className="px-8 py-5">Canal de Contacto</th>
                <th className="px-8 py-5">Trazabilidad (Creador)</th>
                <th className="px-8 py-5 text-center">Estado de Red</th>
                <th className="px-8 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {loading ? (
                 <tr>
                    <td colSpan={5} className="text-center py-32">
                       <div className="flex flex-col items-center animate-pulse">
                          <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sincronizando nómina...</p>
                       </div>
                    </td>
                 </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-32 text-zinc-700">
                    <div className="flex flex-col items-center opacity-30">
                       <UsersIcon className="h-16 w-16 mb-4" strokeWidth={1} />
                       <p className="font-black uppercase tracking-[0.4em] text-[10px]">No se detectan registros de personal</p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-black text-sm font-outfit shadow-lg shadow-brand-500/5 group-hover:scale-110 transition-transform">
                          {(emp.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-zinc-100 uppercase tracking-tight font-outfit group-hover:text-brand-500 dark:group-hover:text-white transition-colors">{emp.full_name}</p>
                          <div className="flex items-center gap-2">
                             <Shield className={`h-3 w-3 ${emp.role === 'admin' ? 'text-purple-500' : emp.role === 'super_admin' ? 'text-brand-500' : 'text-blue-500'}`} />
                             <span className={`text-[9px] font-black uppercase tracking-widest ${emp.role === 'admin' ? 'text-purple-500' : emp.role === 'super_admin' ? 'text-brand-500' : 'text-blue-500'}`}>
                                {emp.role === 'super_admin' ? 'ROOT' : emp.role === 'admin' ? 'ADMINISTRADOR' : 'OPERADOR POS'}
                             </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-500 dark:text-zinc-400 text-sm font-bold font-mono group-hover:text-slate-900 dark:group-hover:text-zinc-200 transition-colors lowercase">{emp.email}</td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <p className="text-[10px] font-black text-slate-700 dark:text-zinc-300 font-outfit uppercase tracking-tight">{emp.creator_name || 'Sistema'}</p>
                          <p className="text-[9px] text-slate-400 dark:text-zinc-600 font-bold uppercase tracking-widest">{emp.organization_name || 'SaaS'}</p>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] transition-all shadow-sm">
                        <div className={`h-2 w-2 rounded-full ${
                          emp.status === 'active' 
                            ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' 
                            : 'bg-slate-400 dark:bg-zinc-600'
                        }`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          emp.status === 'active' ? 'text-green-500' : 'text-slate-400 dark:text-zinc-500'
                        }`}>
                          {emp.status === 'active' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-20 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-3 bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] text-center">
           <p className="text-[8px] font-black text-slate-400 dark:text-zinc-700 uppercase tracking-[0.5em]">PROTOCOLO DE SEGURIDAD GKAD V4 ACTIVADO</p>
        </div>
      </Card>

      {/* ADD USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          
          <Card className="relative w-full max-w-xl p-0 glass-dark border-zinc-200 dark:border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden rounded-[3rem]">
            <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="p-10 border-b border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">ALTA DE COLABORADOR</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Asignación de Credenciales y Roles</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 rounded-2xl transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddEmployee} className="p-10 space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nombre Legal Completo</label>
                 <input 
                    type="text" 
                    placeholder="Ej. Andrés Garcia"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    required
                    className="w-full h-14 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 shadow-sm"
                 />
              </div>
              
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Identificador (Email)</label>
                 <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 dark:text-zinc-600 group-focus-within:text-brand-500 transition-colors" />
                    <input 
                       type="email"
                       placeholder="andres@tienda.com"
                       value={newEmployee.email}
                       onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                       required
                       className="w-full h-14 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono shadow-sm"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Contraseña Operativa</label>
                 <input 
                    type="password"
                    placeholder="••••••••"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    required
                    className="w-full h-14 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 shadow-sm"
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nivel de Autorización</label>
                 <div className="grid grid-cols-2 gap-4">
                    <button
                       type="button"
                       onClick={() => setNewEmployee({...newEmployee, role: 'admin'})}
                       className={`h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${newEmployee.role === 'admin' ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-500'}`}
                    >
                       Administrador
                    </button>
                    <button
                       type="button"
                       onClick={() => setNewEmployee({...newEmployee, role: 'vendedor'})}
                       className={`h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${newEmployee.role === 'vendedor' ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-500'}`}
                    >
                       Vendedor
                    </button>
                 </div>
              </div>

              <Button 
                type="submit"
                className="w-full h-16 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                REGISTRAR COLABORADOR
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

