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
 Key,
 Phone
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from './ui-components';

interface Org {
 id: string;
 name: string;
 company_name?: string;
 is_active: boolean;
 plan: string;
 health_status: string;
 adminCount: number;
 vendedorCount: number;
 billing_status: string;
 next_billing_date: string;
 license_price: number;
 legal_representative?: string;
 tax_id?: string;
 primary_address?: string;
 phone_number?: string;
 corporate_email?: string;
 logo_url?: string;
 tax_percentage?: number;
 currency?: string;
 billing_resolution?: string;
 footer_message?: string;
 theme_color?: string;
 theme_secondary_color?: string;
 theme_style?: 'solid' | 'gradient';
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
 const response = await api.get(`/saas/organizations/${org.id}/users`);
 const safeUsers = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
 setUsers(safeUsers);
 } catch (error) {
 console.error('[SAAS] Error fetching users:', error);
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
 'Esencial': 'bg-muted-foreground/10 text-muted-foreground border-border/20'
 };

 const currentPlanStyle = planStyles[org.plan] || 'bg-muted-foreground/10 text-muted-foreground border-border/20';

 return (
 <>
 <tr className={`group/row transition-colors hover:bg-muted/30 border-b border-border/40 ${!org.is_active || org.billing_status === 'suspendido' ? 'opacity-50 grayscale' : ''}`}>
 {/* ID Nodo */}
 <td className="px-8 py-5 text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
 {org.id.split('-')[0]}
 </td>

 {/* Empresa */}
 <td className="px-8 py-5"onClick={onToggle}>
 <div className="flex items-center gap-4 cursor-pointer">
 <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover/row:text-foreground transition-all">
 <Building2 size={18} />
 </div>
 <div>
 <p className="text-[12px] font-black text-foreground uppercase tracking-tight">{org.name}</p>
 <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Inquilino Activo</p>
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
 <div className="flex items-center gap-2 text-muted-foreground">
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
 className="h-8 px-3 rounded-lg bg-muted hover:bg-card/10 text-[9px] font-black text-foreground/60 hover:text-foreground border border-border transition-all uppercase tracking-widest"
 >
 Gestionar
 </button>
 
 <div className="relative">
 <button 
 onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
 className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
 >
 <MoreVertical size={16} />
 </button>
 {isMenuOpen && (
 <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in zoom-in-95 backdrop-blur-xl">
 <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(); }} className={`w-full flex items-center gap-4 px-4 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${org.is_active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
 <AlertCircle size={16} /> {org.is_active ? 'Suspender Operación' : 'Activar Operación'}
 </button>
 <button onClick={(e) => { e.stopPropagation(); handleToggleBilling(); }} className={`w-full flex items-center gap-4 px-4 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${org.billing_status === 'activo' ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
 <CreditCard size={16} /> {org.billing_status === 'activo' ? 'Suspender Licencia' : 'Reactivar Licencia'}
 </button>
 <div className="h-px bg-muted my-2 mx-2"/>
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
 <td colSpan={6} className="px-8 py-10 bg-card">
 <div className="animate-in slide-in-from-top-4 duration-500">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
 {/* INFO CORPORATIVA */}
 <div className="lg:col-span-2 bg-muted/20 rounded-[2rem] p-8 border border-border">
 <div className="flex items-center gap-3 mb-6">
 <Building2 className="text-brand-500 h-5 w-5"/>
 <h4 className="text-[11px] font-black text-foreground uppercase tracking-[0.3em]">Perfil Corporativo</h4>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
 {/* DATOS BÁSICOS */}
 <div className="space-y-1 min-w-0">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Representante Legal</p>
 <p className="text-[12px] font-bold text-foreground uppercase truncate" title={org.legal_representative}>{org.legal_representative || 'Sin representante legal'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">NIT / Identificación</p>
 <p className="text-[12px] font-bold text-foreground uppercase">{org.tax_id || 'Sin NIT registrado'}</p>
 </div>
 <div className="space-y-1 min-w-0 overflow-hidden">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Contacto Directo</p>
 <div className="space-y-1.5 w-full">
 <div className="flex items-center gap-2 text-muted-foreground min-w-0">
 <Phone size={10} className="flex-shrink-0" /> 
 <span className="text-[11px] font-medium truncate uppercase">{org.phone_number || 'Sin teléfono'}</span>
 </div>
 <div className="flex items-center gap-2 text-muted-foreground min-w-0" title={org.corporate_email}>
 <Mail size={10} className="flex-shrink-0" /> 
 <span className="text-[11px] font-medium truncate lowercase w-full">{org.corporate_email || 'No configurado'}</span>
 </div>
 </div>
 </div>

 {/* DATOS FISCALES */}
 <div className="space-y-1">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Resolución DIAN / Fiscal</p>
 <p className="text-[11px] font-medium text-muted-foreground truncate max-w-[200px]"title={org.billing_resolution}>{org.billing_resolution || 'No configurada'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Parámetros de Venta</p>
 <div className="flex items-center gap-3">
 <span className="text-[11px] font-bold text-foreground">IVA: {org.tax_percentage}%</span>
 <span className="text-[11px] font-bold text-foreground">DIVISA: {org.currency}</span>
 </div>
 </div>
 <div className="space-y-1 min-w-0">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Dirección Principal</p>
 <p className="text-[11px] font-medium text-muted-foreground truncate" title={org.primary_address}>{org.primary_address || 'Sin dirección'}</p>
 </div>

 {/* BRANDING */}
 <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-border mt-2">
 <div className="flex flex-wrap items-center gap-8">
 <div className="space-y-2">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Identidad Visual</p>
 <div className="flex items-center gap-3">
 <div className="h-6 w-12 rounded-lg shadow-inner"style={{ backgroundColor: org.theme_color || '#3b82f6' }} title="Color Primario"/>
 {org.theme_style === 'gradient' && (
 <div className="h-6 w-12 rounded-lg shadow-inner"style={{ backgroundColor: org.theme_secondary_color || '#2563eb' }} title="Color Secundario"/>
 )}
 <span className="text-[10px] font-bold text-muted-foreground uppercase">{org.theme_style || 'solid'}</span>
 </div>
 </div>
 {org.logo_url && (
 <div className="space-y-2">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Logo Corporativo</p>
 <img src={org.logo_url} alt="Logo"className="h-10 max-w-[120px] object-contain filter drop-shadow-sm"/>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* ESTADO FINANCIERO RÁPIDO */}
 <div className="bg-brand-500/5 rounded-[2rem] p-8 border border-brand-500/10 flex flex-col justify-between">
 <div className="space-y-1">
 <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Valor Licencia</p>
 <p className="text-3xl font-black text-foreground font-outfit tracking-tighter">${Number(org.license_price).toLocaleString()}</p>
 </div>
 <div className="pt-6 border-t border-brand-500/10">
 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Próximo Corte</p>
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-foreground">{org.next_billing_date ? new Date(org.next_billing_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : 'Pendiente'}</span>
 <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${org.billing_status === 'activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
 {org.billing_status}
 </span>
 </div>
 </div>
 </div>
 </div>

 <div className="h-px bg-muted mb-10"/>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <p className="text-[11px] font-black text-foreground uppercase tracking-[0.3em]">Gestión Maestra de Personal</p>
 <p className="text-[10px] text-muted-foreground font-bold">Modo Dios: Control total sobre todos los roles del inquilino</p>
 </div>
 <button 
 onClick={() => setIsAddUserModalOpen(true)}
 className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg hover:bg-muted active:scale-95"
 >
 <UserPlus size={14} /> Inyectar Usuario
 </button>
 </div>

 <div className="bg-muted/20 rounded-2xl overflow-hidden border border-border">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-muted/50">
 <th className="px-6 py-4 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Usuario</th>
 <th className="px-6 py-4 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Email</th>
 <th className="px-6 py-4 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Rol</th>
 <th className="px-6 py-4 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
 <th className="px-6 py-4 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest">Poderes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">
 {loadingUsers ? (
 <tr><td colSpan={5} className="py-20 text-center animate-pulse text-[10px] font-black text-muted-foreground">Sincronizando Auth...</td></tr>
 ) : users.length === 0 ? (
 <tr><td colSpan={5} className="py-20 text-center text-muted-foreground grayscale opacity-20"><Ghost size={40} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase">Sin Personal Registrado</p></td></tr>
 ) : (
 users.map(user => (
 <tr key={user.id} className="hover:bg-card transition-colors group/row">
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 bg-card rounded-lg flex items-center justify-center text-[10px] font-black text-muted-foreground border border-border">
 {user.full_name?.charAt(0)}
 </div>
 <p className="text-[11px] font-bold text-foreground uppercase">{user.full_name}</p>
 </div>
 </td>
 <td className="px-6 py-4 text-[11px] font-medium text-muted-foreground lowercase">{user.email}</td>
 <td className="px-6 py-4">
 <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-muted text-muted-foreground'}`}>
 {user.role}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-1.5">
 <div className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
 <span className="text-[9px] font-bold text-muted-foreground uppercase">{user.status}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-right">
 <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
 <button 
 onClick={() => { setSelectedUser(user); setIsResetModalOpen(true); }} 
 className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors"
 title="Restablecer Contraseña"
 >
 <Key size={16} />
 </button>
 <button onClick={() => openEditModal(user)} className="p-2 text-muted-foreground hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
 <button onClick={() => { setSelectedUser(user); setIsDeleteUserModalOpen(true); }} className="p-2 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-background/40 backdrop-blur-md animate-in fade-in">
 <div className="w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-4">
 <div className="h-12 w-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20">
 <Edit2 size={24} />
 </div>
 <div>
 <h3 className="text-xl font-black text-foreground uppercase font-outfit">Ajustar Credenciales</h3>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Sincronización directa con Auth & Database</p>
 </div>
 </div>
 <button onClick={() => setIsEditUserModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-full transition-all"><X size={20} /></button>
 </div>

 <div className="space-y-6">
 <div className="space-y-4">
 <div className="relative group">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
 <input 
 type="text"
 className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl text-sm font-bold text-foreground outline-none"
 value={editFormData.full_name}
 onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
 placeholder="Nombre Completo"
 />
 </div>
 <div className="relative group">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
 <input 
 type="email"
 className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl text-sm font-bold text-foreground outline-none"
 value={editFormData.email}
 onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
 placeholder="Email Profesional"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <select 
 value={editFormData.role}
 onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
 className="h-14 px-4 bg-card border border-border rounded-2xl text-sm font-bold"
 >
 <option value="admin">Administrador</option>
 <option value="vendedor">Vendedor</option>
 <option value="cashier">Cajero</option>
 </select>
 <select 
 value={editFormData.status}
 onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
 className="h-14 px-4 bg-card border border-border rounded-2xl text-sm font-bold"
 >
 <option value="active">Activo</option>
 <option value="inactive">Suspendido</option>
 </select>
 </div>
 </div>
 
 <div className="flex flex-col gap-3">
 <Button 
 className="w-full h-16 bg-background text-foreground dark:text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl"
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
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-background/40 backdrop-blur-md animate-in fade-in">
 <div className="w-full max-w-sm bg-card border border-emerald-500/20 rounded-[2.5rem] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
 <div className="flex items-center gap-4 mb-8">
 <div className="h-12 w-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20">
 <Key size={24} />
 </div>
 <div>
 <h3 className="text-xl font-black text-foreground uppercase font-outfit leading-tight">Restablecer Acceso</h3>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">Usuario: {selectedUser?.full_name}</p>
 </div>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nueva Clave Temporal</label>
 <div className="relative">
 <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
 <input 
 type="text"
 className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-emerald-500/50"
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
 className="w-full h-12 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-all"
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
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-background/40 backdrop-blur-md animate-in fade-in">
 <div className="w-full max-w-sm bg-card border border-red-500/20 rounded-[2.5rem] shadow-2xl p-6 md:p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
 <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-red-500/20">
 <Trash2 size={32} />
 </div>
 <h3 className="text-xl font-black text-foreground uppercase font-outfit mb-4 tracking-tight">¿Eliminar Usuario?</h3>
 <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed mb-8">
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
 <button onClick={() => setIsDeleteUserModalOpen(false)} className="w-full h-14 bg-muted text-muted-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
 </div>
 </div>
 </div>
 )}

 {/* 3. MODAL DE PURGA ORGANIZACIÓN */}
 {isDeleteModalOpen && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in">
 <div className="w-full max-w-md bg-card border border-red-500/20 rounded-[2.5rem] shadow-2xl p-6 md:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
 <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground"><X size={20} /></button>
 <div className="text-center space-y-6">
 <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-3xl mx-auto flex items-center justify-center border border-red-500/20">
 <ShieldAlert size={32} />
 </div>
 <div className="space-y-2">
 <h4 className="text-2xl font-black text-foreground font-outfit uppercase tracking-tighter">¿Purgar Inquilino?</h4>
 <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
 Escribe <span className="text-red-500 font-black">"{org.name}"</span> para borrar todo.
 </p>
 </div>
 <div className="space-y-4">
 <input 
 type="text"
 className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-sm font-black text-red-500 uppercase tracking-tighter outline-none focus:ring-2 focus:ring-red-500/50"
 placeholder={org.name}
 value={confirmName}
 onChange={(e) => setConfirmName(e.target.value)}
 />
 <Button 
 className={`w-full h-14 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${confirmName.trim().toUpperCase() === org.name.trim().toUpperCase() ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-muted text-muted-foreground pointer-events-none '}`}
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
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in">
 <form 
 onSubmit={handleInjectUser}
 className="w-full max-w-lg bg-card border border-blue-500/30 rounded-[3rem] shadow-2xl p-6 md:p-10 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col"
 >
 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"/>
 
 <div className="flex items-center justify-between mb-10">
 <div className="flex items-center gap-5">
 <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
 <UserPlus size={28} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tight">Inyectar Identidad</h3>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Acceso Maestro para {org.name}</p>
 </div>
 </div>
 <button type="button"onClick={() => setIsAddUserModalOpen(false)} className="p-3 text-muted-foreground hover:text-foreground transition-all"><X size={24} /></button>
 </div>

 <div className="space-y-5">
 <div className="relative">
 <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
 <input 
 required
 type="text"
 placeholder="Nombre del Operador"
 className="w-full h-16 pl-14 pr-6 bg-muted border border-border rounded-2xl text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
 value={newUserName}
 onChange={(e) => setNewUserName(e.target.value)}
 />
 </div>

 <div className="relative">
 <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
 <input 
 required
 type="email"
 placeholder="Email de Conexión"
 className="w-full h-16 pl-14 pr-6 bg-muted border border-border rounded-2xl text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
 value={newUserEmail}
 onChange={(e) => setNewUserEmail(e.target.value)}
 />
 </div>

 <div className="relative">
 <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
 <input 
 required
 type="password"
 placeholder="Clave Maestra"
 className="w-full h-16 pl-14 pr-6 bg-muted border border-border rounded-2xl text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
 value={newUserPassword}
 onChange={(e) => setNewUserPassword(e.target.value)}
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <button 
 type="button"
 onClick={() => setNewUserRole('admin')}
 className={`h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${newUserRole === 'admin' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-border'}`}
 >
 <ShieldCheck size={18} className={newUserRole === 'admin' ? 'text-blue-600' : 'text-muted-foreground'} />
 <span className={`text-[9px] font-black uppercase ${newUserRole === 'admin' ? 'text-blue-600' : 'text-muted-foreground'}`}>Administrador</span>
 </button>
 <button 
 type="button"
 onClick={() => setNewUserRole('vendedor')}
 className={`h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${newUserRole === 'vendedor' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-border'}`}
 >
 <User size={18} className={newUserRole === 'vendedor' ? 'text-blue-600' : 'text-muted-foreground'} />
 <span className={`text-[9px] font-black uppercase ${newUserRole === 'vendedor' ? 'text-blue-600' : 'text-muted-foreground'}`}>Vendedor</span>
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
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in">
 <div className="w-full max-w-2xl bg-card border border-blue-500/20 rounded-[3rem] shadow-2xl p-6 md:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
 <button 
 onClick={() => setIsChangePlanModalOpen(false)} 
 className="absolute top-8 right-10 p-2 text-muted-foreground hover:text-foreground transition-all"
 >
 <X size={24} />
 </button>

 <div className="flex items-center gap-6 mb-10">
 <div className="h-16 w-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
 <ShieldCheck size={32} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tight">Cambiar Plan: {org.name}</h3>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Actualización de Licencia y Capacidades</p>
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
 : 'border-border hover:border-blue-500/50 bg-muted/50 '
 }`}
 >
 <div className="flex justify-between items-start mb-4">
 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
 p.color === 'slate' ? 'bg-border text-foreground' :
 p.color === 'blue' ? 'bg-blue-100 text-blue-600' :
 p.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
 'bg-amber-100 text-amber-600'
 }`}>
 {p.id}
 </span>
 {org.plan === p.id && <CheckCircle2 className="text-blue-600 h-5 w-5"/>}
 </div>
 <p className="text-2xl font-black text-foreground font-outfit mb-1">${p.price.toLocaleString()}</p>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{p.desc}</p>
 
 {isUpdatingPlan && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 animate-spin text-blue-500"/>}
 </button>
 ))}
 </div>

 <div className="mt-10 p-6 bg-muted/50 rounded-2xl border border-border">
 <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest text-center leading-relaxed">
 El cambio de plan modifica inmediatamente el costo de la licencia y las capacidades operativas del inquilino.
 </p>
 </div>
 </div>
 </div>
 )}
 {/* 6. MODAL DE CAMBIO DE FECHA DE CORTE */}
 {isDateModalOpen && (
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in">
 <div className="w-full max-w-md bg-card border border-emerald-500/20 rounded-[3rem] shadow-2xl p-10 relative overflow-hidden">
 <button 
 onClick={() => setIsDateModalOpen(false)} 
 className="absolute top-8 right-10 p-2 text-muted-foreground hover:text-foreground transition-all"
 >
 <X size={24} />
 </button>

 <div className="flex items-center gap-6 mb-10">
 <div className="h-16 w-16 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
 <CreditCard size={32} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tight">Fecha de Corte</h3>
 <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">Ciclo de Facturación: {org.name}</p>
 </div>
 </div>

 <div className="space-y-6">
 <div>
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Nueva Fecha de Próximo Pago</label>
 <input 
 type="date"
 className="w-full h-16 px-6 bg-muted border border-border rounded-2xl text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-emerald-500/50"
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
