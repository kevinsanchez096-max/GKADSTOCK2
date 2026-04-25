import React, { useState } from 'react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 sm:p-12">
          {/* Backdrop Glassmorphism */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white/90 dark:bg-zinc-950/90 border border-slate-200 dark:border-blue-500/20 rounded-[3rem] shadow-2xl overflow-hidden backdrop-blur-3xl max-h-[90vh] flex flex-col"
          >
            {/* Glossy Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]" />

            <div className="p-6 sm:p-10 overflow-y-auto flex-1 custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 ring-1 ring-white/20">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase font-outfit tracking-tight">Seguridad de Cuenta</h3>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                       <Sparkles size={10} className="text-blue-500" /> Modo Súper Admin Activo
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Nombre Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Su nombre artístico/real"
                        className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                        value={formData.newFullName}
                        onChange={(e) => setFormData({...formData, newFullName: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuevo Correo Electrónico (Opcional)</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                      <input 
                        type="email" 
                        placeholder={profile?.email || "correo@ejemplo.com"}
                        className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-inner lowercase"
                        value={formData.newEmail}
                        onChange={(e) => setFormData({...formData, newEmail: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Nueva Contraseña Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña (Opcional)</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type={showNewPass ? "text" : "password"} 
                        placeholder="Dejar vacío para no cambiar"
                        className="w-full h-16 pl-14 pr-14 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent my-6" />

                  {/* Contraseña Actual Field (OBLIGATORIO) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Confirmar Contraseña Actual (Obligatorio)</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        required
                        type={showCurrentPass ? "text" : "password"} 
                        placeholder="••••••••"
                        className="w-full h-16 pl-14 pr-14 bg-red-500/[0.03] dark:bg-red-500/[0.05] border border-red-500/20 dark:border-red-500/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
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
                    {!loading && <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />}
                    ACTUALIZAR CREDENCIALES
                  </Button>
                  <p className="text-[9px] text-center text-slate-500 dark:text-zinc-500 font-bold uppercase mt-6 tracking-widest leading-relaxed">
                    Esta acción registra una entrada en los logs de auditoría global del sistema.
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
