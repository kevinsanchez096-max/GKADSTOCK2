import { useState } from 'react';
import { 
  X, 
  Building2, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface SaaSCreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SaaSCreateOrgModal = ({ isOpen, onClose, onSuccess }: SaaSCreateOrgModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    plan: 'Esencial',
    adminFullName: '',
    adminEmail: '',
    adminPassword: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // BLOQUEO RADICAL DE DOBLE CLIC
    setLoading(true);

    try {
      await api.post('/saas/organizations', formData);
      toast.success('¡Organización creada con éxito!');
      onSuccess();
      onClose();
    } catch (error: any) {
      // Usamos error.message porque nuestro wrapper 'api' lanza un Error con el mensaje del servidor
      toast.error(error.message || 'No se pudo crear la organización');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { id: 'Esencial', label: 'Esencial', desc: '$39.000 - POS Básico (3 Usuarios)' },
    { id: 'Avanzado', label: 'Avanzado', desc: '$65.000 - Inventario Detallado (10 Usuarios)' },
    { id: 'Emprendedor', label: 'Emprendedor', desc: '$95.000 - Gestión Administrativa (25 Usuarios)' },
    { id: 'Premium', label: 'Premium', desc: '$145.000 - Contabilidad Completa (Ilimitado)' }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* MODAL CONTAINER */}
      <div className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-outfit uppercase tracking-tight">Nueva Organización</h2>
              <p className="text-blue-500/60 text-[9px] font-black uppercase tracking-[0.2em]">Maestro de Provisión SaaS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-8">
          
          {/* SECCIÓN 1: DATOS EMPRESA */}
          <div className="space-y-4">
             <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Detalles del Inquilino</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-700 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    required
                    type="text" 
                    placeholder="Nombre de la Empresa"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-14 pl-12 pr-4 bg-zinc-900/30 border border-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>
                
                <div className="relative">
                  <select 
                    value={formData.plan || ''}
                    onChange={(e) => setFormData({...formData, plan: e.target.value})}
                    className="w-full h-14 px-4 bg-zinc-900/30 border border-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id} className="bg-zinc-900">{p.label} - {p.desc}</option>
                    ))}
                  </select>
                </div>
             </div>
          </div>

          {/* SECCIÓN 2: DATOS ADMIN */}
          <div className="space-y-4">
             <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Administrador Inicial</p>
             <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    required
                    type="text" 
                    placeholder="Nombre Completo Admin"
                    value={formData.adminFullName}
                    onChange={(e) => setFormData({...formData, adminFullName: e.target.value})}
                    className="w-full h-14 pl-12 pr-4 bg-zinc-900/30 border border-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      required
                      type="email" 
                      placeholder="Email Profesional"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-zinc-900/30 border border-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      required
                      type="password" 
                      placeholder="Contraseña Maestro"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-zinc-900/30 border border-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>
             </div>
          </div>

          <div className="pt-4">
            <button 
              disabled={loading}
              type="submit"
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin opacity-50" />
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Provisionar Organización
                  <ChevronRight className="h-5 w-5 opacity-40 ml-auto mr-2" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
