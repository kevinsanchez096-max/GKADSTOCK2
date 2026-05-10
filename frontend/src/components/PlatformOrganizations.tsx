import { useState, useEffect } from 'react';
import { 
 Building2, 
 RefreshCcw, 
 ShieldAlert,
 Search,
 Plus
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { SaaSOrgRow } from './SaaSOrgRow';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { Button } from './ui-components';

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
 const [isModalOpen, setIsModalOpen] = useState(false);

 const isSuperAdmin = profile?.role === 'super_admin';

 const fetchOrganizations = async () => {
 if (!isSuperAdmin) return;
 
 setLoading(true);
 try {
 console.log(`[SAAS] Obteniendo organizaciones plataforma`);
 const response = await api.get('/saas/organizations');
 const safeOrganizations = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
 setOrganizations(safeOrganizations);
 } catch (error: any) {
 console.error('[SAAS] Error fetching orgs:', error);
 toast.error('Error al obtener organizaciones');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchOrganizations();
 }, [isSuperAdmin]);

 const safeOrgsArray = Array.isArray(organizations) ? organizations : [];
 const filteredOrgs = safeOrgsArray.filter(org => 
 org?.name?.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
 org?.id?.toLowerCase().includes(localSearchTerm.toLowerCase())
 );

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

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button 
 onClick={fetchOrganizations}
 className="h-11 w-11 flex items-center justify-center bg-card hover:bg-muted text-muted-foreground hover:text-blue-500 rounded-xl transition-all border border-border shadow-sm"
 >
 <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
 </button>
 <div className="flex flex-col">
  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Directorio Maestro de Inquilinos</p>
  <p className="text-[8px] text-brand-500 font-bold uppercase tracking-widest">Sincronizado con Nodo Central</p>
 </div>
 </div>

 <div className="flex items-center gap-4">
  <div className="w-96 relative group">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors"/>
  <input 
  type="text"
  placeholder="Filtrar por nombre o ID..."
  className="w-full h-11 pl-12 pr-4 bg-card border border-border rounded-xl text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-muted-foreground"
  value={localSearchTerm}
  onChange={(e) => setLocalSearchTerm(e.target.value)}
  />
  </div>
  <Button 
    onClick={() => setIsModalOpen(true)}
    icon={Plus}
    className="h-11 rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20"
  >
    Añadir Inquilino
  </Button>
 </div>
 </div>

  <div className="bg-card border border-border rounded-[2.5rem] overflow-x-auto overflow-y-hidden shadow-2xl transition-colors duration-500 max-w-[100vw] sm:max-w-none">
  <table className="w-full border-collapse min-w-[800px]">
  <thead>
 <tr className="bg-card border-b border-border">
 <th className="px-8 py-6 text-left text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">ID Nodo</th>
 <th className="px-8 py-6 text-left text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Organización / Empresa</th>
 <th className="px-8 py-6 text-left text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Plan / Licencia</th>
 <th className="px-8 py-6 text-left text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Personal</th>
 <th className="px-8 py-6 text-left text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Estado SaaS</th>
 <th className="px-8 py-6 text-right text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Acciones</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
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
 <p className="text-[12px] font-black uppercase tracking-[0.6em] text-muted-foreground">No se encuentran coincidencias</p>
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
