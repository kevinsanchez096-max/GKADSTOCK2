import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Check, Zap, Shield, Star, Sparkles,
  Package, Contact, Truck, Layers, Users, 
  BarChart3, Headphones, ArrowRight, X,
  CreditCard, Landmark, Loader2, Lock, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { toast } from 'sonner';

// ── Plan Definitions ─────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'Starter',
    name: 'Starter',
    subtitle: 'Ideal para empezar',
    price: 'Gratis',
    priceNote: 'Para siempre',
    icon: Zap,
    color: '#71717a',
    gradient: 'from-zinc-600 to-zinc-700',
    borderColor: '#2a2a2a',
    features: [
      { text: '20 productos', icon: Package },
      { text: '5 categorías', icon: Layers },
      { text: '2 clientes', icon: Contact },
      { text: '5 proveedores', icon: Truck },
      { text: 'Punto de venta básico', icon: Star },
      { text: 'Dashboard limitado', icon: BarChart3 },
    ],
    limitations: [
      'Sin soporte prioritario',
      'Sin reportes avanzados',
      'Sin personalización de marca',
    ],
    cta: 'Plan actual',
    popular: false,
  },
  {
    id: 'Esencial',
    name: 'Esencial',
    subtitle: 'Para negocios en crecimiento',
    price: '$39.000',
    priceNote: '/mes',
    icon: Shield,
    color: '#3b82f6',
    gradient: 'from-blue-600 to-blue-700',
    borderColor: '#3b82f6',
    features: [
      { text: 'Productos ilimitados', icon: Package },
      { text: 'Categorías ilimitadas', icon: Layers },
      { text: 'Clientes ilimitados', icon: Contact },
      { text: 'Proveedores ilimitados', icon: Truck },
      { text: 'Dashboard completo', icon: BarChart3 },
      { text: 'Soporte por email', icon: Headphones },
    ],
    limitations: [],
    cta: 'Comenzar ahora',
    popular: false,
  },
  {
    id: 'Avanzado',
    name: 'Avanzado',
    subtitle: 'Potencia tu operación',
    price: '$65.000',
    priceNote: '/mes',
    icon: Star,
    color: '#6366f1',
    gradient: 'from-indigo-600 to-indigo-700',
    borderColor: '#6366f1',
    features: [
      { text: 'Todo lo de Esencial', icon: Check },
      { text: 'Multi-usuario (hasta 5)', icon: Users },
      { text: 'Reportes avanzados', icon: BarChart3 },
      { text: 'Personalización de marca', icon: Sparkles },
      { text: 'Soporte prioritario', icon: Headphones },
      { text: 'Exportación de datos', icon: Star },
    ],
    limitations: [],
    cta: 'Elegir Avanzado',
    popular: true,
  },
  {
    id: 'Premium',
    name: 'Premium',
    subtitle: 'Máximo rendimiento',
    price: '$145.000',
    priceNote: '/mes',
    icon: Crown,
    color: '#f59e0b',
    gradient: 'from-amber-500 to-amber-600',
    borderColor: '#f59e0b',
    features: [
      { text: 'Todo lo de Avanzado', icon: Check },
      { text: 'Usuarios ilimitados', icon: Users },
      { text: 'API dedicada', icon: Zap },
      { text: 'Soporte 24/7', icon: Headphones },
      { text: 'Auditoría avanzada', icon: Shield },
      { text: 'Onboarding personalizado', icon: Sparkles },
    ],
    limitations: [],
    cta: 'Adquirir Premium',
    popular: false,
  },
];

const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Nequi',
  'DaviPlata',
  'Davivienda',
  'Banco de Bogotá',
  'Banco BBVA',
  'Banco Popular',
  'Banco de Occidente',
  'Lulo Bank',
  'RappiPay',
  'Banco GNB Sudameris'
];

