import { useState } from 'react';
import { createPortal } from 'react-dom';
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

 return createPortal(
 	<div style={{
		position: 'fixed', top: 0, left: 0,
		width: '100vw', height: '100vh',
		zIndex: 99999,
		display: 'flex', alignItems: 'center', justifyContent: 'center',
		backgroundColor: 'rgba(15, 23, 42, 0.45)',
		/* No Blur */
	}}>
 
  
 
 
 

 {/* MODAL CONTAINER */}
 <div className="relative w-full max-w-xl bg-card border border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden rounded-[3rem]">
 
  {/* Modal Header */}
  <div 
    style={{
      padding: '40px',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 95%)'
    }}
    className="relative shrink-0 animate-in fade-in duration-300"
  >
    <div className="flex items-center gap-4">
      <div 
        style={{ 
          padding: '12px',
          backgroundColor: 'var(--brand-primary)', 
          borderRadius: '16px', 
          color: 'white', 
          border: '2px solid var(--border)',
          boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--brand-primary), transparent 60%)'
        }}
        className="flex items-center justify-center animate-pulse"
      >
        <Building2 className="h-6 w-6"/>
      </div>
      <div>
        <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight margin: 0">
          NUEVA <span style={{ color: 'var(--brand-primary)' }}>ORGANIZACIÓN</span>
        </h3>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
          Maestro de Provisión SaaS
        </p>
      </div>
    </div>
    <button
      onClick={onClose}
      className="absolute right-8 top-8 p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all"
    >
      <X className="h-5 w-5"/>
    </button>
  </div>

  <form onSubmit={handleSubmit} className="p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-300">
 
 {/* SECCIÓN 1: DATOS EMPRESA */}
 <div className="space-y-4">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Detalles del Inquilino</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="relative group">
 <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground group-focus-within:text-blue-500 transition-colors"/>
 <input 
 required
 type="text"
 placeholder="Nombre de la Empresa"
 value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 className="w-full h-14 pl-12 pr-4 bg-card/30 border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-foreground"
 />
 </div>
 
 <div className="relative">
 <select 
 value={formData.plan || ''}
 onChange={(e) => setFormData({...formData, plan: e.target.value})}
 className="w-full h-14 px-4 bg-card/30 border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
 >
 {plans.map(p => (
 <option key={p.id} value={p.id} className="bg-card">{p.label} - {p.desc}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* SECCIÓN 2: DATOS ADMIN */}
 <div className="space-y-4">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Administrador Inicial</p>
 <div className="space-y-4">
 <div className="relative group">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground group-focus-within:text-emerald-500 transition-colors"/>
 <input 
 required
 type="text"
 placeholder="Nombre Completo Admin"
 value={formData.adminFullName}
 onChange={(e) => setFormData({...formData, adminFullName: e.target.value})}
 className="w-full h-14 pl-12 pr-4 bg-card/30 border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-foreground"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="relative group">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground group-focus-within:text-emerald-500 transition-colors"/>
 <input 
 required
 type="email"
 placeholder="Email Profesional"
 value={formData.adminEmail}
 onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
 className="w-full h-14 pl-12 pr-4 bg-card/30 border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-foreground"
 />
 </div>

 <div className="relative group">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground group-focus-within:text-emerald-500 transition-colors"/>
 <input 
 required
 type="password"
 placeholder="Contraseña Maestro"
 value={formData.adminPassword}
 onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
 className="w-full h-14 pl-12 pr-4 bg-card/30 border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-foreground"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="pt-4">
 <button 
 disabled={loading}
 type="submit"
 style={{ background: 'var(--brand-primary)' }}
  className="w-full h-16 hover:opacity-90 disabled:bg-muted text-white rounded-2xl font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-black/20 active:scale-95"
 >
 {loading ? (
 <Loader2 className="h-6 w-6 animate-spin opacity-50"/>
 ) : (
 <>
 <ShieldCheck className="h-5 w-5"/>
 Provisionar Organización
 <ChevronRight className="h-5 w-5 opacity-40 ml-auto mr-2"/>
 </>
 )}
 </button>
 </div>

 </form>
 </div>
 </div>
 ), document.body);
};
