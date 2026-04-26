import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './ui-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  Printer,
  RotateCcw,
  CreditCard,
  Banknote,
  ArrowRight,
  PackageSearch,
  ChevronLeft,
  Settings2,
  Smartphone,
  Ticket,
  User,
  Wallet,
  LayoutGrid,
  List,
  EyeOff,
  History,
  Check,
  Weight
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { PrintableTicket } from './PrintableTicket';

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  unit: string;
  is_weighted: boolean;
  category_id?: string;
}

export const POSTerminal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { 
    products, 
    categories, 
    cart,
    fetchProducts, 
    fetchCategories, 
    processSale, 
    addToCart: addGlobalItem,
    removeFromCart: removeGlobalItem,
    updateCartQuantity: updateGlobalQty,
    clearCart: clearGlobalCart
  } = useShopStore();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<'cart' | 'payment'>('cart');
  
  // FILTROS AVANZADOS (NEW)
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [onlyWithStock, setOnlyWithStock] = useState(false);
  const [sortRecent, setSortRecent] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const { profile } = useAuthStore();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountReceivedRef = useRef<HTMLInputElement>(null);

  // CIERRE AL CLIC FUERA
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchProducts(profile.organization_id);
      fetchCategories(profile.organization_id);

      // AISLAMIENTO REALTIME (Protección a nivel de Catalogo individual)
      const channel = supabase
        .channel(`pos-inventory-${profile.organization_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products', filter: `organization_id=eq.${profile.organization_id}` },
          () => {
             fetchProducts(profile.organization_id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.organization_id]);

  // GESTIÓN DE FOCO 'KEYBOARD-FIRST'
  useEffect(() => {
    if (activeStep === 'payment') {
      // 400ms para asegurar que la animación de la vista de pago terminó
      setTimeout(() => amountReceivedRef.current?.focus(), 400);
    }
  }, [activeStep]);

  const [isReadingScale, setIsReadingScale] = useState(false);
  const LB_TO_KG = 0.453592;
  
  // SIMULACIÓN DE BÁSCULA DIGITAL (LBS -> KG)
  const readWeightFromScale = async (): Promise<number> => {
     setIsReadingScale(true);
     await new Promise(r => setTimeout(r, 600)); // Latencia de puerto serial
     // Simulamos lectura aleatoria entre 0.50 y 5.00 lbs según solicitado
     const lbs = parseFloat((Math.random() * (5.00 - 0.50) + 0.50).toFixed(2));
     setIsReadingScale(false);
     return lbs;
  };

  // ELIMINADO: Movido abajo para evitar ReferenceError

  const addToCart = async (product: any) => {
    let quantityToAdd = 1;

    if (product.is_weighted) {
      const lbs = await readWeightFromScale();
      quantityToAdd = parseFloat((lbs * LB_TO_KG).toFixed(3));
      toast.success(`Peso capturado: ${lbs.toFixed(2)} lbs (${quantityToAdd.toFixed(3)} kg)`, { icon: '⚖️' });
    }

    // Lógica global de carrito
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      const newQty = existing.quantity + quantityToAdd;
      if (newQty <= product.stock) {
        updateGlobalQty(product.id, newQty);
      } else {
        toast.warning(`Stock insuficiente para ${product.name}`);
      }
    } else {
      if (product.stock > 0) {
        addGlobalItem({
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantityToAdd,
          stock: product.stock,
          unit: product.unit || (product.is_weighted ? 'kg' : 'unid'),
          is_weighted: product.is_weighted
        } as any);
      } else {
        toast.error('Sin stock');
      }
    }

    // Removido: No enfocar automáticamente el buscador para no interferir con el escáner global
  };

  const removeFromCart = (id: string) => {
    removeGlobalItem(id);
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.product_id === id);
    if (!item) return;
    
    // Buscar stock real del producto
    const product = products.find(p => p.id === id);
    const stockMax = product?.stock || 9999;

    const newQty = Number((item.quantity + delta).toFixed(3));
    if (newQty >= 0 && newQty <= stockMax) {
      updateGlobalQty(id, newQty);
    } else if (newQty > stockMax) {
      toast.warning(`Límite de stock: ${stockMax}`);
    }
  };

  const handleManualQuantity = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    const product = products.find(p => p.id === id);
    const stockMax = product?.stock || 9999;

    if (val <= stockMax) {
      updateGlobalQty(id, val);
    } else {
      toast.warning(`Solo hay ${stockMax} disponibles`);
      updateGlobalQty(id, stockMax);
    }
  };

  const subtotalRaw = cart.reduce((sum, item) => {
    // REDONDEO FINANCIERO COLOMBIA: Redondeamos al múltiplo de $50 más cercano
    // ya que no hay monedas de denominación menor activas en el comercio común.
    const rawItemSubtotal = item.price * item.quantity;
    const itemSubtotal = Math.round(rawItemSubtotal / 50) * 50;
    return sum + itemSubtotal;
  }, 0);
  const discountAmount = (subtotalRaw * (discount / 100));
  const subtotalAfterDiscount = subtotalRaw - discountAmount;
  const total = subtotalAfterDiscount;
  
  const change = paymentMethod === 'cash' ? Math.max(0, Number(amountReceived) - total) : 0;
  const canFinalize = cart.length > 0 && (paymentMethod !== 'cash' || Number(amountReceived) >= total);

  const handleFinalizeSale = async () => {
    if (!canFinalize || !profile) return;
    setLoading(true);
    
    try {
      const saleData = {
          organization_id: profile.organization_id,
          user_id: profile.id,
          total,
          subtotal: subtotalAfterDiscount,
          tax: 0,
          payment_method: paymentMethod,
          amount_received: paymentMethod === 'cash' ? Number(amountReceived) : total,
          change_given: paymentMethod === 'cash' ? change : 0,
          discount_applied: discount
      };

      const items = cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
      }));

      // CAPTURA DE RECIBO PROFESIONAL (Snapshot antes de limpiar)
      const receiptInfo = {
          items: [...cart],
          total,
          subtotal: subtotalRaw,
          discount_applied: discount,
          payment_method: paymentMethod,
          amount_received: paymentMethod === 'cash' ? Number(amountReceived) : total,
          change_given: change,
          date: new Date().toLocaleString('es-CO')
      };
      setLastSaleData(receiptInfo);

      const success = await processSale(saleData, items);

      if (success) {
        toast.success('¡Venta procesada con éxito!', { duration: 3000, icon: '✅' });
        clearGlobalCart();
        setAmountReceived('');
        setDiscount(0);
        setActiveStep('cart');
        setShowSuccess(true);
      }
    } catch (e) {
      // Los errores ya se atrapan y notifican dentro del processSale del store
      console.error('Intercepción de POS Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    let result = products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategoryId ? p.category_id === selectedCategoryId : true;
      const matchesStock = onlyWithStock ? (Number(p.stock) > 0) : true;
      return matchesSearch && matchesCategory && matchesStock;
    });

    if (sortRecent) {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    return result;
  }, [products, searchTerm, selectedCategoryId, onlyWithStock, sortRecent]);

  const getCategoryName = (id?: string) => {
    if (!Array.isArray(categories)) return 'General';
    return categories.find(c => c.id === id)?.name || 'General';
  };

  // ESCÁNER DE CÓDIGO DE BARRAS (Listener Global + Shortcuts)
  // Ubicado aquí para asegurar que 'addToCart' y 'handleFinalizeSale' están inicializados
  useEffect(() => {
    let buffer = "";
    let lastTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      // Bloquear entrada si estamos leyendo la báscula
      if (isReadingScale) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text' && !target.classList.contains('scanner-bypass')) {
         if (e.key !== 'Enter') return;
      }

      const currentTime = Date.now();
      if (currentTime - lastTime > 100) {
        buffer = "";
      }
      
      if (e.key === "Enter") {
        if (buffer.length > 2) {
          const product = products.find(p => p.barcode === buffer || p.sku === buffer);
          if (product) {
            addToCart(product);
            setSearchTerm(''); 
            toast.success(`Escaneado: ${product.name}`);
          } else {
            toast.error(`¡Código No Registrado: ${buffer}!`, { duration: 4000, icon: '🚨' });
          }
          buffer = "";
        } else if (buffer.length === 0) {
           // SHORTCUTS DE NAVEGACIÓN GLOBAL
           if (showSuccess) {
              setShowSuccess(false);
           } else if (activeStep === 'cart' && cart.length > 0) {
              setActiveStep('payment');
           } else if (activeStep === 'payment' && canFinalize && !loading) {
              handleFinalizeSale();
           }
        }
      } else if (e.key.length === 1 && /[0-9a-zA-Z]/.test(e.key)) {
        buffer += e.key;
      }
      
      lastTime = currentTime;
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [products, activeStep, cart, canFinalize, loading, handleFinalizeSale, showSuccess, isReadingScale]);

  return (
    <div className="h-full flex flex-col lg:flex-row bg-white dark:bg-zinc-950 text-slate-900 dark:text-white overflow-hidden animate-fade-in relative selection:bg-brand-500/30 transition-colors duration-300 font-outfit">
      
      {/* IZQUIERDA: LIBRERÍA DE PRODUCTOS (FIJA) */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-zinc-950/20 backdrop-blur-sm">
        
        {/* BUSCADOR PRO */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-500 dark:text-zinc-500 group-focus-within:text-brand-500 transition-colors" size={18} />
            </div>
            <input
              type="text"
              placeholder="Escanear o buscar por nombre..."
              className="w-full bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 rounded-xl h-11 pl-11 pr-4 text-xs outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-zinc-700 font-bold tracking-tight shadow-sm dark:shadow-none text-slate-900 dark:text-white"
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim() === '' && cart.length > 0) {
                  setActiveStep('payment');
                }
              }}
            />
          </div>
          
          <div className="relative" ref={filterPanelRef}>
            <button 
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`h-11 w-11 flex items-center justify-center rounded-xl transition-all shadow-sm duration-300 border ${
                (onlyWithStock || sortRecent || viewMode === 'compact')
                ? 'bg-brand-500 border-brand-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Settings2 size={18} className={showFilterPanel ? 'rotate-180 transition-transform' : ''} />
            </button>

            <AnimatePresence>
              {showFilterPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[50] p-4 space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtros de Inventario</span>
                    <button onClick={() => { setOnlyWithStock(false); setSortRecent(false); setViewMode('grid'); }} className="text-[9px] font-bold text-brand-500 hover:underline">Reset</button>
                  </div>

                  <div className="space-y-1">
                    <FilterOption 
                      icon={EyeOff} 
                      label="Solo con Stock" 
                      active={onlyWithStock} 
                      onClick={() => setOnlyWithStock(!onlyWithStock)} 
                    />
                    <FilterOption 
                      icon={History} 
                      label="Ver Recientes" 
                      active={sortRecent} 
                      onClick={() => setSortRecent(!sortRecent)} 
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Modo de Visualización</p>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-black/20 rounded-xl">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-brand-500 shadow-sm' : 'text-slate-500'}`}
                      >
                        <LayoutGrid size={14} /> Cuadrícula
                      </button>
                      <button 
                        onClick={() => setViewMode('compact')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'compact' ? 'bg-white dark:bg-zinc-800 text-brand-500 shadow-sm' : 'text-slate-500'}`}
                      >
                        <List size={14} /> Compacto
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CATEGORÍAS PILL */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategoryId(null)}
            className={`px-6 py-2 text-[11px] font-bold whitespace-nowrap transition-all rounded-full border ${!selectedCategoryId ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-transparent border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-zinc-500 hover:border-slate-400 dark:hover:border-zinc-700 shadow-sm dark:shadow-none'}`}
          >
            Todos
          </button>
          {Array.isArray(categories) && categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-6 py-2 text-[11px] font-bold whitespace-nowrap transition-all rounded-full border ${selectedCategoryId === cat.id ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-transparent border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-zinc-500 hover:border-slate-400 dark:hover:border-zinc-700 shadow-sm dark:shadow-none'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* OVERLAYS GLOBALES: BÁSCULA */}
        <AnimatePresence>
          {isReadingScale && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-white/40 dark:bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center"
            >
               <motion.div 
                 animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                 transition={{ duration: 0.6, repeat: Infinity }}
                 className="h-20 w-20 bg-brand-500 text-white flex items-center justify-center rounded-[2rem] mb-6 shadow-2xl shadow-brand-500/40 border-4 border-white dark:border-zinc-900"
               >
                  <Weight size={36} strokeWidth={2.5} />
               </motion.div>
               <h3 className="text-xl font-black tracking-tighter mb-2 italic text-slate-900 dark:text-white uppercase font-outfit">LEYENDO BÁSCULA...</h3>
               <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ x: '-100%' }}
                       animate={{ x: '100%' }}
                       transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                       className="h-full w-1/2 bg-brand-500"
                     />
                  </div>
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest animate-pulse">Capturando lbs</span>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRID DE PRODUCTOS */}
        <div className={`flex-1 overflow-y-auto grid gap-3 custom-scrollbar pr-1 ${
          viewMode === 'grid' 
            ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' 
            : 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
        }`}>
          <AnimatePresence mode="popLayout">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(p => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`group relative flex flex-col bg-white dark:bg-zinc-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 p-3.5 cursor-pointer rounded-2xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-brand-500/50 hover:-translate-y-1 active:scale-[0.97] ${
                    viewMode === 'grid' ? 'h-[160px]' : 'h-[130px] p-2.5'
                  }`}
                >
                  {/* Badge de Stock Superior */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-600 dark:text-zinc-500 uppercase tracking-tighter">
                      {getCategoryName(p.category_id)}
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded-full border border-slate-200 dark:border-white/5 shadow-inner">
                      <div className={`h-1.5 w-1.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.1)] ${p.stock <= 5 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className="text-[10px] font-black text-slate-700 dark:text-white/70">{p.stock}</span>
                    </div>
                  </div>

                  {/* Info Producto */}
                  <div className="flex-1 min-w-0 mb-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-zinc-100 text-[11px] leading-tight line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-white transition-colors uppercase tracking-tight">
                      {p.name}
                    </h4>
                  </div>

                  {/* Pie de Tarjeta: Precio Pro */}
                  <div className="flex items-end justify-between mt-auto">
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.2em] mb-0.5">Precio Neto</span>
                        <p className={`${viewMode === 'grid' ? 'text-xl' : 'text-base'} font-black text-brand-600 dark:text-blue-400 tracking-tighter font-outfit`}>
                          ${p.price.toLocaleString()}
                        </p>
                     </div>
                     <div className={`${viewMode === 'grid' ? 'h-9 w-9' : 'h-7 w-7'} bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg group-hover:bg-brand-500 group-hover:text-white group-hover:scale-110`}>
                        <Plus size={viewMode === 'grid' ? 18 : 14} strokeWidth={3} />
                     </div>
                  </div>

                  {/* Glow Effect (Hover) */}
                  <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
                </motion.div>
              ))
            ) : (
                <div className="col-span-full h-full flex flex-col items-center justify-center py-20 opacity-10 text-center grayscale">
                    <PackageSearch size={64} strokeWidth={1} />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.5em]">Busca o carga stock</p>
                </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DERECHA: CONSOLA DE ACCIÓN */}
      <div id="cart-panel" className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-900 rounded-tl-[2.5rem] shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.5)] font-outfit">
        
        {/* ENCABEZADO HEADER */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-900 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/30">
           {activeStep === 'cart' ? (
             <>
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-slate-100 dark:bg-zinc-900 text-brand-500 flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800">
                    <Ticket size={16} />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-zinc-100">Factura Actual</h3>
               </div>
               <button className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all rounded-lg uppercase tracking-widest">
                  <User size={12} />
                  Cliente
               </button>
             </>
           ) : (
             <>
               <button 
                 onClick={() => setActiveStep('cart')}
                 className="flex items-center gap-2 text-[10px] font-bold text-brand-500 uppercase tracking-widest hover:text-brand-400 transition-all font-outfit"
               >
                  <ChevronLeft size={16} />
                  Volver al Carrito
               </button>
               <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-700 uppercase tracking-[0.4em]">CHECKOUT V4</span>
             </>
           )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
           <AnimatePresence mode="wait">
             {activeStep === 'cart' ? (
               <motion.div 
                 key="cart-view"
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 10 }}
                 className="h-full flex flex-col"
               >
                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center py-20">
                       <div className="h-20 w-20 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center rounded-[2rem] mb-6">
                         <ShoppingCart size={32} className="text-slate-500 dark:text-zinc-600" />
                       </div>
                       <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-900 dark:text-white">Carrito Vacío</p>
                       <p className="text-[10px] text-slate-600 dark:text-zinc-700 font-medium uppercase mt-2">Esperando Selección...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="relative bg-white dark:bg-zinc-900/40 p-3 flex gap-3 group items-center border border-slate-200 dark:border-zinc-800/50 rounded-xl shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all duration-300 overflow-hidden">
                           <div className="flex-1 min-w-0 flex flex-col gap-2">
                              {/* Fila Superior: Nombre y Eliminar (Compacto) */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 bg-slate-100/50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-lg border-l-4 border-brand-500 shadow-sm transition-colors group-hover:bg-brand-500/5 dark:group-hover:bg-brand-500/10">
                                  <h5 
                                    className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-tighter truncate"
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                  >
                                    {item.name}
                                  </h5>
                                </div>
                                <button 
                                  onClick={() => removeFromCart(item.id)} 
                                  className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-90"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              {/* Fila Inferior: Cantidad y Precio (Compacto) */}
                              <div className="flex items-center justify-between gap-4">
                                 <div className="flex items-center bg-white dark:bg-black/60 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
                                    <button 
                                      onClick={() => updateQuantity(item.id, item.is_weighted ? -0.1 : -1)} 
                                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-500 transition-colors"
                                    >
                                      <Minus size={10} strokeWidth={4} />
                                    </button>
                                    <div className="relative px-2">
                                       <input 
                                         type="number"
                                         step={item.is_weighted ? "0.001" : "1"}
                                         className="text-[13px] font-black w-14 text-center bg-transparent text-slate-900 dark:text-white outline-none"
                                         value={item.quantity}
                                         onChange={(e) => handleManualQuantity(item.id, e.target.value)}
                                       />
                                       <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[6px] font-black uppercase text-brand-600 dark:text-brand-500 tracking-tighter">
                                         {item.unit || (item.is_weighted ? 'kg' : 'unid')}
                                       </span>
                                    </div>
                                    <button 
                                      onClick={() => updateQuantity(item.id, item.is_weighted ? 0.1 : 1)} 
                                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-500 transition-colors"
                                    >
                                      <Plus size={10} strokeWidth={4} />
                                    </button>
                                 </div>
                                 
                                 <span className="text-[17px] font-black text-brand-600 dark:text-brand-500 tracking-tighter font-outfit">
                                   ${(item.price * item.quantity).toLocaleString()}
                                 </span>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </motion.div>
             ) : (
                <motion.div 
                  key="payment-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col space-y-3"
                >
                  {/* Resumen de Pago: Diseño Micro-Elite */}
                  <div className="space-y-3 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                     <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
                        <span>Neto</span>
                        <span className="text-slate-900 dark:text-zinc-100 font-black">${subtotalRaw.toLocaleString()}</span>
                     </div>
                     <div className="flex flex-col">
                        <h4 className="text-[9px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-[0.4em] mb-0.5">Total a Pagar</h4>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none font-outfit">
                          ${total.toLocaleString()}
                        </span>
                     </div>
                  </div>

                  {/* MÉTODOS DE PAGO: Cards Compactas */}
                  <div className="grid grid-cols-3 gap-2">
                     {[
                       { id: 'cash', icon: Banknote, label: 'Efectivo' },
                       { id: 'card', icon: CreditCard, label: 'Tarjeta' },
                       { id: 'transfer', icon: Smartphone, label: 'Transf.' }
                     ].map(method => (
                       <button 
                         key={method.id}
                         onClick={() => setPaymentMethod(method.id as any)}
                         className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-300 border-2 ${paymentMethod === method.id ? 'bg-slate-900 dark:bg-white border-brand-500 text-white dark:text-black shadow-lg scale-105 z-10' : 'bg-white dark:bg-zinc-900/10 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-500 hover:border-slate-300'}`}
                       >
                         <method.icon size={16} className={paymentMethod === method.id ? 'text-brand-500' : 'text-slate-500 dark:text-zinc-700'} />
                         <span className="text-[8px] font-black uppercase tracking-tighter">{method.label}</span>
                         {method.id === 'transfer' && (
                           <span className="absolute -top-1 px-1 bg-brand-500 text-white text-[6px] font-bold rounded-full">Nequi</span>
                         )}
                       </button>
                     ))}
                  </div>

                  {/* Formulario de Pago: Estabilidad Absoluta */}
                  <div className="flex-1 flex flex-col gap-3">
                    {paymentMethod === 'cash' ? (
                       <div className="space-y-3">
                          <div className="relative group">
                             <div className="bg-white dark:bg-zinc-900/40 border-2 border-slate-200 dark:border-zinc-800 p-3 rounded-xl focus-within:border-brand-500 transition-all shadow-sm">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-widest">Recibido</span>
                                   <div className="flex items-center gap-2">
                                      <span className="text-xl font-bold text-slate-400 dark:text-zinc-700">$</span>
                                      <input 
                                        ref={amountReceivedRef}
                                        type="number" 
                                        inputMode="decimal"
                                        placeholder="0"
                                        className="w-24 bg-transparent text-2xl font-black text-slate-900 dark:text-white outline-none text-right font-outfit"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && canFinalize) {
                                            handleFinalizeSale();
                                          }
                                        }}
                                      />
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* CONTENEDOR DE VUELTO: Altura Fija para eliminar saltos */}
                          <div className="h-[75px] flex flex-col justify-center">
                            <AnimatePresence mode="wait">
                              {Number(amountReceived) > total && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/20 p-3 rounded-xl flex items-center justify-between shadow-sm"
                                >
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Cambio / Vuelto</span>
                                      <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter font-outfit">
                                        ${change.toLocaleString()}
                                      </p>
                                   </div>
                                   <div className="h-10 w-10 bg-white dark:bg-emerald-500/20 rounded-full flex items-center justify-center shadow-sm">
                                      <RotateCcw size={16} className="text-emerald-600 dark:text-emerald-400 text-brand-500" />
                                   </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                       </div>
                    ) : paymentMethod === 'transfer' ? (
                       <div className="bg-blue-50/50 dark:bg-blue-500/5 border-2 border-blue-200 dark:border-blue-500/20 p-4 rounded-2xl flex flex-col items-center text-center space-y-3">
                          <Smartphone size={32} className="text-blue-500 animate-bounce" />
                          <div>
                            <p className="text-[10px] font-black text-blue-900 dark:text-white uppercase tracking-widest">Esperando Transferencia</p>
                            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase mt-1">Nequi / Daviplata / QR</p>
                          </div>
                       </div>
                    ) : (
                      <div className="h-[120px] flex items-center justify-center opacity-20 border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-3xl">
                         <CreditCard size={48} />
                      </div>
                    )}
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* PIE DE CONSOLA */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-900 space-y-3 flex-none">
            {activeStep === 'cart' ? (
               <div className="space-y-3">
                  <div className="flex justify-between items-end mb-1">
                     <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-600 uppercase tracking-widest">Total Actual</span>
                     <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter font-outfit">${total.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => setActiveStep('payment')}
                    disabled={cart.length === 0}
                    className="w-full h-12 bg-slate-900 dark:bg-zinc-100 text-white dark:text-black rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 dark:hover:bg-white disabled:bg-slate-200 dark:disabled:bg-zinc-900 disabled:text-slate-400 dark:disabled:text-zinc-800 transition-all shadow-xl active:scale-[0.98]"
                  >
                    IR A PAGAR
                    <ArrowRight size={18} />
                  </button>
               </div>
            ) : (
               <div className="space-y-3">
                  <Button 
                    onClick={handleFinalizeSale}
                    className="w-full h-12 text-[10px] font-black uppercase tracking-[0.2em] rounded-[1rem] bg-brand-600 hover:bg-brand-700 text-white shadow-2xl shadow-brand-500/10 border-none transition-all active:scale-[0.98]"
                    disabled={!canFinalize || loading}
                    loading={loading}
                  >
                    PROCESAR VENTA
                  </Button>
               </div>
            )}
        </div>
      </div>

      {/* OVERLAY DE ÉXITO */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-white/98 dark:bg-zinc-950/98 flex flex-col items-center justify-center p-12 text-center backdrop-blur-xl"
          >
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="h-16 w-16 bg-brand-500 text-white flex items-center justify-center rounded-2xl mb-6 shadow-2xl shadow-brand-500/20"
             >
                <CheckCircle size={32} strokeWidth={2.5} />
             </motion.div>
             <h3 className="text-4xl font-black tracking-tighter mb-1 italic text-slate-900 dark:text-white uppercase font-outfit">FACTURADO</h3>
             <p className="text-slate-600 dark:text-zinc-600 font-bold uppercase tracking-[0.4em] text-[9px] mb-8">CIERRE DE CAJA EXITOSO</p>
             
             <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm">
                <button onClick={() => window.print()} className="flex-1 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-zinc-100 flex items-center justify-center gap-3 shadow-xl transform active:scale-95 transition-all">
                   <Printer size={16} />
                   TICKET
                </button>
                <button onClick={() => setShowSuccess(false)} className="flex-1 h-12 bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-800 flex items-center justify-center gap-3 transform active:scale-95 transition-all">
                   <RotateCcw size={16} />
                   SIGUIENTE
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB PARA MÓVILES: VER CARRITO */}
      <div className="fixed bottom-4 right-4 z-[90] lg:hidden">
        <button 
          onClick={() => {
            const panel = document.getElementById('cart-panel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth' });
          }}
          className="h-14 px-6 bg-brand-600 text-white rounded-full shadow-2xl flex items-center gap-3 hover:bg-brand-700 active:scale-95 transition-all border-2 border-brand-400"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 bg-white text-brand-600 text-[10px] font-black flex items-center justify-center rounded-full shadow-sm">
                {cart.length}
              </span>
            )}
          </div>
          <span className="text-xs font-black uppercase tracking-widest border-l border-white/20 pl-3">
            ${total.toLocaleString()}
          </span>
        </button>
      </div>

      {/* PLANTILLA DE IMPRESIÓN PRO (UNIFICADA) */}
      <PrintableTicket sale={lastSaleData} profile={profile} />
    </div>
  );
};

const FilterOption = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${active ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
        <Icon size={14} />
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-zinc-400'}`}>{label}</span>
    </div>
    {active && <Check size={12} className="text-brand-500" />}
  </button>
);
