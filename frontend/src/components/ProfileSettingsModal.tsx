import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, User, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { Button } from './ui-components';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal = ({ isOpen, onClose }: ProfileSettingsModalProps) => {
  const { profile, updateSecureSettings } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [formData, setFormData] = useState({
    newFullName: profile?.full_name || '',
    newEmail: profile?.email || '',
    newPassword: '',
    currentPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword) {
      toast.error('La contraseña actual es obligatoria para validar su identidad.');
      return;
    }

    setLoading(true);
    try {
      await updateSecureSettings({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword || undefined,
        newFullName: formData.newFullName !== profile?.full_name ? formData.newFullName : undefined,
        newEmail: formData.newEmail !== profile?.email ? formData.newEmail : undefined
      });

      toast.success('Perfil actualizado correctamente. Los cambios se han sincronizado.');
      setFormData({ ...formData, currentPassword: '', newPassword: '' });
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error al actualizar el perfil';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          zIndex: 99999,
          display: 'flex', alignItems: 'center', justify: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.45)'
        }}>
          {/* Backdrop Glassmorphism */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              style={{
                padding: '40px',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 95%)'
              }}
              className="relative shrink-0"
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
                  <ShieldCheck className="h-6 w-6"/>
                </div>
                <div>
                  <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight margin: 0">
                    Seguridad de <span style={{ color: 'var(--brand-primary)' }}>Cuenta</span>
                  </h3>
                  <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
                    Modo Súper Admin Activo
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

            <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Nombre Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors"/>
                      <input 
                        type="text"
                        placeholder="Su nombre artístico/real"
                        className="w-full h-16 pl-14 pr-6 bg-card border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                        value={formData.newFullName}
                        onChange={(e) => setFormData({...formData, newFullName: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nuevo Correo Electrónico (Opcional)</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-cyan-500 transition-colors"/>
                      <input 
                        type="email"
                        placeholder={profile?.email || "correo@ejemplo.com"}
                        className="w-full h-16 pl-14 pr-6 bg-card border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-inner lowercase"
                        value={formData.newEmail}
                        onChange={(e) => setFormData({...formData, newEmail: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Nueva Contraseña Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nueva Contraseña (Opcional)</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-indigo-500 transition-colors"/>
                      <input 
                        type={showNewPass ? "text" : "password"} 
                        placeholder="Dejar vacío para no cambiar"
                        className="w-full h-16 pl-14 pr-14 bg-card border border-border rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent my-6"/>

                  {/* Contraseña Actual Field (OBLIGATORIO) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Confirmar Contraseña Actual (Obligatorio)</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400 group-focus-within:text-red-500 transition-colors"/>
                      <input 
                        required
                        type={showCurrentPass ? "text" : "password"} 
                        placeholder="••••••••"
                        className="w-full h-16 pl-14 pr-14 bg-red-500 dark:bg-red-500 border border-red-500/20 dark:border-red-500/10 rounded-2xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit"
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 group"
                    disabled={loading}
                    loading={loading}
                  >
                    {!loading && <ShieldCheck size={20} className="group-hover:scale-110 transition-transform"/>}
                    ACTUALIZAR CREDENCIALES
                  </Button>
                  <p className="text-[9px] text-center text-muted-foreground font-bold uppercase mt-6 tracking-widest leading-relaxed">
                    Esta acción registra una entrada en los logs de auditoría global del sistema.
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
