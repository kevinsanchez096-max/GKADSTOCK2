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
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

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
  
  const { requestOTP, verifyOTP, register } = useAuthStore();
  
  // States
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');

  const handleNext = async (e?: React.FormEvent) => {
     if (e) e.preventDefault();
     setError(null);
     
     if (mode === 'login') {
        if (step === 1) {
           if (!email.trim() || !email.includes('@')) {
              setError('Ingresa un correo profesional válido.');
              return;
           }
           await handleRequestOTP();
        } else if (step === 2) {
           await handleVerifyOTP();
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
           await handleRequestOTP();
        } else if (step === 4) {
           await handleRegistration();
        }
     }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      await requestOTP(email.trim().toLowerCase());
      toast.success('Código de acceso enviado a tu correo.');
      setStep(mode === 'login' ? 2 : 4);
    } catch (err: any) {
      setError(err.message || 'Error al enviar código.');
      toast.error('Fallo al enviar OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpToken.length < 6) return setError('El código debe tener 6 dígitos.');
    setLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), otpToken);
      toast.success('¡Identidad verificada!');
    } catch (err: any) {
      setError('Código inválido o expirado.');
      toast.error('Error de verificación');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
     setLoading(true);
     try {
        // Primero verificamos el OTP
        await verifyOTP(email.trim().toLowerCase(), otpToken);
        
        // Si el OTP es válido, creamos la organización en el backend
        // Nota: El backend registrar ya no pide contraseña en este nuevo flujo
        await register({ 
          email: email.trim().toLowerCase(), 
          fullName: fullName.trim(), 
          orgName: orgName.trim(),
          password: 'OTP_VERIFIED' // Password dummy para compatibilidad
        });
        
        toast.success('Cuenta activada con éxito. Imperio creado.');
     } catch (err: any) {
        setError(err.message || 'Error en registro.');
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
     setOtpToken('');
  };

  const variants = {
    initial: { opacity: 0, y: 15, filter: 'blur(5px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit:    { opacity: 0, y: -15, filter: 'blur(5px)' }
  };

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
                  {mode === 'login' ? 'Acceso mediante ' : 'Crea tu '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-blue-500">
                     {mode === 'login' ? 'Identidad Segura' : 'Imperio Comercial'}
                  </span>
               </h1>
               <p className="text-slate-600 dark:text-zinc-400 font-medium text-xs md:text-sm mt-4 max-w-md mx-auto tracking-wide">
                  {mode === 'login' 
                     ? 'Sin contraseñas. Solo tu correo y un código de acceso blindado.' 
                     : 'Inicia tu despliegue operativo con verificación inmediata.'}
               </p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-black/20 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl relative">
               
               {/* STEP INDICATOR */}
               {step > 1 && (
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

                     {/* PASO 2: OTP (Login) */}
                     {step === 2 && mode === 'login' && (
                        <motion.div key="s2" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <div className="text-center p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl mb-6">
                              <ShieldCheck className="mx-auto text-brand-500 mb-2" size={24} />
                              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Código enviado a {email}</p>
                              <p className="text-[9px] text-zinc-500 mt-1 uppercase">Revisa tu bandeja de entrada o spam.</p>
                           </div>
                           <Input 
                              label="Código de Acceso" 
                              type="text" 
                              placeholder="123456" 
                              icon={KeyRound} 
                              value={otpToken} 
                              onChange={e => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))} 
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

                     {/* REGISTRO: PASO 4 (OTP Confirm) */}
                     {step === 4 && mode === 'register' && (
                        <motion.div key="r4" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                           <div className="text-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mb-6">
                              <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
                              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verificación en curso</p>
                              <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest">Ingresa el código enviado a {email}</p>
                           </div>
                           <Input label="Código de Confirmación" type="text" placeholder="123456" icon={KeyRound} value={otpToken} onChange={e => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus required />
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <Button 
                     type="submit" 
                     loading={loading}
                     className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                     icon={step === (mode === 'login' ? 2 : 4) ? LogIn : ArrowRight}
                  >
                     {step === (mode === 'login' ? 2 : 4) ? 'VERIFICAR Y ENTRAR' : 'OBTENER CÓDIGO'}
                  </Button>

                  <div className="pt-4 text-center">
                     <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        Seguridad de Grado Militar Blindada por Supabase
                     </p>
                  </div>
               </form>
            </div>
         </div>
      </main>
    </div>
  );
};
