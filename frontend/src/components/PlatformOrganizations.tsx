import { useState, useEffect } from 'react';
import { 
  Building2, 
  RefreshCcw, 
  ShieldAlert,
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

interface Props {
  searchTerm?: string;
}

export const PlatformOrganizations = ({ searchTerm = '' }: Props) => {
  const { profile } = useAuthStore();
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.id.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p className="text-[10px] font-black text-slate-600 dark:text-zinc-600 uppercase tracking-[0.4em]">Lista de Organizaciones Activas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && organizations.length === 0 ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-zinc-900/20 border border-slate-200 dark:border-white/5 rounded-2xl animate-pulse shadow-sm" />
          ))
        ) : filteredOrgs.length === 0 ? (
          <div className="py-32 flex flex-col items-center opacity-20">
            <Building2 className="h-20 w-20 mb-6 text-zinc-400" strokeWidth={1} />
            <p className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-500">No se encuentran coincidencias</p>
          </div>
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