// ── Component ────────────────────────────────────────────────────────────
export const SubscriptionPlans = () => {
  const { profile } = useAuthStore();
  const orgStore = useOrganizationStore();
  const currentPlan = orgStore.organization?.plan || profile?.organizations?.plan || 'Starter';
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pse'>('card');
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'processing' | 'success'>('form');
  const [processingMessage, setProcessingMessage] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  // Estados de los formularios de pago
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [pseBank, setPseBank] = useState('');
  const [pseClientType, setPseClientType] = useState('Persona Natural');
  const [pseEmail, setPseEmail] = useState('');
  const [pseDoc, setPseDoc] = useState('');

  const getPlanDetails = (planId: string) => PLANS.find(p => p.id === planId) || PLANS[0];

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan) return;

    if (planId === 'Starter') {
      const loadingToast = toast.loading('Activando tu plan Starter...');
      try {
        await orgStore.updateOrganization({ plan: 'Starter' });
        toast.dismiss(loadingToast);
        toast.success('¡Plan Starter activado con éxito!', {
          style: { background: '#10b981', color: '#fff', border: 'none' }
        });
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('Error al activar el plan Starter');
      }
      return;
    }

    setSelectedPlan(planId);
    setCardNum('');
    setCardName('');
    setCardExpiry('');
    setCardCvv('');
    setPseBank('');
    setPseEmail('');
    setPseDoc('');
    setCheckoutStep('form');
    setShowCheckout(true);
  };

  const handleCardNumberChange = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNum(parts.join(' '));
    } else {
      setCardNum(v);
    }
  };

  const handleExpiryChange = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      setCardExpiry(`${v.substring(0, 2)}/${v.substring(2, 4)}`);
    } else {
      setCardExpiry(v);
    }
  };

  const executeSimulatedPayment = () => {
    if (paymentMethod === 'card') {
      if (!cardNum || !cardName || !cardExpiry || !cardCvv) {
        toast.warning('Completa todos los campos de tu tarjeta de crédito');
        return;
      }
    } else {
      if (!pseBank || !pseEmail || !pseDoc) {
        toast.warning('Completa todos los campos para tu pago por PSE');
        return;
      }
    }

    setCheckoutStep('processing');
    setProcessingMessage('Iniciando comunicación con el Gateway del banco...');

    setTimeout(() => {
      setProcessingMessage('Encriptando credenciales de pago bajo cifrado SSL...');
      setTimeout(() => {
        setProcessingMessage('Confirmando autorización y balance de fondos...');
        setTimeout(async () => {
          try {
            await orgStore.updateOrganization({ plan: selectedPlan! });
            setTransactionRef(`REF-GKAD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
            setCheckoutStep('success');
            toast.success('¡Suscripción actualizada con éxito!', {
              style: { background: '#10b981', color: '#fff', border: 'none' }
            });
          } catch (error) {
            toast.error('Error al procesar el cobro');
            setCheckoutStep('form');
          }
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="space-y-10 animate-slide-up max-w-7xl mx-auto p-4">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-brand-500/10 border border-brand-500/20 rounded-full">
          <Crown className="text-brand-500" size={18} />
          <span className="text-xs font-black text-brand-500 uppercase tracking-widest font-outfit">
            Portal Corporativo de Planes
          </span>
        </div>
        <h2 className="text-4xl font-black text-foreground uppercase tracking-tight font-outfit">
          Elige el plan ideal para tu negocio
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed font-medium">
          Impulsa tu punto de venta al siguiente nivel con límites expandidos y analíticas en tiempo real.
        </p>
        
        {/* Current plan badge */}
        <div className="inline-flex items-center gap-3 px-5 py-3 bg-card border border-border rounded-2xl shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            TU PLAN ACTIVO ACTUALMENTE: <span className="text-brand-500 ml-1 font-outfit">{currentPlan}</span>
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLANS.map((plan, index) => {
          const isCurrentPlan = currentPlan === plan.id;
          const Icon = plan.icon;
          
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`relative bg-card rounded-[2.5rem] border overflow-hidden transition-all duration-500 group hover:scale-[1.03] hover:-translate-y-1 ${
                plan.popular 
                  ? 'border-brand-500/50 shadow-2xl shadow-brand-500/10' 
                  : isCurrentPlan
                    ? 'border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                    : 'border-border hover:border-border/80'
              }`}
            >
              {/* Colored Glow Aura on hover */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(circle at 50% 0%, ${plan.color}20, transparent 75%)`,
                  opacity: 0,
                  transition: 'opacity 0.4s ease-in-out'
                }}
                className="group-hover:opacity-100"
              />

              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-center py-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                    ⭐ Más recomendado
                  </span>
                </div>
              )}

              {/* Current plan indicator */}
              {isCurrentPlan && !plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-center py-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                    ✓ Plan Activo
                  </span>
                </div>
              )}

              <div className={`p-8 space-y-6 relative z-10 ${(plan.popular || isCurrentPlan) ? 'pt-14' : ''}`}>
                
                {/* Plan icon + name */}
                <div className="space-y-3">
                  <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: `${plan.color}15`, 
                      border: `1px solid ${plan.color}30`,
                      boxShadow: `0 4px 12px ${plan.color}15`
                    }}
                  >
                    <Icon size={24} style={{ color: plan.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight font-outfit">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      {plan.subtitle}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground tracking-tighter font-outfit">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground font-black uppercase tracking-wider">
                    {plan.priceNote}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Features */}
                <div className="space-y-4">
                  {plan.features.map((feature, i) => {
                    const FIcon = feature.icon;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div 
                          className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${plan.color}12`, border: `1px solid ${plan.color}20` }}
                        >
                          <FIcon size={13} style={{ color: plan.color }} />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {feature.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {plan.limitations.map((lim, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <X size={12} className="text-zinc-500 shrink-0" />
                        <span className="text-[11px] text-zinc-500 font-medium line-through">
                          {lim}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer ${
                    isCurrentPlan 
                      ? 'bg-muted text-muted-foreground cursor-default border border-border/80' 
                      : plan.popular
                        ? 'text-white shadow-lg shadow-brand-500/20 hover:brightness-110'
                        : 'border text-foreground hover:bg-muted/50'
                  }`}
                  style={
                    !isCurrentPlan && plan.popular 
                      ? { background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, borderColor: `${plan.color}40` }
                      : !isCurrentPlan 
                        ? { borderColor: `${plan.color}30` }
                        : {}
                  }
                >
                  {isCurrentPlan ? (
                    <>
                      <Check size={14} />
                      Plan actual
                    </>
                  ) : (
                    <>
                      <ArrowRight size={14} />
                      {plan.id === 'Starter' ? 'Prueba gratuita' : 'Comenzar ahora'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Checkout Simulator Modal */}
      {showCheckout && selectedPlan && createPortal(
        <div 
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)'
          }}
          className="no-print p-4"
        >
          <div 
            className="w-full max-w-4xl rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden bg-card border border-border relative flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Left Side: Summary Panel */}
            <div 
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 96%)',
                borderRight: '1px solid var(--border)'
              }}
              className="p-8 md:w-[320px] flex flex-col justify-between shrink-0"
            >
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full mb-3">
                    <Lock size={12} className="text-brand-500" />
                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">
                      Pago Seguro SSL
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                    ESTÁS ADQUIRIENDO:
                  </h3>
                  <h2 className="text-3xl font-black text-foreground uppercase font-outfit tracking-tighter leading-none">
                    Plan {selectedPlan}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
                    {getPlanDetails(selectedPlan).subtitle}
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Suscripción:</span>
                    <span className="text-xl font-black text-foreground font-outfit">{getPlanDetails(selectedPlan).price}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Impuestos:</span>
                    <span className="text-xs font-bold text-muted-foreground">$0 (Incluido)</span>
                  </div>
                  <div className="h-px bg-border border-dashed" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-black text-brand-500 uppercase tracking-wider">Total a Pagar:</span>
                    <span className="text-2xl font-black text-brand-500 font-outfit tracking-tight">
                      {getPlanDetails(selectedPlan).price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secure transaction compliance footer */}
              <div className="mt-8 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                  🔒 Conexión Encriptada
                </span>
                <span className="text-[8px] font-medium text-muted-foreground leading-relaxed uppercase">
                  Tus datos de pago están protegidos mediante cifrado de extremo a extremo y cumplen con la normativa PCI-DSS.
                </span>
              </div>
            </div>

            {/* Right Side: Payment Form / Checkout Steps */}
            <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
              
              {/* Form Step */}
              {checkoutStep === 'form' && (
                <div className="space-y-6">
                  {/* Title & Close */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-foreground uppercase tracking-tight font-outfit">
                        Método de Pago
                      </h2>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                        Selecciona cómo deseas realizar tu compra
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all border-none cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Tabs Selector */}
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted rounded-2xl border border-border">
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CreditCard size={14} />
                      Tarjeta
                    </button>
                    <button
                      onClick={() => setPaymentMethod('pse')}
                      className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
                        paymentMethod === 'pse'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Landmark size={14} />
                      PSE
                    </button>
                  </div>

                  {/* Payment Forms Content */}
                  <div className="space-y-5">
                    {paymentMethod === 'card' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Mock Credit Card Viewer */}
                        <div className="lg:col-span-5 flex justify-center">
                          <div 
                            style={{
                              background: `linear-gradient(135deg, ${getPlanDetails(selectedPlan).color}, #1e1b4b)`,
                              boxShadow: `0 15px 30px -10px ${getPlanDetails(selectedPlan).color}40`
                            }}
                            className="w-full max-w-[280px] h-[170px] rounded-2xl p-5 flex flex-col justify-between text-white relative overflow-hidden"
                          >
                            {/* Card Chip & Network */}
                            <div className="flex justify-between items-center relative z-10">
                              {/* Glowing SIM Chip */}
                              <div className="w-10 h-7 rounded-md bg-gradient-to-r from-amber-400 to-amber-200 border border-amber-300 shadow-sm relative overflow-hidden">
                                <div className="absolute inset-0 grid grid-cols-3 gap-0.5 opacity-25">
                                  <div className="border-r border-b border-black"></div>
                                  <div className="border-r border-b border-black"></div>
                                  <div className="border-b border-black"></div>
                                </div>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded-md">
                                GKAD PAY
                              </span>
                            </div>

                            {/* Card Number */}
                            <div className="space-y-1 relative z-10">
                              <p className="text-[13px] font-black tracking-[0.25em] font-outfit">
                                {cardNum || '•••• •••• •••• ••••'}
                              </p>
                              <p className="text-[7px] font-black uppercase tracking-widest text-white/50">
                                NÚMERO DE TARJETA
                              </p>
                            </div>

                            {/* Holder & Expiry */}
                            <div className="flex justify-between items-end relative z-10">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-wider truncate">
                                  {cardName || 'Titular de la Tarjeta'}
                                </p>
                                <p className="text-[6px] font-black uppercase tracking-widest text-white/50">
                                  TITULAR
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black font-outfit tracking-wider">
                                  {cardExpiry || 'MM/AA'}
                                </p>
                                <p className="text-[6px] font-black uppercase tracking-widest text-white/50">
                                  VENCE
                                </p>
                              </div>
                            </div>

                            {/* Background mesh effects */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-12 scale-150" />
                          </div>
                        </div>

                        {/* Credit Card Inputs */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Nombre del Tarjetahabiente</label>
                            <input
                              type="text"
                              placeholder="Ej: KEVIN SANCHEZ SANCHEZ"
                              value={cardName}
                              onChange={e => setCardName(e.target.value.toUpperCase())}
                              className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors uppercase"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Número de Tarjeta</label>
                            <input
                              type="text"
                              maxLength={19}
                              placeholder="4000 1234 5678 9010"
                              value={cardNum}
                              onChange={e => handleCardNumberChange(e.target.value)}
                              className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Vencimiento</label>
                              <input
                                type="text"
                                maxLength={5}
                                placeholder="MM/AA"
                                value={cardExpiry}
                                onChange={e => handleExpiryChange(e.target.value)}
                                className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors text-center"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Código CVV</label>
                              <input
                                type="password"
                                maxLength={4}
                                placeholder="•••"
                                value={cardCvv}
                                onChange={e => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // PSE Form
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Entidad Bancaria</label>
                            <select
                              value={pseBank}
                              onChange={e => setPseBank(e.target.value)}
                              className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                            >
                              <option value="">Selecciona tu Banco</option>
                              {COLOMBIAN_BANKS.map(bank => (
                                <option key={bank} value={bank}>{bank}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Tipo de Persona</label>
                            <select
                              value={pseClientType}
                              onChange={e => setPseClientType(e.target.value)}
                              className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                            >
                              <option value="Persona Natural">Persona Natural</option>
                              <option value="Persona Jurídica">Persona Jurídica</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Correo Registrado en PSE</label>
                            <input
                              type="email"
                              placeholder="Ej: tu-correo@email.com"
                              value={pseEmail}
                              onChange={e => setPseEmail(e.target.value)}
                              className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Cédula o NIT de Identidad</label>
                            <input
                              type="text"
                              placeholder="Ej: 1020304050"
                              value={pseDoc}
                              onChange={e => setPseDoc(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full h-11 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-4 pt-4 border-t border-border">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-border text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer bg-transparent"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={executeSimulatedPayment}
                      className="flex-[2] h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl bg-brand-500 text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-100 transition-all cursor-pointer border-none"
                    >
                      Procesar Pago Seguro
                    </button>
                  </div>
                </div>
              )}

              {/* Processing Step */}
              {checkoutStep === 'processing' && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative flex items-center justify-center">
                    {/* Glowing outer spinner */}
                    <div className="absolute h-24 w-24 rounded-full border-2 border-brand-500/10 border-t-brand-500 animate-spin" />
                    {/* Inner pulse */}
                    <div className="h-16 w-16 bg-brand-500/10 border border-brand-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-wider font-outfit">
                      Procesando Transacción
                    </h3>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest animate-pulse max-w-sm mx-auto">
                      {processingMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Step */}
              {checkoutStep === 'success' && (
                <div className="flex-1 flex flex-col justify-between py-4">
                  <div className="space-y-6 text-center">
                    {/* Animated Check */}
                    <div className="mx-auto h-20 w-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce">
                      <Check className="h-10 w-10 text-emerald-500" strokeWidth={3} />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-foreground uppercase tracking-tight font-outfit">
                        ¡Transacción Aprobada!
                      </h2>
                      <p className="text-xs text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                        El pago ha sido procesado de manera exitosa a través de la pasarela y tu organización ha sido actualizada al nuevo plan corporativo.
                      </p>
                    </div>

                    {/* Receipt Details Box */}
                    <div className="bg-muted rounded-[2rem] border border-border p-6 max-w-md mx-auto text-left space-y-3 shadow-inner">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 text-center mb-4">
                        Comprobante de Pago Electrónico
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase">Referencia:</span>
                        <span className="font-black text-foreground font-outfit">{transactionRef}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase">Plan Activado:</span>
                        <span className="font-black text-foreground uppercase">Plan {selectedPlan}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase">Pasarela de Pago:</span>
                        <span className="font-black text-foreground uppercase">{paymentMethod.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase">Estado:</span>
                        <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-500 rounded-md font-black text-[9px] uppercase tracking-wider">Aprobado</span>
                      </div>
                      <div className="h-px bg-border my-2 border-dashed" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-foreground uppercase">Total Débito:</span>
                        <span className="font-black text-brand-500 font-outfit text-sm">{getPlanDetails(selectedPlan).price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-6 border-t border-border flex justify-center">
                    <button
                      onClick={() => {
                        setShowCheckout(false);
                      }}
                      className="w-full max-w-md h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-100 transition-all cursor-pointer border-none"
                    >
                      Completar y Finalizar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
