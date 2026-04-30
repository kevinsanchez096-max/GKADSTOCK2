import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, ArrowLeft, Package, CheckCircle2, KeyRound,
  ShieldCheck, Sun, Moon, Sparkles, Lock, Circle, LogIn, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

type FlowMode = 'login' | 'register';

// ── Input reutilizable (Dark + Light mode) ────────────────────────────────
const DarkInput = ({
  label, type = 'text', placeholder, value, onChange,
  autoFocus = false, required = false, icon: Icon,
  accentClass = 'focus:ring-blue-500/50 focus:border-blue-500',
  isLight = false,
}: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean; required?: boolean; icon?: React.ElementType;
  accentClass?: string; isLight?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className={`text-[10px] font-bold uppercase tracking-widest pl-1 ${
      isLight ? 'text-slate-500' : 'text-zinc-400'
    }`}>{label}</label>
    <div className="relative">
      {Icon && <Icon size={15} className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${
        isLight ? 'text-slate-400' : 'text-zinc-500'
      }`} />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        required={required}
        className={`w-full rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-md shadow-inner ${accentClass}${Icon ? ' pl-11' : ''} ${
          isLight
            ? 'bg-white/80 border border-slate-200 text-slate-800 placeholder:text-slate-400'
            : 'bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500'
        }`}
      />
    </div>
  </div>
);

// ── Botón primario (blanco) ──────────────────────────────────────────────────
const PrimaryBtn = ({
  children, onClick, type = 'button', disabled = false, loading = false
}: {
  children: React.ReactNode; onClick?: () => void;
  type?: 'button' | 'submit'; disabled?: boolean; loading?: boolean;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.18em] text-sm
      transition-all shadow-xl flex items-center justify-center gap-2
      ${disabled || loading
        ? 'bg-white/10 text-zinc-600 cursor-not-allowed'
        : 'bg-white text-black hover:bg-zinc-100 active:scale-[0.98]'}`}
  >
    {loading ? <span className="animate-pulse">PROCESANDO...</span> : children}
  </button>
);

