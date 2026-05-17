import { useState, useEffect } from 'react';
import { 
 Users, 
 Search, 
 Mail, 
 Building2, 
 ShieldCheck,
 UserCircle2,
 RefreshCcw,
 GitGraph,
 ChevronRight,
 ShieldAlert
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Card, Button } from './ui-components';

interface GlobalUser {
 id: string;
 full_name: string;
 email: string;
 role: string;
 status: string;
 created_at: string;
 organization_id: string;
 organization_name: string;
}

interface UserNode {
 id: string;
 full_name: string;
 email: string;
 role: string;
 organization_name: string;
 created_at: string;
 subordinates: UserNode[];
}

export const GlobalUserAudit = () => {
 const [users, setUsers] = useState<GlobalUser[]>([]);
 const [trace, setTrace] = useState<UserNode[]>([]);
 const [viewMode, setViewMode] = useState<'flat' | 'trace'>('flat');
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedOrg, setSelectedOrg] = useState('all');
 const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
 const [summary, setSummary] = useState({ total: 0, admins: 0, operators: 0, newThisMonth: 0 });
 const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'vendedor'>('all');

 const toggleNode = (id: string) => {
 setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
 };

 const fetchData = async () => {
 setLoading(true);
 try {
 if (viewMode === 'flat') {
 const response = await api.get('/saas/users');
 // Estructura unificada: { data: [], summary: {} }
 const safeUsers = response?.data || (Array.isArray(response) ? response : []);
 setUsers(safeUsers);
 
 if (response?.summary) {
 setSummary(response.summary);
 } else {
 // Fallback local si el backend falla o es versión antigua
 const now = new Date();
 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
 setSummary({
 total: safeUsers.length,
 admins: safeUsers.filter((u: any) => (u.role || '').toLowerCase().includes('admin')).length,
 operators: safeUsers.filter((u: any) => !(u.role || '').toLowerCase().includes('admin')).length,
 newThisMonth: safeUsers.filter((u: any) => new Date(u.created_at) >= startOfMonth).length
 });
 }
 } else {
 const data = await api.get('/saas/audit/user-creation-trace');
 setTrace(data || []);
 }
 } catch (error: any) {
 console.error('[AUDIT ERROR]', error);
 toast.error('Error al realizar auditoría');
 } finally {
 setLoading(false);
 }
 };

 const [actionLoading, setActionLoading] = useState<string | null>(null);

 const handleUpdateRole = async (userId: string, newRole: string) => {
 try {
 setActionLoading(`role-${userId}`);
 await api.put(`/users/${userId}/role`, { role: newRole });
 toast.success('Rol actualizado con éxito');
 fetchData();
 } catch (error: any) {
 toast.error(error.response?.data?.error || 'Error al cambiar rol');
 } finally {
 setActionLoading(null);
 }
 };

 const handleUpdateStatus = async (userId: string, currentStatus: string) => {
 try {
 setActionLoading(`status-${userId}`);
 const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
 await api.put(`/users/${userId}/status`, { status: newStatus });
 toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'suspendido'} con éxito`);
 fetchData();
 } catch (error: any) {
 toast.error(error.response?.data?.error || 'Error al cambiar estado');
 } finally {
 setActionLoading(null);
 }
 };

 const handleDeleteUser = async (userId: string) => {
 if (!window.confirm('¿Está seguro de eliminar este usuario globalmente? Esta acción es irreversible.')) return;
 try {
 setActionLoading(`delete-${userId}`);
 await api.delete(`/users/${userId}`);
 toast.success('Usuario purgado del sistema');
 fetchData();
 } catch (error: any) {
 toast.error(error.response?.data?.error || 'Error al eliminar usuario');
 } finally {
 setActionLoading(null);
 }
 };

 useEffect(() => {
 fetchData();
 }, [viewMode]);

 const filteredUsers = users.filter(user => {
 const matchesSearch = 
 (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
 (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
 (user.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesOrg = selectedOrg === 'all' || user.organization_name === selectedOrg;
 
 const matchesRole = roleFilter === 'all' ? true :
                     roleFilter === 'admin' ? (user.role || '').toLowerCase().includes('admin') :
                     roleFilter === 'vendedor' ? !(user.role || '').toLowerCase().includes('admin') : true;

 return matchesSearch && matchesOrg && matchesRole;
 });

 const getRoleBadge = (role: string) => {
 const r = (role || '').toLowerCase();
 if (r.includes('super')) {
 return (
 <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 text-purple-400 text-[9px] font-black border border-purple-500/20 uppercase tracking-widest shadow-sm">
 <ShieldCheck className="h-3 w-3"strokeWidth={2.5} />
 SUPREMO
 </span>
 );
 } else if (r.includes('admin')) {
 return (
 <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-brand-500/10 text-blue-400 text-[9px] font-black border border-brand-500/20 uppercase tracking-widest shadow-sm">
 <UserCircle2 className="h-3 w-3"strokeWidth={2.5} />
 ADMIN
 </span>
 );
 } else {
 return (
 <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted text-muted-foreground text-[9px] font-black border border-border uppercase tracking-widest">
 <Users className="h-3 w-3"strokeWidth={2.5} />
 OPERADOR
 </span>
 );
 }
 };

 return (
 <div className="space-y-8 animate-slide-up pb-32">
  <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
    {/* Decorative elements */}
    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"/>
    <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"/>

    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"/>
          <Users size={18} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Auditoría Global de Personal</span>
        </div>
        <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
          Trazabilidad <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">SAAS</span>
        </h1>
        <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Monitoreo de accesos y jerarquía operativa</p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/50 shadow-inner">
          <button 
            onClick={() => setViewMode('flat')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              viewMode === 'flat' 
                ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            VISTA PLANA
          </button>
          <button 
            onClick={() => setViewMode('trace')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              viewMode === 'trace' 
                ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            JERARQUÍA
          </button>
        </div>

        <div className="relative group min-w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors z-10"/>
          <input 
            type="text"
            placeholder="Buscar usuario por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 pl-12 pr-6 bg-muted/40 border border-border/50 rounded-2xl text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-muted-foreground shadow-inner"
          />
        </div>

        <Button 
          variant="outline" 
          onClick={fetchData}
          className="h-14 w-14 rounded-2xl border-border/50 hover:bg-muted p-0 flex items-center justify-center transition-all active:scale-95"
        >
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  </Card>

 {/* KPI CARDS - VISIBILIDAD FORZADA */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { id: 'all', label: 'Total Usuarios', value: summary.total, icon: Users, color: 'text-brand-500', bg: 'bg-brand-500/10' },
 { id: 'admin', label: 'Administradores', value: summary.admins, icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
 { id: 'vendedor', label: 'Operadores', value: summary.operators, icon: UserCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
 { id: 'new', label: 'Nuevos (Mes)', value: summary.newThisMonth, icon: RefreshCcw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
 ].map((card) => (
 <button 
 key={card.id} 
 onClick={() => card.id !== 'new' && setRoleFilter(card.id as any)}
 className={`p-6 text-left bg-card border border-border rounded-[2rem] shadow-sm transition-all relative group ${roleFilter === card.id ? 'ring-2 ring-brand-500 border-transparent shadow-xl' : 'hover:shadow-md'}`}
 >
 <div className={`h-12 w-12 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} mb-4`}>
 <card.icon className="h-6 w-6" />
 </div>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{card.label}</p>
 <p className="text-2xl font-black text-foreground mt-1">{card.value}</p>
 </button>
 ))}
 </div>

 {/* LISTA / TABLA */}
 {viewMode === 'flat' ? (
 <Card className="bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl">
 <div className="overflow-x-auto">
 <table className="w-full text-left min-w-[800px] border-collapse">
 <thead>
 <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
 <th className="px-8 py-5">OPERADOR</th>
 <th className="px-8 py-5">RANGO</th>
 <th className="px-8 py-5">ORGANIZACIÓN</th>
 <th className="px-8 py-5">ALTA</th>
 <th className="px-8 py-5 text-right">ID</th>
 <th className="px-8 py-5 text-right">ACCIONES</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {loading && users.length === 0 ? (
 [...Array(3)].map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td colSpan={5} className="px-8 py-10"><div className="h-6 bg-muted rounded-xl w-full opacity-20"></div></td>
 </tr>
 ))
 ) : filteredUsers.map(user => (
 <tr key={user.id} className="hover:bg-muted/30 transition-colors text-xs font-bold group">
 <td className="px-8 py-5">
 <div className="flex items-center gap-4">
 <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground border border-border group-hover:scale-110 transition-transform">
 {user.full_name?.charAt(0).toUpperCase()}
 </div>
 <div>
 <p className="text-sm font-black text-foreground uppercase tracking-tight">{user.full_name}</p>
 <p className="text-[10px] text-muted-foreground font-bold uppercase">{user.email}</p>
 </div>
 </div>
 </td>
 <td className="px-8 py-5">{getRoleBadge(user.role)}</td>
 <td className="px-8 py-5">
 <div className="flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-widest">
 <Building2 className="h-3 w-3"/>
 {user.organization_name}
 </div>
 </td>
 <td className="px-8 py-5 text-[10px] text-muted-foreground font-bold uppercase tabular-nums">
 {new Date(user.created_at).toLocaleDateString('es-CO')}
 </td>
 <td className="px-8 py-5 text-right font-mono text-[9px] text-muted-foreground font-black">
 {user.id.toUpperCase().slice(0, 8)}
 </td>
 <td className="px-8 py-5 text-right">
 <div className="flex items-center justify-end gap-2">
 <select 
 value={user.role}
 onChange={(e) => handleUpdateRole(user.id, e.target.value)}
 disabled={actionLoading !== null}
 className="bg-muted text-[9px] font-black uppercase text-foreground px-2 py-1 rounded-lg border border-border"
 >
 <option value="super_admin">Súper Admin</option>
 <option value="admin">Admin</option>
 <option value="vendedor">Vendedor</option>
 </select>
 <button 
 onClick={() => handleUpdateStatus(user.id, user.status)}
 disabled={actionLoading !== null}
 className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-colors ${user.status === 'active' ? 'border-rose-500/20 text-rose-500 hover:bg-rose-500/10' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`}
 >
 {user.status === 'active' ? 'Suspender' : 'Activar'}
 </button>
 <button 
 onClick={() => handleDeleteUser(user.id)}
 disabled={actionLoading !== null}
 className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
 >
 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 ) : (
 <Card className="bg-card border border-border rounded-[2.5rem] shadow-2xl p-10 backdrop-blur-xl">
 <div className="space-y-4">
 {trace.map(node => <TreeNode key={node.id} node={node} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} getRoleBadge={getRoleBadge} />)}
 </div>
 </Card>
 )}
 </div>
 );
};

