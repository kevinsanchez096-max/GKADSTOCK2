import React, { useState } from 'react';
import { Button, Input } from './ui-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  KeyRound,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  Lock,
  Circle
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

type FlowMode = 'login' | 'register';

export const AuthForm = ({ darkMode, toggleDarkMode }: AuthFormProps) => {
  const [mode, setMode] = useState<FlowMode>('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, register } = useAuthStore();
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
       // Paste logic
       const pastedData = value.replace(/\D/g, '').slice(0, 6).split('');
       const newOtp = [...otpValues];
       pastedData.forEach((char, i) => { if (index + i < 6) newOtp[index + i] = char; });
       setOtpValues(newOtp);
       if (index + pastedData.length < 6) {
          otpRefs.current[index + pastedData.length]?.focus();
       } else {
          otpRefs.current[5]?.focus();
       }
       return;
    }
    
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const passwordValidations = [
    { id: 'length', text: 'Mínimo 8 caracteres', check: (pwd: string) => pwd.length >= 8 },
    { id: 'uppercase', text: 'Una letra mayúscula', check: (pwd: string) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', text: 'Una letra minúscula', check: (pwd: string) => /[a-z]/.test(pwd) },
    { id: 'number', text: 'Un número', check: (pwd: string) => /[0-9]/.test(pwd) },
    { id: 'special', text: 'Un carácter especial', check: (pwd: string) => /[^A-Za-z0-9]/.test(pwd) }
  ];

  const isPasswordValid = passwordValidations.every(v => v.check(password));

  const handleNext = async (e?: React.FormEvent) => {
     if (e) e.preventDefault();
     setError(null);
     
     if (mode === 'login') {
        if (step === 1) {
           if (!email.trim() || !email.includes('@')) {
              setError('Ingresa un correo profesional válido.');
              return;
           }
           setStep(2);
        } else if (step === 2) {
           await handleLogin();
        }
     } else {
        // MODO REGISTRO
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
           if (!isPasswordValid) return setError('La contraseña no cumple con los requisitos de seguridad.');
           await handleSignUp();
        } else if (step === 5) {
           await handleVerifyRegistration();
        }
     }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Sesión iniciada con éxito.');
    } catch (err: any) {
      setError(err.message || 'Error en credenciales.');
      toast.error('Fallo de acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // 1. Registro inicial en Supabase Auth (Cliente)
      // Esto enviará el correo de confirmación
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            organization_name: orgName.trim()
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (signUpError) throw signUpError;

      // 2. Notificar al backend para crear la infraestructura (Org, Perfil)
      // El backend lo creará como "pendiente" o "inactivo"
      await register({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        orgName: orgName.trim()
      });

      toast.success('Registro procesado. Verifica tu email.');
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Error en registro.');
      toast.error('Fallo de registro');
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
      toast.success('¡Cuenta verificada y activada! Ya puedes entrar.');
      setShowSuccessScreen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Código inválido o expirado.');
      toast.error('Error de verificación');
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => {
     setError(null);
     setStep(s => Math.max(1, s - 1));
  };

  const switchMode = (newMode: FlowMode) => {
     setMode(newMode);
     setStep(1);
     setError(null);
     setPassword('');
     setOtpValues(Array(6).fill(''));
     setShowSuccessScreen(false);
  };

  const variants = {
    initial: { opacity: 0, y: 15, filter: 'blur(5px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit:    { opacity: 0, y: -15, filter: 'blur(5px)' }
  };

  if (showSuccessScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white dark:bg-black/20 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-[2rem] p-10 text-center shadow-2xl">
           <div className="h-20 w-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
              <CheckCircle2 size={40} />
           </div>
           <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase font-outfit tracking-tighter">¡Operación Exitosa!</h2>
           <p className="text-slate-600 dark:text-zinc-400 mt-4 font-medium">Tu identidad ha sido verificada y tu organización está lista para el despliegue.</p>
           <Button onClick={() => switchMode('login')} className="w-full h-14 mt-10 rounded-2xl bg-brand-500 text-white font-black uppercase tracking-widest shadow-xl shadow-brand-500/20">
              INICIAR SESIÓN AHORA
           </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-zinc-100 relative overflow-hidden transition-colors duration-500">
      
      {/* HEADER FIJO */}
      <header className="absolute top-0 left-0 w-full px-6 py-6 flex justify-between items-center z-50">
         <div className="flex items-center gap-3">
           <div className="h-10 w-10 bg-gradient-to-tr from-brand-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
             <Package className="text-white h-5 w-5" />
           </div>
           <span className="text-lg font-black tracking-tighter font-outfit uppercase text-slate-900 dark:text-white">GKAD <span className="text-brand-500">STOCK</span></span>
         </div>
         
         <div className="flex items-center gap-6">
            <button 
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} 
              className="text-[11px] font-bold text-zinc-400 hover:text-brand-500 uppercase tracking-widest transition-colors"
            >
               {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
            </button>
            <div className="w-[1px] h-6 bg-black/5 dark:bg-white/10 hidden sm:block" />
            <button 
              onClick={toggleDarkMode}
              className="h-10 w-10 hidden sm:flex items-center justify-center bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-all shadow-xl"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
         </div>
      </header>

      {/* AMBIENT GLOWS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-brand-500/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[60%] h-[60%] bg-blue-600/10 blur-[180px] rounded-full mix-blend-screen" />
      </div>

      {/* CENTRO INMERSIVO */}
      <main className="flex-1 w-full flex items-center justify-center relative z-10 px-4">
         <div className="w-full max-w-2xl flex flex-col items-center">
            
            <div className="text-center mb-16 px-4">
               <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter font-outfit uppercase">
                  {mode === 'login' ? 'Bienvenido a la ' : 'Crea tu '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-blue-500">
                     {mode === 'login' ? 'Nueva Era POS' : 'Imperio Comercial'}
                  </span>
               </h1>
               <p className="text-slate-600 dark:text-zinc-400 font-medium text-xs md:text-sm mt-4 max-w-md mx-auto tracking-wide">
                  {mode === 'login' 
                     ? 'Acceso blindado mediante credenciales maestras corporativas.' 
                     : 'Inicia tu despliegue operativo con verificación inmediata.'}
               </p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-black/20 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl relative">
               
               {/* STEP INDICATOR */}
               {step > 1 && !showSuccessScreen && (
                  <button onClick={prevStep} className="absolute top-10 -left-6 md:-left-10 bg-white dark:bg-zinc-800 p-2 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-brand-500 shadow-md transition-all z-50">
                     <ArrowLeft size={16} />
                  </button>
               )}

               <form onSubmit={handleNext} className="space-y-6">
                  
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-center">
                         {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                     {/* PASO 1: Email */}
                     {step === 1 && (
                        <motion.div key="s1" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <Input 
                              label="Correo Electrónico" 
                              type="email" 
                              placeholder="ceo@negocio.com" 
                              icon={Mail} 
                              value={email} 
                              onChange={e => setEmail(e.target.value)} 
                              autoFocus 
                              required 
                           />
                        </motion.div>
                     )}

                     {/* PASO 2: Password (Login) */}
                     {step === 2 && mode === 'login' && (
                        <motion.div key="s2" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <Input 
                              label="Contraseña" 
                              type="password" 
                              placeholder="••••••••" 
                              icon={Lock} 
                              value={password} 
                              onChange={e => setPassword(e.target.value)} 
                              autoFocus 
                              required 
                           />
                        </motion.div>
                     )}

                     {/* REGISTRO: PASO 2 (Nombre) */}
                     {step === 2 && mode === 'register' && (
                        <motion.div key="r2" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <Input label="Tu Nombre Completo" type="text" placeholder="Ej. Juan Pérez" icon={Sparkles} value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
                        </motion.div>
                     )}

                     {/* REGISTRO: PASO 3 (Org) */}
                     {step === 3 && mode === 'register' && (
                        <motion.div key="r3" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <Input label="Nombre de tu Organización" type="text" placeholder="Mi Empresa SAS" icon={Package} value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus />
                        </motion.div>
                     )}

                     {/* REGISTRO: PASO 4 (Password) */}
                     {step === 4 && mode === 'register' && (
                        <motion.div key="r4" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <Input label="Crea tu Contraseña" type="password" placeholder="Mínimo 8 caracteres" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
                           
                           <div className="bg-white/5 dark:bg-black/20 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-2">
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-300 uppercase tracking-widest mb-3">Políticas de Seguridad</p>
                              {passwordValidations.map(validation => {
                                 const isValid = validation.check(password);
                                 return (
                                    <div key={validation.id} className="flex items-center gap-3 transition-colors duration-300">
                                       {isValid ? (
                                          <CheckCircle2 size={16} className="text-emerald-500" />
                                       ) : (
                                          <Circle size={16} className="text-zinc-400 dark:text-zinc-600" />
                                       )}
                                       <span className={`text-xs font-medium transition-colors duration-300 ${isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                          {validation.text}
                                       </span>
                                    </div>
                                 );
                              })}
                           </div>
                        </motion.div>
                     )}

                     {/* REGISTRO: PASO 5 (Verification) */}
                     {step === 5 && mode === 'register' && (
                        <motion.div key="r5" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <div className="text-center p-6 bg-brand-500/5 border border-brand-500/10 rounded-2xl mb-6">
                              <ShieldCheck className="mx-auto text-brand-500 mb-3" size={32} />
                              <p className="text-[11px] font-black text-brand-500 uppercase tracking-widest">Verifica tu cuenta</p>
                              <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-wide leading-relaxed">
                                Hemos enviado un código de 6 dígitos a <span className="text-slate-900 dark:text-white font-bold">{email}</span>.
                                Por favor ingrésalo abajo para activar tu acceso.
                              </p>
                           </div>
                           
                           <div className="flex justify-between gap-2 sm:gap-3">
                              {otpValues.map((value, index) => (
                                 <input
                                    key={`otp-${index}`}
                                    ref={el => otpRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={value}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
                                    autoFocus={index === 0}
                                    required
                                 />
                              ))}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <Button 
                     type="submit" 
                     loading={loading}
                     disabled={mode === 'register' && step === 4 && !isPasswordValid}
                     className={`w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition-all ${
                        mode === 'register' && step === 4 && !isPasswordValid
                           ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-60'
                           : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-95'
                     }`}
                     icon={step === (mode === 'login' ? 2 : 5) ? LogIn : ArrowRight}
                  >
                     {step === (mode === 'login' ? 2 : 5) ? (mode === 'login' ? 'INICIAR SESIÓN' : 'ACTIVAR CUENTA') : 'CONTINUAR'}
                  </Button>

                  <div className="pt-4 text-center">
                     <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {step === 5 ? '¿No recibiste el código? Revisa Spam o espera 60s' : 'Infraestructura de Seguridad GKAD STOCK v5'}
                     </p>
                  </div>
               </form>
            </div>
         </div>
      </main>
    </div>
  );
};
