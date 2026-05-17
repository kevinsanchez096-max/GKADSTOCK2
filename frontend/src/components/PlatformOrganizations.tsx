import { useState, useEffect } from 'react';
import { 
 Building2, 
 RefreshCcw, 
 ShieldAlert,
 Search,
 Plus,
 CheckCircle,
 Trash2,
 FilterX
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { SaaSOrgRow } from './SaaSOrgRow';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { Button, Card } from './ui-components';

interface Org {
 id: string;
 name: string;
 is_active: boolean;
 created_at: string;
 plan: string;
 health_status: string;
 adminCount: number;
 vendedorCount: number;
 userCount: number;
 billing_status: string;
 next_billing_date: string;
 license_price: number;
}

export const PlatformOrganizations = () => {
 const { profile } = useAuthStore();
 const [organizations, setOrganizations] = useState<Org[]>([]);
 const [loading, setLoading] = useState(true);
 const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
 const [openMenuId, setOpenMenuId] = useState<string | null>(null);
 const [localSearchTerm, setLocalSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [summary, setSummary] = useState({ total: 0, active: 0, suspended: 0, deleted: 0 });
 const [deletionLogs, setDeletionLogs] = useState<any[]>([]);

 const isSuperAdmin = profile?.role === 'super_admin';

 const fetchOrganizations = async () => {
 if (!isSuperAdmin) return;
 
 setLoading(true);
 try {
 console.log(`[SAAS] Obteniendo organizaciones plataforma`);
 const response = await api.get('/saas/organizations');
 
 // Extraer datos y sumario de la respuesta estructurada
 const safeOrganizations = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
 setOrganizations(safeOrganizations);
 
 if (response?.summary) {
 setSummary(response.summary);
 } else {
 // Fallback: Calcular sumario localmente basándose en estado operacional y de facturación
 setSummary(prev => ({
 ...prev,
 total: safeOrganizations.length,
 active: safeOrganizations.filter((o: any) => o.is_active && (!o.billing_status || o.billing_status.toLowerCase() === 'activo')).length,
 suspended: safeOrganizations.filter((o: any) => !o.is_active || (o.billing_status && o.billing_status.toLowerCase() !== 'activo')).length
 }));
 }
 } catch (error: any) {
 console.error('[SAAS] Error fetching orgs:', error);
 toast.error('Error al obtener organizaciones');
 } finally {
 setLoading(false);
 }
 };

 const fetchDeletionLogs = async () => {
 try {
 // 1. Obtener los últimos logs para la tabla
 const { data: logs, error: logsError } = await supabase
 .from('system_audit_logs')
 .select('*')
  .eq('event', 'ORG_DELETED')
 .order('created_at', { ascending: false })
 .limit(10);
 
 if (logsError) throw logsError;
 setDeletionLogs(logs || []);

 // 2. Obtener el conteo total histórico de bajas para el KPI
 const { count, error: countError } = await supabase
 .from('system_audit_logs')
 .select('*', { count: 'exact', head: true })
  .eq('event', 'ORG_DELETED');

 if (!countError) {
 setSummary(prev => ({ ...prev, deleted: count || 0 }));
 }
 } catch (err) {
 console.error('[SAAS] Error fetching deletion logs:', err);
 }
 };

 useEffect(() => {
 fetchOrganizations();
 fetchDeletionLogs();
 }, [isSuperAdmin]);

 const safeOrgsArray = Array.isArray(organizations) ? organizations : [];
 const filteredOrgs = safeOrgsArray.filter(org => {
  const matchesSearch = org?.name?.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
                        org?.id?.toLowerCase().includes(localSearchTerm.toLowerCase());
  
  const matchesStatus = statusFilter === 'all' ? true : 
                        statusFilter === 'active' ? (org.is_active && (!org.billing_status || org.billing_status.toLowerCase() === 'activo')) :
                        statusFilter === 'suspended' ? (!org.is_active || (org.billing_status && org.billing_status.toLowerCase() !== 'activo')) : true;

  return matchesSearch && matchesStatus;
 });

 const handleToggleOrg = (orgId: string) => {
 setExpandedOrgId(prevId => prevId === orgId ? null : orgId);
 setOpenMenuId(null);
 };

 const handleToggleMenu = (orgId: string) => {
 setOpenMenuId(prevId => prevId === orgId ? null : orgId);
 // Al abrir el menú, también expandir la fila para mostrar el perfil completo
 if (expandedOrgId !== orgId) {
   setExpandedOrgId(orgId);
 }
 };

 if (!isSuperAdmin) {
 return (
 <div className="p-16 bg-card border border-red-500/10 rounded-[3.5rem] text-center shadow-md backdrop-blur-xl">
 <div className="flex flex-col items-center gap-6 relative z-10">
 <div className="h-20 w-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 border border-red-500/20">
 <ShieldAlert className="h-10 w-10"/>
 </div>
 <div className="space-y-2">
 <p className="text-red-500 font-black uppercase tracking-[0.4em] text-sm">ACCESO RESTRINGIDO</p>
 <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">SE REQUIERE PRIVILEGIOS DE SUPER ADMINISTRADOR PARA ESTE NODO</p>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-8 animate-in fade-in duration-700">
   
 <CreateOrganizationModal 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={fetchOrganizations}
 />

  <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
    {/* Decorative elements */}
    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"/>
    <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"/>

    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"/>
          <Building2 size={18} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Nodo Central SaaS</span>
        </div>
        <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
          Directorio <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">de Inquilinos</span>
        </h1>
        <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Sincronización en tiempo real con nodos globales</p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative group min-w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors z-10"/>
          <input 
            type="text"
            placeholder="Filtrar por nombre o ID..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full h-14 pl-12 pr-6 bg-muted/40 border border-border/50 rounded-2xl text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-muted-foreground shadow-inner"
          />
        </div>

        <Button 
          variant="outline" 
          onClick={fetchOrganizations}
          className="h-14 w-14 rounded-2xl border-border/50 hover:bg-muted p-0 flex items-center justify-center transition-all active:scale-95"
        >
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <Button 
          onClick={() => setIsModalOpen(true)}
          icon={Plus}
          className="h-14 px-10 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl shadow-emerald-500/20 border-none"
        >
          Añadir Inquilino
        </Button>
      </div>
    </div>
  </Card>
  

 {/* KPI Summary Cards - WITH INTERACTIVITY */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
   {[
     { id: 'all', label: 'Total Nodos', value: summary.total, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
     { id: 'active', label: 'Nodos Activos', value: summary.active, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
     { id: 'suspended', label: 'Suspensiones', value: summary.suspended, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
     { id: 'deleted', label: 'Bajas Totales', value: summary.deleted, icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' }
   ].map((card) => (
     <button 
       key={card.id} 
       onClick={() => {
         if (card.id === 'deleted') {
           // Scroll al historial de bajas
           document.getElementById('deletion-history')?.scrollIntoView({ behavior: 'smooth' });
         } else {
           setStatusFilter(card.id as any);
         }
       }}
       className={`p-6 text-left bg-card border rounded-3xl space-y-4 shadow-sm transition-all relative overflow-hidden group
         ${statusFilter === card.id ? 'ring-2 ring-brand-500 border-transparent shadow-xl translate-y-[-4px]' : card.border + ' hover:shadow-md hover:translate-y-[-2px]'}
       `}
     >
       <div className={`h-12 w-12 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform`}>
         <card.icon className="h-6 w-6" />
       </div>
       <div>
         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{card.label}</p>
         <p className="text-2xl font-black text-foreground mt-1">{card.value}</p>
       </div>
       
       {/* Active Indicator */}
       {statusFilter === card.id && (
         <div className="absolute top-4 right-4">
           <div className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
         </div>
       )}
     </button>
   ))}
 </div>

 {/* Filtro Activo Reset */}
 {statusFilter !== 'all' && (
   <div className="flex justify-center">
     <button 
       onClick={() => setStatusFilter('all')}
       className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-card border border-border rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-500 transition-all"
     >
       <FilterX size={14} />
       Limpiar Filtro de Estado
     </button>
   </div>
 )}

  <div className="bg-card border border-border rounded-[2.5rem] overflow-x-auto overflow-y-hidden shadow-2xl transition-colors duration-500 max-w-[100vw] sm:max-w-none">
  <table className="w-full border-collapse min-w-[800px]">
  <thead>
  <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
  <th className="px-8 py-5 text-left">ID Nodo</th>
  <th className="px-8 py-5 text-left">Organización / Empresa</th>
  <th className="px-8 py-5 text-left">Plan / Licencia</th>
  <th className="px-8 py-5 text-left">Personal</th>
  <th className="px-8 py-5 text-left">Estado SaaS</th>
  <th className="px-8 py-5 text-right">Acciones</th>
  </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {loading && organizations.length === 0 ? (
 [...Array(5)].map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td colSpan={6} className="px-8 py-6 h-16 bg-card"/>
 </tr>
 ))
 ) : filteredOrgs.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-32 flex flex-col items-center opacity-20">
 <Building2 className="h-20 w-20 mb-6 text-muted-foreground"strokeWidth={1} />
 <p className="text-[12px] font-black uppercase tracking-[0.6em] text-muted-foreground">No hay organizaciones con este estado</p>
 </td>
 </tr>
 ) : (
 filteredOrgs.map((org) => (
 <SaaSOrgRow 
 key={org.id} 
 org={org} 
 isExpanded={expandedOrgId === org.id}
 onToggle={() => handleToggleOrg(org.id)}
 isMenuOpen={openMenuId === org.id}
 onToggleMenu={() => handleToggleMenu(org.id)}
 onRefresh={fetchOrganizations}
 />
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Deletion History Section */}
 {deletionLogs.length > 0 && (
   <div id="deletion-history" className="space-y-6 pt-12 border-t border-border/50 scroll-mt-10">
     <div className="flex items-center gap-3">
       <Trash2 className="h-5 w-5 text-red-500" />
       <div className="flex flex-col">
         <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.3em]">Registro Histórico de Bajas</h3>
         <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Cuentas purgadas permanentemente del ecosistema</p>
       </div>
     </div>
     
     <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
              <th className="px-8 py-5 text-left">Fecha Purga</th>
              <th className="px-8 py-5 text-left">Organización</th>
              <th className="px-8 py-5 text-left">ID Previo</th>
              <th className="px-8 py-5 text-right">Pérdida MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {deletionLogs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors text-xs font-bold group">
               <td className="px-8 py-4 text-[10px] font-bold text-muted-foreground">
                 {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </td>
               <td className="px-8 py-4 text-[11px] font-black text-foreground uppercase tracking-tight">
                 {log.metadata?.org_name || 'Desconocida'}
               </td>
               <td className="px-8 py-4 text-[9px] font-mono text-muted-foreground/60">
                 {log.metadata?.org_id?.slice(0, 8)}...
               </td>
               <td className="px-8 py-4 text-right">
                 <span className="text-[11px] font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                   -${Number(log.metadata?.lost_mrr || 0).toLocaleString()}
                 </span>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   </div>
 )}

 <div className="flex items-center justify-between px-6 py-8 border-t border-border opacity-50">
 <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.6em]">GKAD STOCK • MONITOR MAESTRO DE RED SAAS</p>
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"/>
 <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest font-mono">STATUS: OPERATIONAL</span>
 </div>
 </div>
 </div>
 );
};
