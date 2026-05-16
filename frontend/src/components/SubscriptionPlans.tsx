import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Check, Zap, Shield, Star, Sparkles,
  Package, Contact, Truck, Layers, Users, 
  BarChart3, Headphones, ArrowRight, X
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
    cta: 'Contactar ventas',
    popular: false,
  },
];

// ── Component ────────────────────────────────────────────────────────────
export const SubscriptionPlans = () => {
  const { profile } = useAuthStore();
  const orgStore = useOrganizationStore();
  const currentPlan = orgStore.organization?.plan || profile?.organizations?.plan || 'Starter';
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) return;
    setSelectedPlan(planId);
    setPaymentSuccess(false);
    setIsProcessingPayment(false);
    setShowContactModal(true);
  };

  const handleSimulatedPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      toast.success('Pago confirmado. Plan actualizado con éxito.', {
        style: { background: '#10b981', color: '#fff', border: 'none' }
      });
      setTimeout(() => {
        setShowContactModal(false);
      }, 1500);
    }, 3000);
  };

  return (
    <div className="space-y-10 animate-slide-up max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <Crown className="text-amber-500" size={18} />
          <span className="text-xs font-black text-amber-500 uppercase tracking-widest">
            Planes y Suscripciones
          </span>
        </div>
        <h2 className="text-4xl font-black text-foreground uppercase tracking-tight font-outfit">
          Elige el plan ideal para tu negocio
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
          Escala tu operación con las herramientas que necesitas. 
          Todos los planes incluyen actualizaciones automáticas y seguridad enterprise.
        </p>
        
        {/* Current plan badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground">
            Tu plan actual: <span className="text-foreground ml-1">{currentPlan}</span>
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
              className={`relative bg-card rounded-3xl border overflow-hidden transition-all duration-300 group hover:scale-[1.02] ${
                plan.popular 
                  ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                  : isCurrentPlan
                    ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                    : 'border-border hover:border-border/80'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-center py-1.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                    ⭐ Más popular
                  </span>
                </div>
              )}

              {/* Current plan indicator */}
              {isCurrentPlan && !plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-center py-1.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                    ✓ Tu plan actual
                  </span>
                </div>
              )}

              <div className={`p-8 space-y-6 ${(plan.popular || isCurrentPlan) ? 'pt-14' : ''}`}>
                
                {/* Plan icon + name */}
                <div className="space-y-3">
                  <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: `${plan.color}15`, 
                      border: `1px solid ${plan.color}30`,
                      boxShadow: `0 4px 12px ${plan.color}10`
                    }}
                  >
                    <Icon size={24} style={{ color: plan.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight font-outfit">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold">
                      {plan.subtitle}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground tracking-tight font-outfit">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground font-bold">
                    {plan.priceNote}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, i) => {
                    const FIcon = feature.icon;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div 
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${plan.color}10`, border: `1px solid ${plan.color}15` }}
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
                        <X size={12} className="text-zinc-600 shrink-0" />
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
                  className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                    isCurrentPlan 
                      ? 'bg-muted text-muted-foreground cursor-default border border-border' 
                      : plan.popular
                        ? 'text-white shadow-lg hover:brightness-110'
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
                      {plan.cta}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-card border border-border rounded-3xl p-10 space-y-6">
        <h3 className="text-lg font-black text-foreground uppercase tracking-wider text-center">
          Preguntas Frecuentes
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí, puedes actualizar o cambiar tu plan cuando quieras. Los cambios se aplican inmediatamente.' },
            { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos transferencias bancarias, Nequi, Daviplata y tarjetas de crédito/débito.' },
            { q: '¿Hay permanencia mínima?', a: 'No. Puedes cancelar en cualquier momento sin penalidad. El servicio se mantiene activo hasta el final del periodo pagado.' },
            { q: '¿Mis datos están seguros?', a: 'Todos los planes incluyen cifrado de datos, backups automáticos y aislamiento multi-tenant de nivel enterprise.' },
          ].map((faq, i) => (
            <div key={i} className="space-y-2">
              <h4 className="text-sm font-black text-foreground">{faq.q}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted"
              >
                <X size={18} />
              </button>

              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Crown className="text-amber-500" size={28} />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-foreground uppercase tracking-wider">
                  {paymentSuccess ? '¡Pago Exitoso!' : `Upgrade al plan ${selectedPlan}`}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {paymentSuccess 
                    ? 'Tu suscripción ha sido actualizada. Disfruta de tus nuevos beneficios.' 
                    : 'Ingresa tu método de pago para activar tu nuevo plan de forma inmediata y segura.'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSimulatedPayment}
                  disabled={isProcessingPayment || paymentSuccess}
                  className={`w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg transition-all ${
                    paymentSuccess 
                      ? 'bg-emerald-500' 
                      : isProcessingPayment 
                        ? 'bg-amber-500/80 cursor-wait'
                        : 'hover:brightness-110 active:scale-[0.98]'
                  }`}
                  style={!paymentSuccess && !isProcessingPayment ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando pago...
                    </>
                  ) : paymentSuccess ? (
                    <>
                      <Check size={18} />
                      Plan Activado
                    </>
                  ) : (
                    <>
                      <Crown size={16} />
                      Pagar y Activar Plan
                    </>
                  )}
                </button>
                
                {!isProcessingPayment && !paymentSuccess && (
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-foreground hover:bg-muted transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
