import { useState, useEffect } from 'react';
import { 
  Building2, 
  RefreshCcw, 
  ShieldAlert,
  Search
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { SaaSOrgRow } from './SaaSOrgRow';

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

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchOrganizations = async () => {
    if (!isSuperAdmin) return;
    
    setLoading(true);
    try {
      const data = await api.get('/saas/organizations');
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching orgs:', error);
      toast.error('Error al obtener organizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [isSuperAdmin]);

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
    org.id.toLowerCase().includes(localSearchTerm.toLowerCase())
  );

  const handleToggleOrg = (orgId: string) => {
    setExpandedOrgId(prevId => prevId === orgId ? null : orgId);
    setOpenMenuId(null);
  };

  const handleToggleMenu = (orgId: string) => {
    setOpenMenuId(prevId => prevId === orgId ? null : orgId);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-16 bg-white dark:bg-zinc-900/40 border border-red-500/10 rounded-[3.5rem] text-center shadow-md backdrop-blur-xl">
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="h-20 w-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 border border-red-500/20">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <p className="text-red-500 font-black uppercase tracking-[0.4em] text-sm">ACCESO RESTRINGIDO</p>
            <p className="text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">SE REQUIERE PRIVILEGIOS DE SUPER ADMINISTRADOR PARA ESTE NODO</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchOrganizations}
            className="h-11 w-11 flex items-center justify-center bg-white dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 hover:text-blue-500 rounded-xl transition-all border border-slate-200 dark:border-white/5 shadow-sm"
          >
            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <p className="text-[10px] font-black text-slate-600 dark:text-zinc-600 uppercase tracking-[0.4em]">Directorio Maestro de Inquilinos</p>
        </div>

        <div className="w-96 relative group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-blue-500 transition-colors" />
           <input 
             type="text" 
             placeholder="Filtrar por nombre o ID..."
             className="w-full h-11 pl-12 pr-4 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-white/10"
             value={localSearchTerm}
             onChange={(e) => setLocalSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/[0.05] border-b border-white/5">
              <th className="px-8 py-6 text-left text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">ID Nodo</th>
              <th className="px-8 py-6 text-left text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Organización / Empresa</th>
              <th className="px-8 py-6 text-left text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Plan / Licencia</th>
              <th className="px-8 py-6 text-left text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Personal</th>
              <th className="px-8 py-6 text-left text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Estado SaaS</th>
              <th className="px-8 py-6 text-right text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && organizations.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                   <td colSpan={6} className="px-8 py-6 h-16 bg-white/[0.01]" />
                </tr>
              ))
            ) : filteredOrgs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-32 flex flex-col items-center opacity-20">
                  <Building2 className="h-20 w-20 mb-6 text-zinc-400" strokeWidth={1} />
                  <p className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-500">No se encuentran coincidencias</p>
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

      <div className="flex items-center justify-between px-6 py-8 border-t border-slate-200 dark:border-white/5 opacity-50">
        <p className="text-[8px] font-black text-slate-400 dark:text-zinc-700 uppercase tracking-[0.6em]">GKAD STOCK • MONITOR MAESTRO DE RED SAAS</p>
        <div className="flex items-center gap-2">
           <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
           <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest font-mono">STATUS: OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
};

