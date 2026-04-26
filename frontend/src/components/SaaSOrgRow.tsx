import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  MoreVertical, 
  Users, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  Settings,
  Eye,
  Trash2,
  Loader2,
  X,
  ShieldAlert,
  Ghost,
  Edit2,
  Mail,
  User,
  ShieldCheck,
  CreditCard,
  Key
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from './ui-components';

interface Org {
  id: string;
  name: string;
  is_active: boolean;
  plan: string;
  health_status: string;
  adminCount: number;
  vendedorCount: number;
  billing_status: string;
  next_billing_date: string;
  license_price: number;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  last_active?: string;
}

interface SaaSOrgRowProps {
  org: Org;
  isExpanded: boolean;
  onToggle: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onRefresh: () => void;
}

export const SaaSOrgRow = ({ org, isExpanded, onToggle, isMenuOpen, onToggleMenu, onRefresh }: SaaSOrgRowProps) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  
  // MODALES ORGANIZACIÓN
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [newBillingDate, setNewBillingDate] = useState(org.next_billing_date ? org.next_billing_date.split('T')[0] : '');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // MODALES USUARIOS (GOD MODE)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    status: ''
  });
  
  // MODO INYECCIÓN (GOD MODE)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'vendedor'>('vendedor');
  const [isInjecting, setIsInjecting] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.get(`/saas/organizations/${org.id}/users`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Fallo al sincronizar personal');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const nextActive = !org.is_active;
      await api.patch(`/saas/organizations/${org.id}/status`, { is_active: nextActive });
      toast.success(nextActive ? `Empresa ${org.name} Activa` : `Empresa ${org.name} Suspendida`);
      onRefresh();
    } catch (error: any) {
      toast.error('No se pudo cambiar el estado');
    } finally {
      setTogglingStatus(false);
      onToggleMenu();
    }
  };

  const handleToggleBilling = async () => {
    setTogglingStatus(true);
    try {
      const nextStatus = org.billing_status === 'activo' ? 'suspendido' : 'activo';
      await api.patch(`/saas/organizations/${org.id}`, { billing_status: nextStatus });
      toast.success(nextStatus === 'activo' ? `Licencia de ${org.name} Reactivada` : `Licencia de ${org.name} Suspendida`);
      onRefresh();
    } catch (error: any) {
      toast.error('No se pudo cambiar el estado de facturación');
    } finally {
      setTogglingStatus(false);
      onToggleMenu();
    }
  };

  const handleDeleteOrganization = async () => {
    if (confirmName.trim().toUpperCase() !== org.name.trim().toUpperCase()) {
      toast.error('El nombre de la organización no coincide');
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete(`/saas/organizations/${org.id}`);
      toast.success('Organización purgada permanentemente');
      onRefresh();
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      toast.error('Error crítico en borrado');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePlan = async (newPlan: string) => {
    setIsUpdatingPlan(true);
    try {
      const data = await api.patch(`/saas/organizations/${org.id}`, { plan: newPlan });
      toast.success(`Plan actualizado a ${newPlan}. El nuevo costo de $${Number(data.license_price).toLocaleString()} se aplicará en el siguiente corte.`);
      onRefresh();
      setIsChangePlanModalOpen(false);
    } catch (error: any) {
      toast.error('Error al actualizar el plan de suscripción');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleUpdateBillingDate = async () => {
    setIsUpdatingPlan(true);
    try {
      await api.patch(`/saas/organizations/${org.id}`, { next_billing_date: newBillingDate });
      toast.success(`Fecha de corte actualizada al ${newBillingDate}`);
      onRefresh();
      setIsDateModalOpen(false);
    } catch (error: any) {
      toast.error('Error al actualizar la fecha de facturación');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsUpdatingUser(true);
    try {
      await api.patch(`/saas/users/${selectedUser.id}`, editFormData);
      toast.success(`Credenciales de ${editFormData.full_name} actualizadas`);
      fetchUsers();
      onRefresh();
      setIsEditUserModalOpen(false);
    } catch (error: any) {
      toast.error('Error al actualizar: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeletingUser(true);
    try {
      await api.delete(`/saas/users/${selectedUser.id}`);
      toast.success(`Usuario purgado permanentemente`);
      fetchUsers();
      onRefresh();
      setIsDeleteUserModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'No se puede eliminar al último administrador');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleInjectUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInjecting(true);
    try {
      await api.post(`/saas/organizations/${org.id}/users`, {
        full_name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      toast.success('Usuario inyectado con éxito');
      setIsAddUserModalOpen(false);
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al inyectar usuario');
    } finally {
      setIsInjecting(false);
    }
  };

  useEffect(() => {
    if (isExpanded) fetchUsers();
  }, [isExpanded]);

  const planStyles: Record<string, string> = {
    'Premium': 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/40',
    'Emprendedor': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'Avanzado': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Esencial': 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  };

  const currentPlanStyle = planStyles[org.plan] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

  return (
    <>
      <tr className={`group/row transition-colors hover:bg-white/[0.03] ${!org.is_active || org.billing_status === 'suspendido' ? 'opacity-50 grayscale' : ''}`}>
        {/* ID Nodo */}
        <td className="px-8 py-5 text-[10px] font-mono text-white/30 uppercase tracking-tighter">
          {org.id.split('-')[0]}
        </td>

        {/* Empresa */}
        <td className="px-8 py-5" onClick={onToggle}>
           <div className="flex items-center gap-4 cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover/row:text-white transition-all">
                 <Building2 size={18} />
              </div>
              <div>
                 <p className="text-[12px] font-black text-white uppercase tracking-tight">{org.name}</p>
                 <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Inquilino Activo</p>
              </div>
           </div>
        </td>

        {/* Plan */}
        <td className="px-8 py-5">
           <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${currentPlanStyle}`}>
              {org.plan}
           </span>
        </td>

        {/* Usuarios */}
        <td className="px-8 py-5">
           <div className="flex items-center gap-2 text-white/40">
              <Users size={12} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                 {org.adminCount + org.vendedorCount} PERS.
              </span>
           </div>
        </td>

        {/* Estado */}
        <td className="px-8 py-5">
           <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${org.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${org.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                 {org.is_active ? 'Online' : 'Offline'}
              </span>
           </div>
        </td>

        {/* Acciones */}
        <td className="px-8 py-5 text-right">
           <div className="flex items-center justify-end gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-black text-white/60 hover:text-white border border-white/5 transition-all uppercase tracking-widest"
              >
                Gestionar
              </button>
              
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-all"
                >
                   <MoreVertical size={16} />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-10 w-52 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(); }} className={`w-full flex items-center gap-4 px-4 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${org.is_active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                      <AlertCircle size={16} /> {org.is_active ? 'Suspender Operación' : 'Activar Operación'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleBilling(); }} className={`w-full flex items-center gap-4 px-4 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${org.billing_status === 'activo' ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                      <CreditCard size={16} /> {org.billing_status === 'activo' ? 'Suspender Licencia' : 'Reactivar Licencia'}
                    </button>
                    <div className="h-px bg-white/5 my-2 mx-2" />
                    <button onClick={(e) => { e.stopPropagation(); setIsChangePlanModalOpen(true); onToggleMenu(); }} className="w-full flex items-center gap-4 px-4 py-3 text-[10px] font-black text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all uppercase tracking-widest">
                      <Settings size={16} /> Ajustar Plan
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); onToggleMenu(); }} className="w-full flex items-center gap-4 px-4 py-3 text-[10px] font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest">
                      <Trash2 size={16} /> Purgar Datos
                    </button>
                  </div>
                )}
              </div>
           </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-8 py-10 bg-white/[0.01]">
             <div className="animate-in slide-in-from-top-4 duration-500">
           <div className="h-px bg-slate-100 dark:bg-white/5 mb-8" />
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Gestión Maestra de Personal</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold">Modo Dios: Control total sobre todos los roles del inquilino</p>
                 </div>
                 <button 
                   onClick={() => setIsAddUserModalOpen(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                 >
                    <UserPlus size={14} /> Inyectar Usuario
                 </button>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950/20 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-slate-100 dark:bg-zinc-900/50">
                          <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Usuario</th>
                          <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Email</th>
                          <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Rol</th>
                          <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Estado</th>
                          <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Poderes</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                       {loadingUsers ? (
                         <tr><td colSpan={5} className="py-20 text-center animate-pulse text-[10px] font-black text-slate-400">Sincronizando Auth...</td></tr>
                       ) : users.length === 0 ? (
                         <tr><td colSpan={5} className="py-20 text-center text-slate-400 grayscale opacity-20"><Ghost size={40} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase">Sin Personal Registrado</p></td></tr>
                       ) : (
                         users.map(user => (
                           <tr key={user.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors group/row">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 dark:border-white/5">
                                       {user.full_name?.charAt(0)}
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase">{user.full_name}</p>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-[11px] font-medium text-slate-500 lowercase">{user.email}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                                    {user.role}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-1.5">
                                    <div className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className="text-[9px] font-bold text-slate-600 dark:text-zinc-500 uppercase">{user.status}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => { setSelectedUser(user); setIsResetModalOpen(true); }} 
                                      className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                      title="Restablecer Contraseña"
                                    >
                                       <Key size={16} />
                                    </button>
                                    <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => { setSelectedUser(user); setIsDeleteUserModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                 </div>
                              </td>
                           </tr>
                         ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* --- MODALES DE PODER (MODO DIOS) --- */}

           {/* 1. EDITAR USUARIO */}
           {isEditUserModalOpen && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20">
                            <Edit2 size={24} />
                         </div>
                         <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase font-outfit">Ajustar Credenciales</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sincronización directa con Auth & Database</p>
                         </div>
                      </div>
                      <button onClick={() => setIsEditUserModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 rounded-full transition-all"><X size={20} /></button>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-4">
                         <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                              type="text" 
                              className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                              value={editFormData.full_name}
                              onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                              placeholder="Nombre Completo"
                            />
                         </div>
                         <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                              type="email" 
                              className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                              value={editFormData.email}
                              onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                              placeholder="Email Profesional"
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <select 
                              value={editFormData.role}
                              onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                              className="h-14 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold"
                            >
                               <option value="admin">Administrador</option>
                               <option value="vendedor">Vendedor</option>
                               <option value="cashier">Cajero</option>
                            </select>
                            <select 
                              value={editFormData.status}
                              onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                              className="h-14 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold"
                            >
                               <option value="active">Activo</option>
                               <option value="inactive">Suspendido</option>
                            </select>
                         </div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         <Button 
                           className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl"
                           onClick={handleUpdateUser}
                           loading={isUpdatingUser}
                         >
                            SINCRONIZAR CAMBIOS
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* 1.5 RESTABLECER CONTRASEÑA MAESTRA */}
           {isResetModalOpen && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-emerald-500/20 rounded-[2.5rem] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="h-12 w-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                         <Key size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase font-outfit leading-tight">Restablecer Acceso</h3>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Usuario: {selectedUser?.full_name}</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nueva Clave Temporal</label>
                         <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                              type="text" 
                              className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                              placeholder="Ej: Gkad2026*"
                              value={newResetPassword}
                              onChange={(e) => setNewResetPassword(e.target.value)}
                            />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <Button 
                           className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20"
                           onClick={async () => {
                             if (!newResetPassword) {
                               toast.error('Ingresa una contraseña válida');
                               return;
                             }
                             setIsUpdatingUser(true);
                             try {
                               await api.post(`/saas/users/${selectedUser?.id}/reset-password`, { newPassword: newResetPassword });
                               toast.success('Contraseña actualizada con éxito');
                               setIsResetModalOpen(false);
                               setNewResetPassword('');
                             } catch (error) {
                               toast.error('Fallo en el restablecimiento administrativo');
                             } finally {
                               setIsUpdatingUser(false);
                             }
                           }}
                           loading={isUpdatingUser}
                         >
                            FORZAR CAMBIO
                         </Button>
                         <button 
                           onClick={() => { setIsResetModalOpen(false); setNewResetPassword(''); }} 
                           className="w-full h-12 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all"
                         >
                           Cancelar
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* 2. BORRAR USUARIO (CONFIRMACIÓN) */}
           {isDeleteUserModalOpen && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-red-500/20 rounded-[2.5rem] shadow-2xl p-6 md:p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                   <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-red-500/20">
                      <Trash2 size={32} />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase font-outfit mb-4 tracking-tight">¿Eliminar Usuario?</h3>
                   <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
                      Esta acción revocará todos los accesos del usuario <span className="text-red-500 font-black">"{selectedUser?.full_name}"</span> de forma permanente.
                   </p>
                   <div className="space-y-3">
                      <Button 
                        className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest"
                        onClick={handleDeleteUser}
                        loading={isDeletingUser}
                      >
                         ELIMINAR AHORA
                      </Button>
                      <button onClick={() => setIsDeleteUserModalOpen(false)} className="w-full h-14 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                   </div>
                </div>
             </div>
           )}

           {/* 3. MODAL DE PURGA ORGANIZACIÓN */}
           {isDeleteModalOpen && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-red-500/20 rounded-[2.5rem] shadow-2xl p-6 md:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                   <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
                   <div className="text-center space-y-6">
                      <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-3xl mx-auto flex items-center justify-center border border-red-500/20">
                         <ShieldAlert size={32} />
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-2xl font-black text-slate-900 dark:text-white font-outfit uppercase tracking-tighter">¿Purgar Inquilino?</h4>
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            Escribe <span className="text-red-500 font-black">"{org.name}"</span> para borrar todo.
                         </p>
                      </div>
                      <div className="space-y-4">
                         <input 
                           type="text" 
                           className="w-full h-14 px-6 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-red-500 uppercase tracking-tighter outline-none focus:ring-2 focus:ring-red-500/50"
                           placeholder={org.name}
                           value={confirmName}
                           onChange={(e) => setConfirmName(e.target.value)}
                         />
                         <Button 
                           className={`w-full h-14 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${confirmName.trim().toUpperCase() === org.name.trim().toUpperCase() ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 text-slate-300 pointer-events-none dark:bg-zinc-900 dark:text-zinc-800'}`}
                           onClick={handleDeleteOrganization}
                           loading={isDeleting}
                         >
                           CONFIRMAR PURGA TOTAL
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* 4. MODAL DE INYECCIÓN (GOD MODE) */}
           {isAddUserModalOpen && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in">
                <form 
                 onSubmit={handleInjectUser}
                 className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-blue-500/30 rounded-[3rem] shadow-2xl p-6 md:p-10 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col"
                >
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                   
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-5">
                         <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <UserPlus size={28} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase font-outfit tracking-tight">Inyectar Identidad</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Acceso Maestro para {org.name}</p>
                         </div>
                      </div>
                      <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><X size={24} /></button>
                   </div>

                   <div className="space-y-5">
                      <div className="relative">
                         <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                         <input 
                           required
                           type="text" 
                           placeholder="Nombre del Operador"
                           className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                           value={newUserName}
                           onChange={(e) => setNewUserName(e.target.value)}
                         />
                      </div>

                      <div className="relative">
                         <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                         <input 
                           required
                           type="email" 
                           placeholder="Email de Conexión"
                           className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                           value={newUserEmail}
                           onChange={(e) => setNewUserEmail(e.target.value)}
                         />
                      </div>

                      <div className="relative">
                         <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                         <input 
                           required
                           type="password" 
                           placeholder="Clave Maestra"
                           className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                           value={newUserPassword}
                           onChange={(e) => setNewUserPassword(e.target.value)}
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <button 
                           type="button"
                           onClick={() => setNewUserRole('admin')}
                           className={`h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${newUserRole === 'admin' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-slate-100 dark:border-white/5'}`}
                         >
                            <ShieldCheck size={18} className={newUserRole === 'admin' ? 'text-blue-600' : 'text-slate-300'} />
                            <span className={`text-[9px] font-black uppercase ${newUserRole === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}>Administrador</span>
                         </button>
                         <button 
                           type="button"
                           onClick={() => setNewUserRole('vendedor')}
                           className={`h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${newUserRole === 'vendedor' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-slate-100 dark:border-white/5'}`}
                         >
                            <User size={18} className={newUserRole === 'vendedor' ? 'text-blue-600' : 'text-slate-300'} />
                            <span className={`text-[9px] font-black uppercase ${newUserRole === 'vendedor' ? 'text-blue-600' : 'text-slate-400'}`}>Vendedor</span>
                         </button>
                      </div>

                      <div className="pt-6">
                         <Button 
                           type="submit"
                           className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20"
                           loading={isInjecting}
                         >
                            EJECUTAR INYECCIÓN
                         </Button>
                      </div>
                   </div>
                </form>
             </div>
           )}
           {/* 5. MODAL DE CAMBIO DE PLAN */}
           {isChangePlanModalOpen && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-blue-500/20 rounded-[3rem] shadow-2xl p-6 md:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                   <button 
                     onClick={() => setIsChangePlanModalOpen(false)} 
                     className="absolute top-8 right-10 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                   >
                     <X size={24} />
                   </button>

                   <div className="flex items-center gap-6 mb-10">
                      <div className="h-16 w-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                         <ShieldCheck size={32} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase font-outfit tracking-tight">Cambiar Plan: {org.name}</h3>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Actualización de Licencia y Capacidades</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'Esencial', price: 39000, desc: 'POS Básico', color: 'slate' },
                        { id: 'Avanzado', price: 65000, desc: 'Inventario Detallado', color: 'blue' },
                        { id: 'Emprendedor', price: 95000, desc: 'Gestión Administrativa', color: 'indigo' },
                        { id: 'Premium', price: 145000, desc: 'Contabilidad Completa', color: 'amber' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          disabled={isUpdatingPlan || org.plan === p.id}
                          onClick={() => handleUpdatePlan(p.id)}
                          className={`p-6 rounded-[2rem] border-2 text-left transition-all relative group overflow-hidden ${
                            org.plan === p.id 
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10 cursor-default' 
                            : 'border-slate-100 dark:border-white/5 hover:border-blue-500/50 bg-slate-50/50 dark:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                               p.color === 'slate' ? 'bg-slate-200 text-slate-700' :
                               p.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                               p.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                               'bg-amber-100 text-amber-600'
                             }`}>
                               {p.id}
                             </span>
                             {org.plan === p.id && <CheckCircle2 className="text-blue-600 h-5 w-5" />}
                          </div>
                          <p className="text-2xl font-black text-slate-900 dark:text-white font-outfit mb-1">${p.price.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest">{p.desc}</p>
                          
                          {isUpdatingPlan && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 animate-spin text-blue-500" />}
                        </button>
                      ))}
                   </div>

                   <div className="mt-10 p-6 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] text-slate-500 dark:text-zinc-600 font-bold uppercase tracking-widest text-center leading-relaxed">
                         El cambio de plan modifica inmediatamente el costo de la licencia y las capacidades operativas del inquilino.
                      </p>
                   </div>
                </div>
             </div>
           )}
           {/* 6. MODAL DE CAMBIO DE FECHA DE CORTE */}
           {isDateModalOpen && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-emerald-500/20 rounded-[3rem] shadow-2xl p-10 relative overflow-hidden">
                   <button 
                     onClick={() => setIsDateModalOpen(false)} 
                     className="absolute top-8 right-10 p-2 text-slate-400 hover:text-slate-900 transition-all"
                   >
                     <X size={24} />
                   </button>

                   <div className="flex items-center gap-6 mb-10">
                      <div className="h-16 w-16 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                         <CreditCard size={32} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase font-outfit tracking-tight">Fecha de Corte</h3>
                         <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">Ciclo de Facturación: {org.name}</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nueva Fecha de Próximo Pago</label>
                         <input 
                           type="date"
                           className="w-full h-16 px-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                           value={newBillingDate}
                           onChange={(e) => setNewBillingDate(e.target.value)}
                         />
                      </div>

                      <Button 
                        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl"
                        onClick={handleUpdateBillingDate}
                        loading={isUpdatingPlan}
                      >
                         AJUSTAR CALENDARIO
                      </Button>
                    </div>
                 </div>
              </div>
            )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
