import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, User, Mail, Lock, Shield, Zap, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Button } from './ui-components';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOrganizationModal = ({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) => {
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
    setLoading(true);

    try {
      await api.post('/saas/organizations', formData);
      
      // Registrar notificación del sistema
      await supabase.from('system_notifications').insert([{
        type: 'ORG_STATUS',
        title: 'Nueva Organización Creada',
        message: `La organización "${formData.name}" ha sido desplegada con éxito en el plan ${formData.plan}.`,
        metadata: { name: formData.name, plan: formData.plan }
      }]);

      toast.success('Inquilino aprovisionado con éxito');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la organización');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.45)'
    }}>
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden rounded-[3rem]">
        
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
              <Building2 className="h-6 w-6"/>
            </div>
            <div>
              <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight m-0">
                NUEVO <span style={{ color: 'var(--brand-primary)' }}>INQUILINO</span>
              </h3>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
                Aprovisionamiento Atómico de Red SaaS
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

        <form onSubmit={handleSubmit}>
            
            <div className="p-8 space-y-8">
              {/* Section 1: Org Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[9px] font-black text-brand-500 uppercase tracking-[0.3em]">
                  <Shield size={12} /> Configuración de Empresa
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase ml-2">Nombre de la Organización</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500" />
                      <input
                        required
                        className="w-full h-12 pl-12 pr-4 bg-muted/50 border border-border rounded-xl text-[11px] font-bold text-foreground focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                        placeholder="Ej. Carnicería El Santandereano"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase ml-2">Plan de Suscripción</label>
                    <div className="relative group">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500" />
                      <select
                        className="w-full h-12 pl-12 pr-4 bg-muted/50 border border-border rounded-xl text-[11px] font-bold text-foreground focus:ring-2 focus:ring-brand-500/20 outline-none transition-all appearance-none"
                        value={formData.plan}
                        onChange={e => setFormData({...formData, plan: e.target.value})}
                      >
                        <option value="Esencial">Plan Esencial</option>
                        <option value="Avanzado">Plan Avanzado</option>
                        <option value="Emprendedor">Plan Emprendedor</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Admin Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">
                  <User size={12} /> Identidad del Administrador
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase ml-2">Nombre Completo</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500" />
                        <input
                          required
                          className="w-full h-12 pl-12 pr-4 bg-muted/50 border border-border rounded-xl text-[11px] font-bold text-foreground focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="Ej. Juan Pérez"
                          value={formData.adminFullName}
                          onChange={e => setFormData({...formData, adminFullName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase ml-2">Email Corporativo</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500" />
                        <input
                          required
                          type="email"
                          className="w-full h-12 pl-12 pr-4 bg-muted/50 border border-border rounded-xl text-[11px] font-bold text-foreground focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="admin@empresa.com"
                          value={formData.adminEmail}
                          onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase ml-2">Contraseña Inicial</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500" />
                      <input
                        required
                        type="password"
                        className="w-full h-12 pl-12 pr-4 bg-muted/50 border border-border rounded-xl text-[11px] font-bold text-foreground focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="••••••••"
                        value={formData.adminPassword}
                        onChange={e => setFormData({...formData, adminPassword: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground font-bold uppercase max-w-[200px]">
                El sistema enviará una invitación segura al administrador tras el despliegue.
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl px-6 h-12">Cancelar</Button>
                <Button 
                  type="submit" 
                  loading={loading}
                  icon={Sparkles}
                  className="rounded-xl px-8 h-12 bg-brand-500 text-white shadow-xl shadow-brand-500/20"
                >
                  Desplegar Inquilino
                </Button>
              </div>
            </div>
          </form>
      </div>
    </div>,
    document.body
  );
};
