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
  const [isProcessing, setIsProcessing] = useState(false);

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

    setIsProcessing(true);
    setCheckoutStep('processing');
    setProcessingMessage('Iniciando comunicación con el Gateway del banco...');

    setTimeout(() => {
      setProcessingMessage('Encriptando credenciales de pago bajo cifrado SSL...');
      setTimeout(() => {
        setProcessingMessage('Confirmando autorización y balance de fondos...');
        setTimeout(async () => {
          try {
            const planDetails = getPlanDetails(selectedPlan!);
            const planPriceStr = planDetails.price.replace(/[^0-9]/g, '');
            const payload = {
              organization_id: orgStore.organization?.id || profile?.organization_id,
              organization_name: orgStore.organization?.name || profile?.organizations?.name || 'Organización',
              plan_name: selectedPlan,
              plan_price: parseInt(planPriceStr),
              payment_method: paymentMethod === 'card' ? 'Tarjeta' : 'PSE',
              customer_name: paymentMethod === 'card' ? cardName : undefined,
              customer_email: paymentMethod === 'pse' ? pseEmail : undefined,
              customer_document: paymentMethod === 'pse' ? pseDoc : undefined,
              bank_name: paymentMethod === 'pse' ? pseBank : undefined,
            };

            const res = await fetch('/api/payments/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Error al procesar solicitud');

            // Enviar notificación al super admin
            const notifMsg = `La organización ${payload.organization_name} solicitó el plan ${selectedPlan} por $${planPriceStr} vía ${payload.payment_method}`;
            await supabase.from('system_notifications').insert([{
              type: 'PAYMENT_REQUEST',
              title: 'Nueva solicitud de pago',
              message: notifMsg,
              is_read: false,
              organization_id: payload.organization_id // The trigger or query should handle SA visibility
            }]);

            setTransactionRef(`REF-GKAD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
            setCheckoutStep('success');
            setIsProcessing(false);
            toast.success('¡Suscripción actualizada con éxito!', {
              style: { background: '#10b981', color: '#fff', border: 'none' }
            });
          } catch (error) {
            toast.error('Error al procesar el cobro');
            setCheckoutStep('form');
            setIsProcessing(false);
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300 no-print">
          <div 
            className="w-full max-w-4xl bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            
            {/* LEFT PANEL: Resumen del Plan */}
            <div className="p-8 md:w-[320px] flex flex-col justify-between shrink-0 bg-brand-500/5 border-r border-border">
            
              {/* Header con Logo */}
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <BarChart3 size={16} />
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      Pago Seguro
                    </span>
                  </div>
                  
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    Estás adquiriendo:
                  </h3>
                  <h2 className="text-3xl font-black text-foreground uppercase font-outfit tracking-tighter leading-none">
                    Plan {selectedPlan!}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-3 font-medium leading-relaxed">
                    {getPlanDetails(selectedPlan!).subtitle}
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Suscripción:</span>
                    <span className="text-lg font-black text-foreground font-outfit">{getPlanDetails(selectedPlan!).price}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Impuestos:</span>
                    <span className="text-[9px] font-bold text-muted-foreground">$0 (Incluido)</span>
                  </div>
                  <div className="h-px bg-border border-dashed" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>Total a Pagar:</span>
                    <span className="text-2xl font-black font-outfit tracking-tight" style={{ color: 'var(--brand-primary)' }}>
                      {getPlanDetails(selectedPlan!).price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seguridad Footer */}
              <div className="mt-8 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                  🔒 Encriptado
                </span>
                <span className="text-[8px] font-medium text-muted-foreground leading-relaxed uppercase">
                  Protegido con cifrado de extremo a extremo y normativa PCI-DSS.
                </span>
              </div>
            </div>

            {/* RIGHT PANEL: Formulario de Pago */}
            <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
              
              {checkoutStep === 'form' && (
                <div className="space-y-6">
                  
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tighter">
                        Método de Pago
                      </h2>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                        Selecciona cómo deseas realizar tu compra
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="p-2.5 bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all border-none cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Tabs: Tarjeta vs PSE */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border border-border">
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
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
                      className={`h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
                        paymentMethod === 'pse'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Landmark size={14} />
                      PSE
                    </button>
                  </div>

                  {/* Payment Form Content */}
                  <div className="space-y-5">
                    {paymentMethod === 'card' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        
                        {/* Visualización de Tarjeta */}
                        <div className="lg:col-span-5 flex justify-center">
                          <div className="w-full max-w-[280px] h-[170px] rounded-2xl p-5 flex flex-col justify-between text-white relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-900 shadow-lg">
                            
                            {/* Chip & Network */}
                            <div className="flex justify-between items-center relative z-10">
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

                            {/* Número de Tarjeta */}
                            <div className="space-y-1 relative z-10">
                              <p className="text-sm font-black tracking-[0.2em] font-outfit">
                                {cardNum || '•••• •••• •••• ••••'}
                              </p>
                              <p className="text-[7px] font-black uppercase tracking-widest text-white/50">
                                NÚMERO DE TARJETA
                              </p>
                            </div>

                            {/* Titular & Vencimiento */}
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

                            {/* Mesh effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-12 scale-150" />
                          </div>
                        </div>

                        {/* Inputs de Tarjeta */}
                        <div className="lg:col-span-7 space-y-4">
                          
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                              Nombre del Tarjetahabiente
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: GERALDINE GONZALEZ"
                              value={cardName}
                              onChange={e => setCardName(e.target.value.toUpperCase())}
                              className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors uppercase"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                              Número de Tarjeta
                            </label>
                            <input
                              type="text"
                              maxLength={19}
                              placeholder="4000 1234 5678 9010"
                              value={cardNum}
                              onChange={e => handleCardNumberChange(e.target.value)}
                              className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                Vencimiento
                              </label>
                              <input
                                type="text"
                                maxLength={5}
                                placeholder="MM/AA"
                                value={cardExpiry}
                                onChange={e => handleExpiryChange(e.target.value)}
                                className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors text-center"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                CVV
                              </label>
                              <input
                                type="password"
                                maxLength={4}
                                placeholder="•••"
                                value={cardCvv}
                                onChange={e => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* PSE Form */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                              Entidad Bancaria
                            </label>
                            <select
                              value={pseBank}
                              onChange={e => setPseBank(e.target.value)}
                              className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                            >
                              <option value="">Selecciona tu Banco</option>
                              {COLOMBIAN_BANKS.map(bank => (
                                <option key={bank} value={bank}>{bank}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                              Tipo de Persona
                            </label>
                            <select
                              value={pseClientType}
                              onChange={e => setPseClientType(e.target.value)}
                              className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                            >
                              <option value="Persona Natural">Persona Natural</option>
                              <option value="Persona Jurídica">Persona Jurídica</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                              Correo Registrado en PSE
                            </label>
                            <input
                              type="email"
                              placeholder="Ej: tu-correo@email.com"
                              value={pseEmail}
                              onChange={e => setPseEmail(e.target.value)}
                              className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                              Cédula o NIT
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: 1020304050"
                              value={pseDoc}
                              onChange={e => setPseDoc(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 h-12 text-[9px] font-black uppercase tracking-widest rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors cursor-pointer bg-transparent"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={executeSimulatedPayment}
                      disabled={isProcessing}
                      className="flex-1 h-12 text-[9px] font-black uppercase tracking-widest rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg transition-all active:scale-95 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock size={14} />
                      Completar Pago
                    </button>
                  </div>
                </div>
              )}

              {/* Processing Step */}
              {checkoutStep === 'processing' && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-24 w-24 rounded-full border-2 border-brand-500/10 border-t-brand-500 animate-spin" />
                    <div className="h-16 w-16 bg-brand-500/10 border border-brand-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-wider font-outfit">
                      Procesando Transacción
                    </h3>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest animate-pulse max-w-sm">
                      {processingMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Step */}
              {checkoutStep === 'success' && (
                <div className="flex-1 flex flex-col justify-between py-4">
                  <div className="space-y-6 text-center">
                    <div className="mx-auto h-20 w-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Check className="h-10 w-10 text-emerald-500" strokeWidth={3} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-foreground uppercase font-outfit tracking-tighter">
                        ¡Pago Exitoso!
                      </h3>
                      <p className="text-xs text-muted-foreground font-bold leading-relaxed max-w-sm">
                        Tu suscripción al plan {selectedPlan!} ha sido activada correctamente.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="w-full h-12 text-[9px] font-black uppercase tracking-widest rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg transition-all active:scale-95 border-none cursor-pointer"
                  >
                    Cerrar y Continuar
                  </button>
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
