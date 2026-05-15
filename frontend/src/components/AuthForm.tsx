import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, ArrowLeft, ArrowRight, Package, CheckCircle2, 
  ShieldCheck, Sparkles, Lock, Circle, LogIn, Store, BarChart3, LayoutDashboard, Database, Eye, EyeOff
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { GkadLogo } from './GkadLogo';

type FlowMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface AuthFormProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  initialMode?: FlowMode;
}

// ── Componente de Input Premium ────────────────────────────────
const DarkInput = ({ 
  label, type = 'text', placeholder, value, onChange, onFocus, onBlur,
  autoFocus = false, required = false, icon: Icon, autoComplete 
}: { 
  label: string; type?: string; placeholder?: string; 
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void; onBlur?: () => void;
  autoFocus?: boolean; required?: boolean; icon?: React.ElementType; autoComplete?: string;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-label text-zinc-500 ml-1">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--brand-primary)] transition-colors duration-300 pointer-events-none" />
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={() => setTimeout(onBlur || (() => {}), 200)}
          autoFocus={autoFocus}
          required={required}
          autoComplete={autoComplete}
          className={`text-body w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all duration-300 ${Icon ? 'pl-12' : ''} ${isPassword ? 'pr-12' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export const AuthForm = ({ darkMode, toggleDarkMode, initialMode }: AuthFormProps) => {
  const [mode, setMode] = useState<FlowMode>(initialMode || 'login');
  const [step, setStep] = useState(1);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const isUrlRecovery = hash.includes('type=recovery') || params.get('type') === 'recovery' || hash.includes('recovery_token=');

    if (initialMode) {
      setMode(initialMode);
      setStep(1);
    } else if (isUrlRecovery) {
      setMode('reset-password');
      setStep(1);
    }
  }, [initialMode]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Autocomplete state
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const { login, requestPasswordReset } = useAuthStore();
  const totalSteps = mode === 'login' ? 2 : (mode === 'register' ? 5 : 2);

  useEffect(() => {
    const stored = localStorage.getItem('gkad_recent_emails');
    if (stored) setRecentEmails(JSON.parse(stored));
  }, []);

  const saveEmail = (emailStr: string) => {
    const list = [emailStr, ...recentEmails.filter(e => e !== emailStr)].slice(0, 5);
    localStorage.setItem('gkad_recent_emails', JSON.stringify(list));
    setRecentEmails(list);
  };

  const passwordRules = [
    { id: 'len', text: 'Mínimo 8 caracteres', check: (p: string) => p.length >= 8 },
    { id: 'up', text: 'Una mayúscula', check: (p: string) => /[A-Z]/.test(p) },
    { id: 'low', text: 'Una minúscula', check: (p: string) => /[a-z]/.test(p) },
    { id: 'num', text: 'Un número', check: (p: string) => /[0-9]/.test(p) },
    { id: 'spec', text: 'Un carácter especial', check: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];
  const isPasswordValid = passwordRules.every(r => r.check(password));

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otpValues];
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setOtpValues(next);
      const focus = Math.min(index + digits.length, 5);
      otpRefs.current[focus]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const next = [...otpValues];
    next[index] = value;
    setOtpValues(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (mode === 'login') {
      if (step === 1) {
        if (!email.trim() || !email.includes('@')) return setError('Correo inválido.');
        setStep(2);
      } else await handleLogin();
    } else if (mode === 'forgot-password') {
      if (step === 1) {
        if (!email.trim() || !email.includes('@')) return setError('Correo inválido.');
        try {
          await requestPasswordReset(email.trim());
          setStep(2);
        } catch (err: any) {
          setError(err.message || 'Error al enviar correo de recuperación.');
        }
      }
    } else if (mode === 'reset-password') {
      await handleResetPassword();
    } else {
      if (step === 1) {
        if (!email.trim() || !email.includes('@')) return setError('Correo inválido.');
        setStep(2);
      } else if (step === 2) {
        if (!fullName.trim()) return setError('El nombre es obligatorio.');
        setStep(3);
      } else if (step === 3) {
        if (!orgName.trim()) return setError('La organización es obligatoria.');
        setStep(4);
      } else if (step === 4) {
        if (!isPasswordValid) return setError('Contraseña débil.');
        if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');
        await handleSignUp();
      } else await handleVerifyRegistration();
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await login(cleanEmail, password.trim());
      saveEmail(cleanEmail);
      toast.success('Acceso autorizado.');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Debes verificar tu correo antes de ingresar.');
      } else {
        setError(msg || 'Fallo de acceso.');
      }
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!isPasswordValid) return setError('Contraseña débil.');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      // Cerrar sesión después de cambiar contraseña para forzar nuevo login
      await supabase.auth.signOut();
      
      setShowSuccess(true);
      // El timeout redirigirá a la raíz donde se verá el login
      setTimeout(() => {
        window.location.href = '/';
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim(), organization_name: orgName.trim() } },
      });
      if (signUpError) throw signUpError;
      setStep(5);
      toast.success('OTP enviado.');
    } catch (err: any) { setError(err.message || 'Error en registro.'); } finally { setLoading(false); }
  };

  const handleVerifyRegistration = async () => {
    const code = otpValues.join('');
    if (code.length < 6) return setError('Código incompleto.');
    setLoading(true);
    try {
      await useAuthStore.getState().activateAccount(email.trim().toLowerCase(), code);
      setShowSuccess(true);
    } catch (err: any) { setError(err.message || 'Código inválido.'); } finally { setLoading(false); }
  };

  const prevStep = () => setStep(s => Math.max(1, s - 1));
  const switchMode = (m: FlowMode) => { setMode(m); setStep(1); setError(null); setEmail(''); setPassword(''); setConfirmPassword(''); setOtpValues(Array(6).fill('')); setShowSuccess(false); };

  if (showSuccess) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#111] border border-[#1e1e1e] rounded-[2.5rem] p-12 text-center shadow-2xl">
          <div className="h-20 w-20 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center text-[var(--brand-primary)] mx-auto mb-8 border border-[var(--brand-primary)]/20 shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.1)]">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-heading text-white uppercase">Operación Exitosa</h2>
          <p className="text-body text-zinc-500 mt-4 leading-relaxed">
            {mode === 'reset-password' 
              ? 'Tu contraseña ha sido actualizada. Ya puedes ingresar con tus nuevas credenciales.' 
              : 'Tu organización ha sido desplegada correctamente en la red corporativa.'}
          </p>
          <button onClick={() => switchMode('login')} className="w-full py-5 mt-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl">
            → INICIAR SESIÓN
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#0a0a0a] font-sans selection:bg-[var(--brand-primary)]/30 overflow-hidden">
      
      {/* ── COLUMNA IZQUIERDA: BRANDING ── */}
      <div className="hidden md:flex md:w-1/2 bg-[#0f0f0f] border-r border-[#1a1a1a] relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
        {/* TOP: LOGO */}
        <div className="relative z-10">
          <GkadLogo size={44} />
        </div>

        {/* CENTER: CONTENT */}
        <div className="relative z-10 flex flex-col gap-8 lg:gap-10 mt-4">
          <div className="flex flex-col">

            <motion.h1 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ duration: 0.8 }}
              className="text-5xl font-black leading-[1.1] tracking-[-2px]"
            >
              <span className="text-white">GESTIÓN DE</span> <br />
              <span className="text-[var(--brand-primary)]">INVENTARIOS</span>
            </motion.h1>
            <p className="text-body text-zinc-500 max-w-sm mt-6 leading-relaxed font-medium">
              Arquitectura de alta disponibilidad para el control total de operaciones comerciales en tiempo real.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: LayoutDashboard, title: 'Control Total', desc: 'Panel de mando centralizado.' },
              { icon: BarChart3, title: 'Analíticas AI', desc: 'Proyecciones de venta inteligentes.' },
              { icon: Database, title: 'Stock Maestro', desc: 'Kardex con auditoría blindada.' }
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-6 group">
                <div className="h-10 w-10 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 flex items-center justify-center text-[var(--brand-primary)] shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.1)] group-hover:scale-110 transition-transform">
                  <feat.icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tighter">{feat.title}</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM: FOOTER */}
        <div className="relative z-10">
          <span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.3em]">GKAD STOCK V5.0 ENTERPRISE</span>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: FORMULARIO ── */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-start md:justify-center p-6 sm:p-12 bg-[#0a0a0a] h-full overflow-hidden">
        <div className="w-full max-w-md relative py-12 md:py-0">
          
          <div className="mb-6 flex flex-col gap-4">
            {step > 1 && (
              <button type="button" onClick={prevStep} className="flex items-center gap-3 text-zinc-500 hover:text-[var(--brand-primary)] transition-all group w-fit">
                <div className="h-8 w-8 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center justify-center group-hover:border-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)]/10 transition-all">
                  <ArrowLeft size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[2px]">Volver</span>
              </button>
            )}

            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                {mode === 'login' ? 'Bienvenido de nuevo' : 
                 mode === 'forgot-password' ? 'Recuperar Acceso' :
                 mode === 'reset-password' ? 'Nueva Contraseña' :
                 'Crea tu cuenta'}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {mode === 'login' ? 'Introduce tus credenciales para acceder al nodo.' : 
                 mode === 'forgot-password' ? 'Enviaremos un enlace de recuperación a tu correo.' :
                 mode === 'reset-password' ? 'Establece tu nueva clave perimetral.' :
                 'Inicializa tu organización en el sistema central.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleNext} className="space-y-4">
            <div className="flex gap-1.5 mb-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-700 ${i < step ? 'bg-[var(--brand-primary)]' : 'bg-[#222]'}`} />
              ))}
            </div>

            <div className="min-h-[140px] relative">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-red-500/10 text-red-500 px-4 py-2.5 rounded-xl border border-red-500/20 text-[10px] font-bold text-center mb-4">
                    {error}
                  </motion.div>
                )}

              {mode === 'login' && step === 1 && (
                <motion.div key="l1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                  <DarkInput label="Correo Corporativo" type="email" placeholder="usuario@empresa.com" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setShowRecent(true)} onBlur={() => setShowRecent(false)} autoComplete="email" autoFocus required />
                  
                  {/* Recent Emails Dropdown */}
                  <AnimatePresence>
                    {showRecent && recentEmails.length > 0 && mode === 'login' && step === 1 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-[100] w-full mt-2 bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl">
                        {recentEmails.filter(e => e.includes(email.toLowerCase())).map((e, i) => (
                          <button key={i} type="button" onMouseDown={() => { setEmail(e); setShowRecent(false); }} className="w-full text-left px-5 py-3 text-[10px] font-medium text-white hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0 flex items-center gap-3">
                            <Mail size={10} className="text-zinc-600" />
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {mode === 'login' && step === 2 && (
                <motion.div key="l2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <DarkInput label="Contraseña" type="password" placeholder="••••••••" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
                  <button type="button" onClick={() => { setMode('forgot-password'); setStep(1); setError(null); }} className="text-[10px] font-bold text-[var(--brand-primary)] hover:brightness-125 transition-all uppercase tracking-widest">¿Olvidaste tu contraseña?</button>
                </motion.div>
              )}

              {mode === 'forgot-password' && step === 1 && (
                <motion.div key="fp1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-2">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-relaxed">
                      Ingresa tu correo para recibir un enlace de recuperación.
                    </p>
                  </div>
                  <DarkInput label="Correo Registrado" type="email" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
                </motion.div>
              )}

              {mode === 'forgot-password' && step === 2 && (
                <motion.div key="fp2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-4">
                  <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <CheckCircle2 className="text-emerald-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-[12px]">¡Correo Enviado!</h3>
                    <p className="text-zinc-500 text-[10px] mt-2 leading-relaxed">
                      Hemos enviado las instrucciones a <span className="text-white font-bold">{email}</span>. Revisa tu bandeja de entrada.
                    </p>
                  </div>
                  <button type="button" onClick={() => { setMode('login'); setStep(1); }} className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest hover:brightness-125 transition-all">
                    Volver al Inicio
                  </button>
                </motion.div>
              )}

              {mode === 'reset-password' && (
                <motion.div key="rp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-2xl mb-2 text-center">
                    <Lock className="mx-auto text-[var(--brand-primary)] mb-2" size={24} />
                    <h3 className="text-white font-black uppercase tracking-widest text-[11px]">Restablecer Contraseña</h3>
                    <p className="text-zinc-500 text-[9px] mt-1">Crea una nueva clave segura para tu cuenta.</p>
                  </div>
                  <div className="space-y-3">
                    <DarkInput label="Nueva Contraseña" type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" autoFocus required />
                    <DarkInput label="Confirmar Contraseña" type="password" icon={ShieldCheck} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
                  </div>

                  {/* Panel de Políticas de Seguridad (Restablecimiento) */}
                  <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-5 rounded-[1.5rem] space-y-3 shadow-inner mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Políticas de Seguridad</p>
                      <div className={`h-1.5 w-1.5 rounded-full transition-all duration-700 ${isPasswordValid ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {passwordRules.map(rule => {
                        const ok = rule.check(password);
                        return (
                          <div key={rule.id} className="flex items-center gap-2 transition-all duration-300">
                            <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all ${
                              ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-zinc-700'
                            }`}>
                              {ok ? <CheckCircle2 size={8} strokeWidth={3} /> : <div className="h-0.5 w-0.5 bg-current rounded-full" />}
                            </div>
                            <span className={`text-[9px] font-bold tracking-tight transition-colors ${ok ? 'text-zinc-200' : 'text-zinc-600'}`}>
                              {rule.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {mode === 'register' && step === 1 && (
                <motion.div key="r1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DarkInput label="Correo Corporativo" type="email" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
                </motion.div>
              )}
              {mode === 'register' && step === 2 && (
                <motion.div key="r2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DarkInput label="Tu Nombre" type="text" icon={Sparkles} value={fullName} onChange={e => setFullName(e.target.value)} autoFocus required />
                </motion.div>
              )}
              {mode === 'register' && step === 3 && (
                <motion.div key="r3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DarkInput label="Organización" type="text" icon={Package} value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus required />
                </motion.div>
              )}
              {mode === 'register' && step === 4 && (
                <motion.div key="r4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="space-y-3">
                    <DarkInput label="Nueva Contraseña" type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" autoFocus required />
                    <DarkInput label="Confirmar Contraseña" type="password" icon={ShieldCheck} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
                  </div>

                  <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-5 rounded-[1.5rem] space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Protocolo de Seguridad</p>
                      <div className={`h-1.5 w-1.5 rounded-full transition-all duration-700 ${isPasswordValid ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {passwordRules.map(rule => {
                        const ok = rule.check(password);
                        return (
                          <div key={rule.id} className="flex items-center gap-2 transition-all duration-300">
                            <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all ${
                              ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-zinc-700'
                            }`}>
                              {ok ? <CheckCircle2 size={8} strokeWidth={3} /> : <div className="h-0.5 w-0.5 bg-current rounded-full" />}
                            </div>
                            <span className={`text-[9px] font-bold tracking-tight transition-colors ${ok ? 'text-zinc-200' : 'text-zinc-600'}`}>
                              {rule.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
              {mode === 'register' && step === 5 && (
                <motion.div key="r5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="text-center p-5 bg-[var(--brand-secondary)]/5 border border-[var(--brand-secondary)]/10 rounded-2xl">
                    <ShieldCheck className="mx-auto text-[var(--brand-secondary)] mb-2" size={28} />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Verifica tu Acceso</p>
                    <p className="text-[9px] text-zinc-500 mt-1">Código enviado a <span className="text-white font-bold">{email}</span></p>
                  </div>
                  <div className="flex justify-between gap-2">
                    {otpValues.map((v, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} value={v} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-full h-12 text-center text-lg font-black bg-[#111] border border-[#1e1e1e] rounded-xl text-white focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all" />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {step > 1 && (
                  <button 
                    type="button" 
                    onClick={prevStep} 
                    className="w-full h-12 rounded-xl border border-zinc-800 bg-[#0f0f0f] text-zinc-500 font-black uppercase tracking-[0.2em] text-[9px] hover:border-zinc-700 hover:text-white transition-all shadow-lg active:scale-95"
                  >
                    Atrás
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={loading} 
                  style={{ background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))' }} 
                  className={`w-full h-12 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[9px] shadow-[0_10px_30px_rgba(var(--brand-primary-rgb),0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 ${step === 1 ? 'sm:col-span-2' : ''}`}
                >
                  {loading ? <Circle className="animate-spin" size={14} /> : (mode === 'login' && step === 2 ? <LogIn size={14} /> : (mode === 'reset-password' ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />))}
                  {mode === 'login' 
                    ? (step === 1 ? 'Continuar' : 'Entrar al Sistema') 
                    : mode === 'forgot-password'
                      ? (step === 1 ? 'Enviar Enlace' : 'Enlace Enviado')
                      : mode === 'reset-password'
                        ? 'Actualizar Contraseña'
                        : (step === 5 ? 'Activar Cuenta' : 'Siguiente Paso')}
                </button>
              </div>



              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-[#1e1e1e]" />
                <span className="text-[9px] font-black text-zinc-800 uppercase tracking-widest">o</span>
                <div className="h-px flex-1 bg-[#1e1e1e]" />
              </div>

              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="w-full py-3.5 rounded-xl border border-[#1e1e1e] text-white text-[10px] font-black uppercase tracking-[0.1em] hover:bg-white/5 transition-all">
                {mode === 'login' ? 'Crear nueva cuenta corporativa' : 'Ya tengo acceso al sistema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
