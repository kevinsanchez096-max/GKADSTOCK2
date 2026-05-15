import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Al menos un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const allRulesPassed = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesPassed) {
      return toast.error('La contraseña no cumple todos los requisitos de seguridad.');
    }
    if (!passwordsMatch) {
      return toast.error('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast.success('¡Contraseña actualizada correctamente!');
      await supabase.auth.signOut();
      setTimeout(() => { window.location.href = '/'; }, 2500);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080808' }}>
        <div className="w-full max-w-md rounded-3xl p-8 text-center" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#22c55e' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Contraseña Actualizada!</h2>
          <p className="text-gray-500 text-sm">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080808', fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)' }}>
      <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
          >
            <ShieldCheck className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Nueva Contraseña</h2>
          <p className="text-gray-500 text-sm mt-2 text-center">Asegura tu cuenta con una clave robusta.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          {/* Campo: Nueva Contraseña */}
          <div className="space-y-2">
            <label className="text-gray-500 font-bold ml-1" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Contraseña Nueva
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-[var(--brand-primary)] transition-colors" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                className="w-full rounded-xl py-3.5 pl-11 pr-12 text-white outline-none transition-all"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Políticas de contraseña */}
          {password.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)' }}>
              {PASSWORD_RULES.map((rule, i) => {
                const passed = rule.test(password);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {passed
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#22c55e' }} />
                      : <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#ef4444' }} />
                    }
                    <span style={{ color: passed ? '#22c55e' : '#9ca3af' }}>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Campo: Confirmar Contraseña */}
          <div className="space-y-2">
            <label className="text-gray-500 font-bold ml-1" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                className="w-full rounded-xl py-3.5 pl-11 pr-4 text-white outline-none transition-all"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs ml-1" style={{ color: '#ef4444' }}>Las contraseñas no coinciden.</p>
            )}
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading || !allRulesPassed || !passwordsMatch}
            className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            style={{ background: 'var(--brand-primary)' }}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
