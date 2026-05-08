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
import { Card } from './ui-components';

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

 const toggleNode = (id: string) => {
 setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
 };

 const fetchData = async () => {
 setLoading(true);
 try {
 if (viewMode === 'flat') {
 const data = await api.get('/saas/users');
 setUsers(data || []);
 } else {
 const data = await api.get('/saas/audit/user-creation-trace');
 setTrace(data || []);
 }
 } catch (error: any) {
 toast.error('Error al realizar auditoría');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, [viewMode]);

 const organizations = Array.from(new Set(users.map(u => u.organization_name)));

 const filteredUsers = users.filter(user => {
 const matchesSearch = 
 user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
 user.organization_name.toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesOrg = selectedOrg === 'all' || user.organization_name === selectedOrg;
 
 return matchesSearch && matchesOrg;
 });

 const getRoleBadge = (role: string) => {
 switch (role) {
 case 'super_admin':
 return (
 <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-black border border-purple-500/20 uppercase tracking-widest shadow-sm">
 <ShieldCheck className="h-3 w-3"strokeWidth={2.5} />
 SUPREMO
 </span>
 );
 case 'admin':
 return (
 <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-500 text-[9px] font-black border border-brand-500/20 uppercase tracking-widest shadow-sm">
 <UserCircle2 className="h-3 w-3"strokeWidth={2.5} />
 ADMIN
 </span>
 );
 default:
 return (
 <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted text-muted-foreground text-[9px] font-black border border-border uppercase tracking-widest">
 <Users className="h-3 w-3"strokeWidth={2.5} />
 OPERADOR
 </span>
 );
 }
 };

 return (
 <div className="space-y-10 animate-slide-up pb-32">
 
 {/* HEADER & CONTROLES */}
 <Card className="bg-card border border-border p-8 shadow-2xl relative overflow-hidden rounded-[2.5rem] backdrop-blur-xl">
 <div className="absolute top-[-10%] right-[-5%] w-48 h-48 bg-brand-500/5 blur-[60px] rounded-full pointer-events-none"/>
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
 <div className="flex items-center gap-4">
 <div className="h-14 w-14 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 border border-brand-500/20 shadow-2xl shadow-brand-500/5">
 <GitGraph className="h-7 w-7"strokeWidth={2.5} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-foreground uppercase tracking-tight font-outfit leading-none">
 TRAZABILIDAD <br/>SaaS
 </h3>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-2">Auditoría de Origen y Jerarquía</p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-4">
 {/* TOGGLE VIEW MODE */}
 <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border shadow-inner">
 <button 
 onClick={() => setViewMode('flat')}
 className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'flat' ? 'bg-brand-500 shadow-xl shadow-brand-500/20 text-white' : 'text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground'}`}
 >
 VISTA PLANA
 </button>
 <button 
 onClick={() => setViewMode('trace')}
 className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'trace' ? 'bg-brand-500 shadow-xl shadow-brand-500/20 text-white' : 'text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground'}`}
 >
 JERARQUÍA
 </button>
 </div>

 {viewMode === 'flat' && (
 <div className="flex flex-wrap items-center gap-4">
 <div className="relative group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors"/>
 <input 
 type="text"
 placeholder="BUSCAR..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="h-11 pl-12 pr-6 bg-muted/40 border border-border rounded-xl text-[10px] font-black tracking-widest w-full sm:w-56 focus:ring-2 focus:ring-brand-500 transition-all outline-none placeholder:text-muted-foreground dark:placeholder:text-foreground"
 />
 </div>
 </div>
 )}

 <button 
 onClick={fetchData}
 className="h-11 w-11 flex items-center justify-center bg-muted hover:bg-muted/10 text-muted-foreground hover:text-brand-500 rounded-xl transition-all border border-border"
 >
 <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>
 </Card>

 {/* RENDERIZADO DE VISTAS */}
 {viewMode === 'flat' ? (
 <Card className="bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-muted/50 text-[9px] uppercase tracking-[0.4em] text-muted-foreground font-black border-b border-border">
 <th className="px-8 py-6">OPERADOR</th>
 <th className="px-8 py-6">RANGO</th>
 <th className="px-8 py-6">ORGANIZACIÓN</th>
 <th className="px-8 py-6">ALTA</th>
 <th className="px-8 py-6 text-right">IDENTIFICADOR</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-100">
 {loading ? (
 [...Array(3)].map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td colSpan={5} className="px-8 py-10"><div className="h-6 bg-muted rounded-xl w-full opacity-40"></div></td>
 </tr>
 ))
 ) : filteredUsers.map(user => (
 <tr key={user.id} className="hover:bg-muted dark:hover:bg-brand-500/5 transition-colors group">
 <td className="px-8 py-5">
 <div className="flex items-center gap-4">
 <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground border border-border shadow-2xl group-hover:scale-110 transition-transform">
 {user.full_name.charAt(0).toUpperCase()}
 </div>
 <div>
 <p className="text-sm font-black text-foreground uppercase tracking-tight font-outfit">{user.full_name}</p>
 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{user.email}</p>
 </div>
 </div>
 </td>
 <td className="px-8 py-5">{getRoleBadge(user.role)}</td>
 <td className="px-8 py-5">
 <div className="flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-widest">
 <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20">
 <Building2 className="h-3 w-3"/>
 </div>
 {user.organization_name}
 </div>
 </td>
 <td className="px-8 py-5 text-[10px] text-muted-foreground font-bold tabular-nums uppercase">
 {new Date(user.created_at).toLocaleDateString('es-CO')}
 </td>
 <td className="px-8 py-5 text-right">
 <span className="text-[9px] font-mono text-muted-foreground group-hover:text-muted-foreground transition-colors uppercase font-black">{user.id.toUpperCase().slice(0, 8)}...</span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </Card>
 ) : (
 <div className="space-y-6">
 {loading ? (
 [...Array(3)].map((_, i) => (
 <div key={i} className="h-28 bg-muted rounded-[2.5rem] animate-pulse border border-border"></div>
 ))
 ) : (
 <Card className="bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden p-10 backdrop-blur-xl">
 <div className="space-y-4">
 {trace.map(node => <TreeNode key={node.id} node={node} depth={0} expandedNodes={expandedNodes} toggleNode={toggleNode} getRoleBadge={getRoleBadge} />)}
 </div>
 </Card>
 )}
 </div>
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
 className={`flex items-center gap-6 p-5 rounded-[2rem] transition-all cursor-pointer border ${depth === 0 ? 'bg-muted/50  border-border hover:border-brand-500/20 shadow-xl' : 'hover:bg-muted  border-transparent hover:border-border dark:hover:border-border'}`}
 onClick={() => toggleNode(node.id)}
 style={{ marginLeft: `${depth * 32}px` }}
 >
 <div className="flex items-center gap-5 flex-1">
 <div className="flex flex-col items-center gap-2">
 {hasSubordinates ? (
 <div className="p-1.5 bg-brand-500/10 rounded-lg text-brand-500 hover:bg-brand-500 hover:text-white transition-all">
 <ChevronRight className={`h-4 w-4 transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={3} />
 </div>
 ) : (
 <div className="w-8 h-px bg-muted"/>
 )}
 </div>
 
 <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg border-2 shadow-2xl transition-transform group-hover:scale-110 ${
 node.role === 'super_admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' : 
 node.role === 'admin' ? 'bg-brand-500/10 text-brand-600 dark:text-brand-500 border-brand-500/30' : 
 'bg-muted text-muted-foreground border-border'
 }`}>
 {node.full_name.charAt(0).toUpperCase()}
 </div>

 <div className="space-y-1">
 <div className="flex items-center gap-4">
 <span className="text-base font-black text-foreground uppercase tracking-tight font-outfit leading-none">{node.full_name}</span>
 {getRoleBadge(node.role)}
 </div>
 <div className="flex items-center gap-5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
 <span className="flex items-center gap-2"><Mail size={12} className="text-muted-foreground"/> {node.email}</span>
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