// ── Componente principal ─────────────────────────────────────────────────────
export const AuthForm = ({ darkMode, toggleDarkMode }: AuthFormProps) => {
  const [mode, setMode]               = useState<FlowMode>('login');
  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName,  setOrgName]  = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const { login, register } = useAuthStore();

  const totalSteps = mode === 'login' ? 2 : 5;

  // ── Validaciones de contraseña ───────────────────────────────────────────
  const passwordRules = [
    { id: 'len',   text: 'Mínimo 8 caracteres',  check: (p: string) => p.length >= 8 },
    { id: 'up',    text: 'Una letra mayúscula',   check: (p: string) => /[A-Z]/.test(p) },
    { id: 'low',   text: 'Una letra minúscula',   check: (p: string) => /[a-z]/.test(p) },
    { id: 'num',   text: 'Un número',             check: (p: string) => /[0-9]/.test(p) },
    { id: 'spec',  text: 'Un carácter especial',  check: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];
  const isPasswordValid = passwordRules.every(r => r.check(password));

  // ── OTP handlers ────────────────────────────────────────────────────────
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

  // ── Flujo de navegación ──────────────────────────────────────────────────
  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (mode === 'login') {
      if (step === 1) {
        if (!email.trim() || !email.includes('@'))
          return setError('Ingresa un correo profesional válido.');
        setStep(2);
      } else {
        await handleLogin();
      }
    } else {
      if (step === 1) {
        if (!email.trim() || !email.includes('@')) return setError('Correo inválido.');
        setStep(2);
      } else if (step === 2) {
        if (!fullName.trim()) return setError('El nombre es obligatorio.');
        setStep(3);
      } else if (step === 3) {
        if (!orgName.trim()) return setError('Falta el nombre de la organización.');
        setStep(4);
      } else if (step === 4) {
        if (!isPasswordValid) return setError('La contraseña no cumple los requisitos de seguridad.');
        await handleSignUp();
      } else {
        await handleVerifyRegistration();
      }
    }
  };

  // ── Login — con guards explícitos para evitar el 400 ────────────────────
  const handleLogin = async () => {
    const cleanEmail    = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Guard: evitar payload vacío que causa Error 400 en Supabase
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('El correo es inválido. Haz clic en CAMBIAR para corregirlo.');
      setStep(1);
      return;
    }
    if (!cleanPassword) {
      setError('La llave de acceso no puede estar vacía.');
      return;
    }

    console.log('[LOGIN] Enviando → email:', cleanEmail, '| password length:', cleanPassword.length);

    setLoading(true);
    try {
      await login(cleanEmail, cleanPassword);
      toast.success('Sincronización exitosa.');
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('400'))
        setError('Email o llave de acceso incorrectos. Verifica tus datos.');
      else
        setError(msg || 'Error al iniciar sesión.');
      toast.error('Fallo de acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    let signUpFailed = false;
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim(), organization_name: orgName.trim() },
        },
      });

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase() ?? '';
        // Único error definitivamente bloqueante: correo ya registrado
        if (msg.includes('already registered') || msg.includes('user already registered')) {
          throw new Error('Este correo ya está registrado. Por favor inicia sesión.');
        }
        // Cualquier otro error (500, SMTP, etc.) → lo logueamos pero continuamos
        // El backend es resiliente y crea el usuario si no existe
        console.warn('[SignUp] Error no crítico de Supabase (procediendo al backend):', signUpError.message);
        signUpFailed = true;
      }

      // El backend crea usuario (si no existe), organización y perfil
      await register({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        orgName: orgName.trim(),
      });

      if (signUpFailed) {
        toast.warning('Cuenta creada. Revisa tu bandeja de entrada o carpeta Spam.');
      } else {
        toast.success('✅ Código enviado — revisa tu correo.');
      }
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Error en registro.');
      toast.error('Fallo de registro');
    } finally {
      setLoading(false);
    }
  };

  // ── Reenviar código OTP ────────────────────────────────────────────────────
  const [resendCooldown, setResendCooldown] = React.useState(0);
  
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      toast.success('Código reenviado. Revisa tu bandeja.');
      // Cooldown de 60 segundos
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error('No se pudo reenviar el código. Intenta en unos minutos.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegistration = async () => {
    const code = otpValues.join('');
    if (code.length < 6) return setError('Ingresa el código de 6 dígitos completo.');
    setLoading(true);
    try {
      await useAuthStore.getState().activateAccount(email.trim().toLowerCase(), code);
      toast.success('¡Cuenta verificada y activada!');
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Código inválido o expirado.');
      toast.error('Error de verificación');
    } finally {
      setLoading(false);
    }
  };

  const prevStep   = () => { setError(null); setStep(s => Math.max(1, s - 1)); };
  const switchMode = (m: FlowMode) => {
    setMode(m); setStep(1); setError(null);
    setEmail(''); setPassword(''); setOtpValues(Array(6).fill(''));
    setShowSuccess(false);
  };

  const slide = {
    initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0,  filter: 'blur(0px)',  transition: { duration: 0.28 } },
    exit:    { opacity: 0, y: -14, filter: 'blur(6px)', transition: { duration: 0.18 } },
  };

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[2rem] p-10 text-center shadow-2xl">
          <div className="h-20 w-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">¡Operación Exitosa!</h2>
          <p className="text-zinc-400 mt-4 text-sm leading-relaxed">
            Tu identidad ha sido verificada y tu organización está lista para el despliegue.
          </p>
          <button onClick={() => switchMode('login')}
            className="w-full py-4 mt-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-xl">
            → INICIAR SESIÓN AHORA
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Render principal ─────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen w-full flex flex-col font-sans relative overflow-hidden transition-colors duration-700 ${
      darkMode ? 'bg-[#0a0a0f] text-white' : 'bg-slate-100 text-slate-900'
    }`}>

      {/* Ambient glows — modo login = azul, modo registro = verde/teal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-30%] left-[-10%] w-[90%] h-[90%] blur-[200px] rounded-full transition-all duration-[1500ms] ${
          !darkMode
            ? (mode === 'login' ? 'bg-blue-400/30' : 'bg-emerald-400/25')
            : (mode === 'login' ? 'bg-blue-600/25' : 'bg-emerald-500/25')
        }`} />
        <div className={`absolute bottom-[-20%] right-[-5%] w-[80%] h-[80%] blur-[220px] rounded-full transition-all duration-[1500ms] ${
          !darkMode
            ? (mode === 'login' ? 'bg-indigo-300/25' : 'bg-teal-300/25')
            : (mode === 'login' ? 'bg-blue-900/20' : 'bg-teal-400/20')
        }`} />
        <div className={`absolute top-[20%] left-[20%] w-[60%] h-[60%] blur-[250px] rounded-full transition-all duration-[1500ms] ${
          mode === 'register' ? 'opacity-100' : 'opacity-0'
        } ${!darkMode ? 'bg-green-300/20' : 'bg-green-500/15'}`} />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full px-6 py-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-brand-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Package className="text-white h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-tighter uppercase text-white">
            GKAD <span className="text-brand-400">STOCK</span>
          </span>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-[11px] font-bold text-zinc-500 hover:text-brand-400 uppercase tracking-widest transition-colors">
            {mode === 'login' ? '¿Sin cuenta? → Regístrate' : '¿Ya tienes cuenta? → Entra'}
          </button>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <button onClick={toggleDarkMode}
            className="h-10 w-10 hidden sm:flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-brand-400 transition-all">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Cuerpo */}
      <main className="flex-1 w-full flex items-center justify-center relative z-10 px-4 pt-24 pb-12">
        <div className="w-full max-w-md flex flex-col items-center gap-10">

          {/* Headline — gradiente cambia con el modo */}
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center px-4"
          >
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter uppercase">
              {mode === 'login' ? 'Acceso ' : 'Crea tu '}
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                mode === 'login'
                  ? 'from-blue-400 to-brand-400'
                  : 'from-emerald-400 to-teal-300'
              }`}>
                {mode === 'login' ? 'Corporativo' : 'Imperio'}
              </span>
            </h1>
            <p className="text-zinc-500 text-xs mt-3 tracking-wide">
              {mode === 'login'
                ? 'Acceso blindado mediante credenciales maestras corporativas.'
                : 'Inicia tu despliegue operativo con verificación inmediata.'}
            </p>
          </motion.div>

          {/* Tarjeta glassmorphism */}
          <div className={`w-full backdrop-blur-3xl rounded-[2rem] p-8 md:p-10 shadow-2xl relative border transition-all duration-[1200ms] ${
            mode === 'login'
              ? 'bg-white/[0.04] border-white/10'
              : 'bg-white/[0.05] border-emerald-500/20'
          }`}>

            {/* Botón atrás */}
            {step > 1 && (
              <button onClick={prevStep}
                className="absolute top-10 -left-5 md:-left-10 bg-white/5 border border-white/10 p-2 rounded-full text-zinc-400 hover:text-brand-400 shadow-md transition-all z-50">
                <ArrowLeft size={16} />
              </button>
            )}

            {/* Barra de progreso — color según modo */}
            <div className="flex gap-1.5 mb-8">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-700 ${
                    i < step
                      ? mode === 'login' ? 'bg-blue-500' : 'bg-emerald-500'
                      : 'bg-white/10'
                  }`} />
              ))}
            </div>

            <form onSubmit={handleNext} className="space-y-6">

              {/* Banner de error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-center">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">

                {/* ── LOGIN paso 1: Email ── */}
                {step === 1 && mode === 'login' && (
                  <motion.div key="l1" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <DarkInput label="Correo Electrónico" type="email" placeholder="TU CORREO ELECTRÓNICO"
                      icon={Mail} value={email} onChange={e => setEmail(e.target.value)} autoFocus required
                      accentClass="focus:ring-blue-500/50 focus:border-blue-500" isLight={!darkMode} />
                  </motion.div>
                )}

                {/* ── LOGIN paso 2: Confirmación de email + Llave de acceso ── */}
                {step === 2 && mode === 'login' && (
                  <motion.div key="l2" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-5">

                    {/* Card de confirmación de correo */}
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Mail size={15} className="text-brand-400 flex-shrink-0" />
                        <span className="text-sm text-white font-semibold truncate max-w-[180px]">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={prevStep}
                        className="text-[10px] font-black text-zinc-400 hover:text-brand-400 uppercase tracking-widest transition-colors flex-shrink-0 ml-2"
                      >
                        CAMBIAR
                      </button>
                    </div>

                    <DarkInput label="Llave de Acceso" type="password" placeholder="••••••••"
                      icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required
                      accentClass="focus:ring-blue-500/50 focus:border-blue-500" isLight={!darkMode} />
                  </motion.div>
                )}

                {/* ── REGISTRO paso 1: Email ── */}
                {step === 1 && mode === 'register' && (
                  <motion.div key="r1" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <DarkInput label="Correo Electrónico" type="email" placeholder="TU CORREO ELECTRÓNICO"
                      icon={Mail} value={email} onChange={e => setEmail(e.target.value)} autoFocus required
                      accentClass="focus:ring-emerald-500/50 focus:border-emerald-500" isLight={!darkMode} />
                  </motion.div>
                )}

                {/* ── REGISTRO paso 2: Nombre ── */}
                {step === 2 && mode === 'register' && (
                  <motion.div key="r2" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <DarkInput label="Tu Nombre Completo" type="text" placeholder="EJ. JUAN PÉREZ"
                      icon={Sparkles} value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
                      accentClass="focus:ring-emerald-500/50 focus:border-emerald-500" isLight={!darkMode} />
                  </motion.div>
                )}

                {/* ── REGISTRO paso 3: Organización ── */}
                {step === 3 && mode === 'register' && (
                  <motion.div key="r3" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <DarkInput label="Nombre de tu Organización" type="text" placeholder="MI EMPRESA SAS"
                      icon={Package} value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus
                      accentClass="focus:ring-emerald-500/50 focus:border-emerald-500" isLight={!darkMode} />
                  </motion.div>
                )}

                {/* ── REGISTRO paso 4: Contraseña + validador ── */}
                {step === 4 && mode === 'register' && (
                  <motion.div key="r4" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <DarkInput label="Llave de Acceso" type="password" placeholder="MÍNIMO 8 CARACTERES"
                      icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required
                      accentClass="focus:ring-emerald-500/50 focus:border-emerald-500" />

                    <div className="bg-white/[0.03] border border-white/8 p-4 rounded-2xl space-y-2.5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Políticas de Seguridad
                      </p>
                      {passwordRules.map(rule => {
                        const ok = rule.check(password);
                        return (
                          <div key={rule.id} className="flex items-center gap-3">
                            {ok
                              ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                              : <Circle      size={15} className="text-zinc-600 flex-shrink-0" />}
                            <span className={`text-xs font-medium transition-colors duration-300 ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {rule.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── REGISTRO paso 5: OTP ── */}
                {step === 5 && mode === 'register' && (
                  <motion.div key="r5" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-6">
                    <div className="text-center p-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
                      <ShieldCheck className="mx-auto text-emerald-400 mb-3" size={30} />
                      <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Verifica tu Cuenta</p>
                      <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-wide leading-relaxed">
                        Enviamos un código de 6 dígitos a{' '}
                        <span className="text-white font-bold">{email}</span>.
                        Ingrésalo para activar tu acceso.
                      </p>
                      <p className="text-[9px] text-zinc-600 mt-1">⚠️ Revisa también la carpeta de Spam.</p>
                    </div>

                    <div className="flex justify-between gap-2 sm:gap-3">
                      {otpValues.map((val, i) => (
                        <input key={`otp-${i}`} ref={el => otpRefs.current[i] = el}
                          type="text" inputMode="numeric" maxLength={1}
                          value={val}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          autoFocus={i === 0} required
                          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300 backdrop-blur-md shadow-inner" />
                      ))}
                    </div>

                    {/* Botón reenviar con cooldown */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || loading}
                        className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${
                          resendCooldown > 0
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {resendCooldown > 0
                          ? `↺ Reenviar código (${resendCooldown}s)`
                          : '↺ No llegó el código — Reenviar'}
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* ── CTAs por paso ── */}
              {/* Login paso 1 y Registro paso 1,2,3 → blanco */}
              {step === 1 && (
                <PrimaryBtn type="submit" loading={loading}>
                  <ArrowRight size={16} /> → SIGUIENTE PASO
                </PrimaryBtn>
              )}

              {/* Login paso 2 → "Sincronizar y Entrar" */}
              {step === 2 && mode === 'login' && (
                <PrimaryBtn type="submit" loading={loading}>
                  <LogIn size={16} /> → SINCRONIZAR Y ENTRAR
                </PrimaryBtn>
              )}

              {/* Registro pasos intermedios (2,3) */}
              {(step === 2 || step === 3) && mode === 'register' && (
                <PrimaryBtn type="submit" loading={loading}>
                  <ArrowRight size={16} /> → SIGUIENTE PASO
                </PrimaryBtn>
              )}

              {/* Registro paso 4 — deshabilitado hasta contraseña válida */}
              {step === 4 && mode === 'register' && (
                <PrimaryBtn type="submit" loading={loading} disabled={!isPasswordValid}>
                  <ArrowRight size={16} /> → CONTINUAR
                </PrimaryBtn>
              )}

              {/* Registro paso 5 — OTP */}
              {step === 5 && mode === 'register' && (
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-brand-500 text-white font-black uppercase tracking-[0.18em] text-sm
                    hover:bg-brand-600 active:scale-[0.98] transition-all shadow-xl shadow-brand-500/20
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <ShieldCheck size={16} />
                  {loading ? 'VERIFICANDO...' : '→ ACTIVAR CUENTA'}
                </button>
              )}

            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
