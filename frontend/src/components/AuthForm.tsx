import React, { useState } from 'react';
import { Button, Input } from './ui-components';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Building, Mail, Lock, User, Eye, EyeOff, ShieldCheck, Sun, Moon, ArrowRight, ArrowLeft, Package, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

interface AuthFormProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

type FlowMode = 'login' | 'register' | 'force_change';

export const AuthForm = ({ darkMode, toggleDarkMode }: AuthFormProps) => {
  const [mode, setMode] = useState<FlowMode>('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, register } = useAuthStore();
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  
  // Force change state
  const [tempUser, setTempUser] = useState<any>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // PASSWORD POLICY
  const passwordRules = [
    { label: '8+ caract.', test: (p: string) => p.length >= 8 },
    { label: 'Mayúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Minúscula', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Número', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];
  const rulesMet = passwordRules.map(r => r.test(password));
  const isPasswordValid = rulesMet.every(Boolean);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isSubmitDisabled = mode === 'register' && step === 4 ? (!isPasswordValid || !doPasswordsMatch) : false;

  const nextStep = (e?: React.FormEvent) => {
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
           authenticate();
        }
     } else if (mode === 'register') {
        if (step === 1) {
           if (!email.trim() || !email.includes('@')) return setError('Correo inválido.');
           setStep(2);
        } else if (step === 2) {
           if (!fullName.trim()) return setError('El nombre es obligatorio.');
           setStep(3);
        } else if (step === 3) {
           if (!orgName.trim()) return setError('Falta la organización.');
           setStep(4);
        } else if (step === 4) {
           handleRegistration();
        }
     } else if (mode === 'force_change') {
        if (step === 1) {
           if (!newPass) return setError('Ingresa una contraseña nueva.');
           setStep(2);
        } else if (step === 2) {
           if (newPass !== confirmNewPass) return setError('Las contraseñas no coinciden.');
           if (newPass.length < 6) return setError('Debe tener mínimo 6 caracteres.');
           executeForceChange();
        }
     }
  };

  const prevStep = () => {
     setError(null);
     setStep(s => Math.max(1, s - 1));
  };

  const authenticate = async () => {
    setLoading(true);
    setError(null);
    try {
      const clearEmail = email.trim().toLowerCase();
      console.log('Intentando login con:', { email: clearEmail, passwordLength: password.length });
      const response: any = await login(clearEmail, password);
      // MODO AD INTERCEPTION
      if (response?.requirePasswordChange) {
         setTempUser(response.user);
         setMode('force_change');
         setStep(1);
         toast.info('Cambio de contraseña administrativo requerido.');
         setLoading(false);
         return;
      }
      toast.success('¡Acceso concedido!');
    } catch (err: any) {
      console.error('Error de Auth (Crudo):', err);
      const msg = err.response?.data?.error || err.message || JSON.stringify(err) || 'Error de autenticación';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
     if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
     }
     setLoading(true);
     setError(null);
     try {
        await register({ email, password, fullName: fullName.trim(), orgName: orgName.trim() });
        await login(email, password);
        toast.success('Cuenta activada con éxito. Imperio creado.');
     } catch (err: any) {
        const msg = err.response?.data?.error || err.message || 'Error en registro.';
        setError(msg);
        toast.error(msg);
     } finally {
        setLoading(false);
     }
  };

  const executeForceChange = async () => {
     setLoading(true);
     try {
       const { api } = await import('../lib/api');
       await api.post('/auth/force-change-password', {
          userId: tempUser.id,
          newPassword: newPass
       });
       toast.success('Seguridad actualizada. Inicia sesión ahora.');
       setMode('login');
       setStep(1);
       setNewPass('');
       setConfirmNewPass('');
     } catch (err: any) {
       setError(err.response?.data?.error || 'Error al actualizar clave.');
     } finally {
       setLoading(false);
     }
  };

  const switchMode = (newMode: FlowMode) => {
     setMode(newMode);
     setStep(1);
     setError(null);
     if (newMode === 'login') {
        setPassword('');
     }
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
           {mode === 'login' ? (
              <button onClick={() => switchMode('register')} className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                 ¿No tienes cuenta? <span className="text-brand-500">Regístrate</span>
              </button>
           ) : (
              <button onClick={() => switchMode('login')} className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                 ¿Ya tienes cuenta? <span className="text-brand-500">Inicia Sesión</span>
              </button>
           )}
           <div className="w-[1px] h-6 bg-white/10 hidden sm:block" />
           <button 
             onClick={toggleDarkMode}
             className="h-10 w-10 hidden sm:flex items-center justify-center bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-all hover:scale-105 active:scale-95 shadow-xl"
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
            
            {/* TITULAR GRAN FORMATO */}
            <div className="text-center mb-16 px-4">
               {mode === 'force_change' ? (
                  <>
                     <ShieldCheck className="h-16 w-16 text-brand-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]" strokeWidth={1.5} />
                     <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter font-outfit uppercase">
                        Protocolo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-emerald-500">Bóveda Cero</span>
                     </h1>
                     <p className="text-slate-600 dark:text-zinc-400 font-medium text-xs md:text-sm mt-4 lg:w-3/4 mx-auto tracking-wide">
                        El administrador ha requerido una actualización inmediata de tú bóveda de acceso. Establece una contraseña hermética y blindada.
                     </p>
                  </>
               ) : (
                  <>
                     <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter font-outfit uppercase drop-shadow-sm">
                        {mode === 'login' ? 'Toma el ' : 'Construye tu '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-blue-500 to-brand-400 bg-[length:200%_auto] animate-gradient">
                           {mode === 'login' ? 'Control Total' : 'Imperio Ágil'}
                        </span>
                        <br />
                        {mode === 'login' ? 'de tu Éxito.' : 'desde Hoy.'}
                     </h1>
                     <p className="text-slate-600 dark:text-zinc-400 font-medium text-xs md:text-sm mt-4 max-w-md mx-auto tracking-wide">
                        {mode === 'login' 
                           ? 'Ingresa tu identidad digital para un despliegue operativo en tiempo récord.' 
                           : 'Provisionando un ecosistema comercial ultrarrápido y modular.'}
                     </p>
                  </>
               )}
            </div>

            {/* FORMULARIO PROGRESIVO DE CRISTAL */}
            <div className="w-full max-w-md bg-white dark:bg-black/20 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
               
               {/* INDICADOR DE PASOS (Solo Registro o Force Change) */}
               {(mode === 'register' || mode === 'force_change') && (
                  <div className="flex items-center justify-center gap-2 mb-8">
                     {Array.from({ length: mode === 'register' ? 4 : 2 }).map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 === step ? 'w-8 bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : i + 1 < step ? 'w-4 bg-emerald-500' : 'w-4 bg-white/10'}`} />
                     ))}
                  </div>
               )}

               {/* BACK BUTTON */}
               {step > 1 && (
                  <button onClick={prevStep} className="absolute top-10 -left-6 md:-left-10 bg-white dark:bg-zinc-800 p-2 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-brand-500 shadow-md transition-all z-50 hover:scale-110 active:scale-95" title="Regresar al paso anterior">
                     <ArrowLeft size={16} />
                  </button>
               )}

               <form onSubmit={nextStep} className="relative space-y-6">
                  
                  {/* ALERTA DE ERROR */}
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
                         {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* VISTA LOGIN */}
                  {mode === 'login' && (
                     <AnimatePresence mode="wait">
                        {step === 1 && (
                           <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <Input 
                                 id="auth-email-step" 
                                 label="Correo Corporativo" 
                                 type="email" 
                                 placeholder="admin@operaciones.com" 
                                 icon={Mail} 
                                 value={email} 
                                 onChange={(e) => setEmail(e.target.value)} 
                                 autoFocus
                                 required
                              />
                           </motion.div>
                        )}
                        {step === 2 && (
                           <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-500/10 border border-brand-500/20 rounded-xl mb-6">
                                 <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <CheckCircle2 className="text-brand-500 h-4 w-4 shrink-0" />
                                    <span className="text-xs font-bold text-slate-900 dark:text-white tracking-widest truncate">{email}</span>
                                 </div>
                                 <button type="button" onClick={() => setStep(1)} className="shrink-0 text-[9px] uppercase font-black text-brand-500 hover:text-white tracking-widest">Cambiar</button>
                              </div>
                              <div className="relative">
                                 <Input 
                                    id="auth-password-step" 
                                    label="Llave de Acceso" 
                                    type={showPassword ? 'text' : 'password'} 
                                    placeholder="••••••••" 
                                    icon={Lock} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    autoFocus
                                    required
                                 />
                                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[36px] text-zinc-500 hover:text-brand-500 transition-colors">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                 </button>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  )}

                  {/* VISTA REGISTRO */}
                  {mode === 'register' && (
                     <AnimatePresence mode="wait">
                        {step === 1 && (
                           <motion.div key="r1" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <Input id="reg-email" label="Tu Correo Electrónico" type="email" placeholder="ceo@empresa.com" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                           </motion.div>
                        )}
                        {step === 2 && (
                           <motion.div key="r2" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <Input id="reg-name" label="Nombre del Administrador" type="text" placeholder="Ej. Carlos Torres" icon={User} value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
                           </motion.div>
                        )}
                        {step === 3 && (
                           <motion.div key="r3" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <Input id="reg-org" label="Razón Social o Nombre del Negocio" type="text" placeholder="Imperio Comercial SAS" icon={Building} value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus />
                           </motion.div>
                        )}
                        {step === 4 && (
                           <motion.div key="r4" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                              <div className="relative">
                                 <Input id="reg-pass" label="Crea tu Contraseña" type={showPassword ? 'text' : 'password'} placeholder="••••••••" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
                                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[36px] text-zinc-500 hover:text-brand-500 transition-colors">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                 </button>
                                 <div className="flex flex-wrap gap-x-3 gap-y-2 mt-4 px-1">
                                   {passwordRules.map((rule, i) => (
                                      <div key={i} className={`flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest transition-colors ${rulesMet[i] ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-600'}`}>
                                         <CheckCircle2 size={12} className={rulesMet[i] ? "opacity-100" : "opacity-30"} />
                                         <span>{rule.label}</span>
                                      </div>
                                   ))}
                                 </div>
                              </div>
                              <div className="pt-2">
                                 <Input id="reg-confirm" label="Re-ingresa la Contraseña" type={showPassword ? 'text' : 'password'} placeholder="••••••••" icon={Lock} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                 {confirmPassword.length > 0 && !doPasswordsMatch && (
                                    <p className="text-red-500 text-[10px] uppercase font-black tracking-widest mt-3 ml-1 animate-pulse">✖ Las contraseñas no coinciden</p>
                                 )}
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  )}

                  {/* VISTA FORCE CHANGE */}
                  {mode === 'force_change' && (
                     <AnimatePresence mode="wait">
                        {step === 1 && (
                           <motion.div key="f1" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <Input id="force-new" label="Define tu Nueva Bóveda" type={showPassword ? 'text' : 'password'} placeholder="••••••••" icon={Lock} value={newPass} onChange={e => setNewPass(e.target.value)} autoFocus />
                           </motion.div>
                        )}
                        {step === 2 && (
                           <motion.div key="f2" variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                              <Input id="force-confirm" label="Valida tu Nueva Bóveda" type={showPassword ? 'text' : 'password'} placeholder="••••••••" icon={Lock} value={confirmNewPass} onChange={e => setConfirmNewPass(e.target.value)} autoFocus />
                           </motion.div>
                        )}
                     </AnimatePresence>
                  )}

                  <div className="pt-4">
                     <Button 
                        type="submit" 
                        loading={loading}
                        disabled={isSubmitDisabled}
                        className={`w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-transform shadow-xl hover:shadow-2xl ${
                           isSubmitDisabled 
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                              : 'bg-zinc-900 border border-zinc-800 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95'
                        }`}
                        icon={mode === 'login' && step === 2 ? LogIn : ArrowRight}
                     >
                        {mode === 'login' 
                           ? (step === 1 ? 'CONTINUAR EL ACCESO' : 'SINCRONIZAR Y ENTRAR') 
                           : mode === 'register' 
                              ? (step === 4 ? 'PROVISIONAR IMPERIO' : 'SIGUIENTE PASO')
                              : (step === 2 ? 'ASEGURAR BÓVEDA' : 'CONTINUAR')
                        }
                     </Button>
                  </div>

               </form>
            </div>
         </div>
      </main>

    </div>
  );
};
