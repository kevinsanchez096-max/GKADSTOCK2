import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, ArrowLeft, Package, CheckCircle2, 
  ShieldCheck, Sparkles, Lock, Circle, LogIn, Store, BarChart3, LayoutDashboard, Database, Eye, EyeOff
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

type FlowMode = 'login' | 'register';

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

export const AuthForm = ({ darkMode, toggleDarkMode }: AuthFormProps) => {
  const [mode, setMode] = useState<FlowMode>('login');
  const [step, setStep] = useState(1);
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

  const { login } = useAuthStore();
  const totalSteps = mode === 'login' ? 2 : 5;

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
        if (password !== confirmPassword) return setError('Las llaves no coinciden.');
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
          <p className="text-body text-zinc-500 mt-4 leading-relaxed">Tu organización ha sido desplegada correctamente en la red corporativa.</p>
          <button onClick={() => switchMode('login')} className="w-full py-5 mt-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl">
            → INICIAR SESIÓN
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0a0a0a] font-sans selection:bg-[var(--brand-primary)]/30 overflow-hidden">
      
      {/* ── COLUMNA IZQUIERDA: BRANDING ── */}
      <div className="hidden md:flex md:w-1/2 bg-[#0f0f0f] border-r border-[#1a1a1a] relative flex-col justify-center gap-10 p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Store className="text-black" size={20} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white uppercase">
              GKAD <span className="text-[var(--brand-primary)]">STOCK</span>
            </span>
          </div>

          <div className="space-y-4 mt-10">
            <span className="text-label text-[var(--brand-primary)]">Sistema POS Enterprise</span>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black leading-[0.9]">
              <span className="text-white">GESTIÓN DE</span> <br />
              <span className="text-[var(--brand-primary)]">INVENTARIOS</span>
            </motion.h1>
            <p className="text-body text-zinc-500 max-w-sm mt-6 leading-relaxed font-medium">
              Arquitectura de alta disponibilidad para el control total de operaciones comerciales en tiempo real.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-5">
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

        <div className="relative z-10">
          <span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.3em]">GKAD STOCK V5.0 ENTERPRISE</span>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: FORMULARIO ── */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-[#0a0a0a] h-screen overflow-y-auto">
        <div className="w-full max-w-md relative">
          
          {step > 1 && (
            <button onClick={prevStep} className="absolute -top-12 left-0 flex items-center gap-2 text-zinc-500 hover:text-white transition-all group z-50 min-h-[48px]">
              <div className="h-8 w-8 rounded-full bg-[#111] border border-[#1e1e1e] flex items-center justify-center group-hover:border-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)]/10">
                <ArrowLeft size={14} />
              </div>
              <span className="text-xs md:text-[10px] font-bold uppercase tracking-widest">Volver</span>
            </button>
          )}

          <div className="mb-6">
            <h2 className="text-heading text-white uppercase tracking-tighter">
              {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h2>
            <p className="text-body text-zinc-500 mt-2">
              {mode === 'login' ? 'Introduce tus credenciales para acceder al nodo.' : 'Inicializa tu organización en el sistema central.'}
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-5">
            <div className="flex gap-1.5 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-700 ${i < step ? 'bg-[var(--brand-primary)]' : 'bg-[#222]'}`} />
              ))}
            </div>

            <div className="min-h-[160px] relative">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl border border-red-500/20 text-label text-center mb-6">
                    {error}
                  </motion.div>
                )}

              {mode === 'login' && step === 1 && (
                <motion.div key="l1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative">
                  <DarkInput label="Correo Corporativo" type="email" placeholder="usuario@empresa.com" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setShowRecent(true)} onBlur={() => setShowRecent(false)} autoComplete="email" autoFocus required />
                  
                  {/* Recent Emails Dropdown */}
                  <AnimatePresence>
                    {showRecent && recentEmails.length > 0 && mode === 'login' && step === 1 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-[100] w-full mt-2 bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl">
                        {recentEmails.filter(e => e.includes(email.toLowerCase())).map((e, i) => (
                          <button key={i} type="button" onMouseDown={() => { setEmail(e); setShowRecent(false); }} className="w-full text-left px-5 py-3 text-xs font-medium text-white hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0 flex items-center gap-3">
                            <Mail size={12} className="text-zinc-600" />
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {mode === 'login' && step === 2 && (
                <motion.div key="l2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <DarkInput label="Llave de Acceso" type="password" placeholder="••••••••" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
                  <button type="button" className="text-label text-[var(--brand-primary)] hover:brightness-125 transition-all">¿Olvidaste tu llave?</button>
                </motion.div>
              )}

              {mode === 'register' && step === 1 && (
                <motion.div key="r1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <DarkInput label="Correo Corporativo" type="email" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
                </motion.div>
              )}
              {mode === 'register' && step === 2 && (
                <motion.div key="r2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <DarkInput label="Tu Nombre" type="text" icon={Sparkles} value={fullName} onChange={e => setFullName(e.target.value)} autoFocus required />
                </motion.div>
              )}
              {mode === 'register' && step === 3 && (
                <motion.div key="r3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <DarkInput label="Organización" type="text" icon={Package} value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus required />
                </motion.div>
              )}
              {mode === 'register' && step === 4 && (
                <motion.div key="r4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <DarkInput label="Nueva Llave" type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
                  <DarkInput label="Confirmar Llave" type="password" icon={Lock} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  <div className="bg-[#181818] border border-[#2e2e2e] p-5 rounded-2xl space-y-3">
                    <p className="text-label text-zinc-500">Seguridad del Nodo</p>
                    {passwordRules.map(rule => {
                      const ok = rule.check(password);
                      return (
                        <div key={rule.id} className="flex items-center gap-3">
                          {ok ? <CheckCircle2 size={14} className="text-[var(--brand-secondary)]" /> : <Circle size={14} className="text-zinc-700" />}
                          <span className={`text-xs font-medium ${ok ? 'text-white' : 'text-zinc-600'}`}>{rule.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              {mode === 'register' && step === 5 && (
                <motion.div key="r5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="text-center p-6 bg-[var(--brand-secondary)]/5 border border-[var(--brand-secondary)]/10 rounded-2xl">
                    <ShieldCheck className="mx-auto text-[var(--brand-secondary)] mb-3" size={32} />
                    <p className="text-label text-white">Verifica tu Acceso</p>
                    <p className="text-xs md:text-[10px] text-zinc-500 mt-2">Código enviado a <span className="text-white font-bold">{email}</span></p>
                  </div>
                  <div className="flex justify-between gap-2 sm:gap-3">
                    {otpValues.map((v, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} value={v} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-full h-14 text-center text-xl font-black bg-[#111] border border-[#1e1e1e] rounded-xl text-white focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all" />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            <div className="space-y-4 pt-2">
              <button type="submit" disabled={loading} style={{ background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))' }} className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs md:text-[11px] shadow-[0_10px_30px_rgba(var(--brand-primary-rgb),0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 min-h-[48px]">
                {loading ? <Circle className="animate-spin" size={16} /> : <LogIn size={16} />}
                {mode === 'login' ? (step === 1 ? 'Continuar' : 'Entrar al Sistema') : (step === 5 ? 'Activar Cuenta' : 'Siguiente Paso')}
              </button>

              <div className="flex items-center gap-4 py-1">
                <div className="h-px flex-1 bg-[#1e1e1e]" />
                <span className="text-xs md:text-[10px] font-bold text-zinc-700 uppercase tracking-widest">o</span>
                <div className="h-px flex-1 bg-[#1e1e1e]" />
              </div>

              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="w-full py-4 rounded-2xl border border-[#1e1e1e] text-white text-label hover:bg-white/5 transition-all">
                {mode === 'login' ? 'Crear nueva cuenta corporativa' : 'Ya tengo acceso al sistema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