const TreeNode = ({ node, depth, expandedNodes, toggleNode, getRoleBadge }: any) => {
 const isExpanded = expandedNodes[node.id];
 const hasSubordinates = node.subordinates && node.subordinates.length > 0;

 return (
 <div className="animate-in fade-in slide-in-from-left-4 duration-500">
 <div 
 className={`flex items-center gap-6 p-5 rounded-[2rem] transition-all cursor-pointer border ${depth === 0 ? 'bg-muted/50 border-border hover:border-brand-500/20 shadow-xl' : 'hover:bg-muted border-transparent hover:border-border'}`}
 onClick={() => toggleNode(node.id)}
 style={{ marginLeft: `${depth * 32}px` }}
 >
 <div className="flex items-center gap-5 flex-1">
 <div className="flex flex-col items-center gap-2">
 {hasSubordinates ? (
 <ChevronRight className={`h-4 w-4 transition-transform duration-500 text-brand-500 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={3} />
 ) : (
 <div className="w-8 h-px bg-muted"/>
 )}
 </div>
 
 <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg border-2 shadow-2xl ${
 (node.role || '').toLowerCase().includes('super') ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 
 (node.role || '').toLowerCase().includes('admin') ? 'bg-brand-500/10 text-blue-400 border-brand-500/30' : 
 'bg-muted text-muted-foreground border-border'
 }`}>
 {node.full_name?.charAt(0).toUpperCase()}
 </div>

 <div className="space-y-1">
 <div className="flex items-center gap-4">
 <span className="text-base font-black text-foreground uppercase tracking-tight leading-none">{node.full_name}</span>
 {getRoleBadge(node.role)}
 </div>
 <div className="flex items-center gap-5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
 <span className="flex items-center gap-2"><Mail size={12}/> {node.email}</span>
 <span className="flex items-center gap-2 text-brand-500/50"><Building2 size={12} /> {node.organization_name}</span>
 </div>
 </div>
 </div>
 </div>

 {isExpanded && hasSubordinates && (
 <div className="mt-3 relative">
 <div className="absolute left-[20px] top-4 bottom-8 w-[1px] bg-gradient-to-b from-brand-500/20 to-transparent"/>
 <div className="space-y-3">
 {node.subordinates.map((sub: any) => (
 <TreeNode 
 key={sub.id} 
 node={sub} 
 depth={depth + 1} 
 expandedNodes={expandedNodes} 
 toggleNode={toggleNode} 
 getRoleBadge={getRoleBadge} 
 />
 ))}
 </div>
 </div>
 )}
 </div>
 );
};
