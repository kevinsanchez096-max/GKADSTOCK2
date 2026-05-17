import { type ReactNode, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
 RefreshCw,
 LayoutGrid,
 LayoutDashboard, 
 ShoppingCart, 
 Package, 
 Users, 
 Settings, 
 LogOut, 
 Menu, 
 Sun,
 Moon,
 Building2,
 Store,
 FileText,
 Layers,
 ArrowDownRight,
 Contact,
 Truck,
 ChevronRight,
 ChevronLeft,
 CreditCard,
 Palette,
 X,
 User,
 SlidersHorizontal,
 Crown,
 Wallet
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useShopStore } from '../store/useShopStore';
import { useOrganizationStore } from '../store/useOrganizationStore';

import { NotificationBell } from './NotificationBell';
import { GkadLogo } from './GkadLogo';
import { toast } from 'sonner';

interface LayoutProps {
 children: ReactNode;
 activeTab: string;
 setActiveTab: (tab: string) => void;
 darkMode: boolean;
 toggleDarkMode: () => void;
}

export const DashboardLayout = ({ 
 children, 
 activeTab, 
 setActiveTab, 
 darkMode, 
 toggleDarkMode 
}: LayoutProps) => {
 const [sidebarOpen, setSidebarOpen] = useState(false);

 const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);
 const [isCollapsed, setIsCollapsed] = useState(() => {
 const saved = localStorage.getItem('sidebar_state');
 return saved === 'collapsed';
 });
 const { profile, signOut } = useAuthStore();
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Cerrar dropdown al hacer clic fuera
 useEffect(() => {
   if (!isProfileDropdownOpen) return;
   const handleClickOutside = (e: MouseEvent) => {
     if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
       setIsProfileDropdownOpen(false);
     }
   };
   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [isProfileDropdownOpen]);

 const handleGlobalSync = async () => {
 if (!profile?.organization_id) return;
 setIsSyncing(true);
 try {
 const store = useShopStore.getState();
 await Promise.all([
 store.fetchProducts(profile.organization_id),
 store.fetchCategories(profile.organization_id),
 store.fetchSalesHistory(profile.organization_id, 20),
 store.fetchInventoryMovements(profile.organization_id)
 ]);
 toast.success('Sistema sincronizado con la nube', { icon: '✅' });
 } catch (error) {
 toast.error('Error al sincronizar');
 } finally {
 setIsSyncing(false);
 }
 };

 useEffect(() => {
  localStorage.setItem('sidebar_state', isCollapsed ? 'collapsed' : 'expanded');
  window.dispatchEvent(new Event('sidebar_toggle'));
  }, [isCollapsed]);

 // ── CONFIGURACIÓN DE MENÚS BASADA EN ROLES (RBAC) ──
 const standardMenuItems = [
 { id: 'home', label: 'Inicio', icon: LayoutGrid, color: 'text-blue-500' },
 { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-500' },
 { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, color: 'text-emerald-500' },
 { id: 'cash_register', label: 'Caja', icon: Wallet, color: 'text-emerald-400' },
 { id: 'sales_history', label: 'Historial', icon: FileText, color: 'text-amber-500' },
 { id: 'inventory', label: 'Inventario', icon: Package, color: 'text-violet-500' },
 { id: 'customers', label: 'Clientes', icon: Contact, color: 'text-pink-500' },
 { id: 'suppliers', label: 'Proveedores', icon: Truck, color: 'text-blue-400' },
 { id: 'categories', label: 'Categorías', icon: Layers, color: 'text-purple-500' },
 { id: 'expenses', label: 'Gastos', icon: ArrowDownRight, color: 'text-red-500' },
 { id: 'subscriptions', label: 'Planes', icon: Crown, color: 'text-amber-500', premium: true },
 { id: 'settings', label: 'Ajustes', icon: Settings, color: 'text-muted-foreground' },
 ];

 const saasMenuItems = [
 { id: 'home', label: 'Inicio', icon: LayoutGrid, color: 'text-blue-500' },
 { id: 'admin_metrics', label: 'Analíticas', icon: LayoutDashboard, color: 'text-cyan-500' },
 { id: 'admin_organizations', label: 'Organizaciones', icon: Building2, color: 'text-blue-500' },
 { id: 'admin_users', label: 'Usuarios Globales', icon: Users, color: 'text-orange-500' },
 { id: 'admin_subscriptions', label: 'Suscripciones', icon: CreditCard, color: 'text-emerald-500' },
 { id: 'payments', label: 'Pagos', icon: CreditCard, color: 'text-amber-500' },
 { id: 'admin_appearance', label: 'Apariencia', icon: Palette, color: 'text-pink-500' },
 { id: 'admin_settings', label: 'Ajustes SaaS', icon: Settings, color: 'text-muted-foreground' },
 ];

 const menuItems = profile?.role === 'super_admin' ? saasMenuItems : standardMenuItems;

 const orgStore = useOrganizationStore();
 const currentPlan = orgStore.organization?.plan || profile?.organizations?.plan;
 const companyName = orgStore.organization?.company_name || profile?.organizations?.name || 'Gestión Stock';

 const getPlanBadgeStyle = (plan: string | undefined) => {
   if (!plan) return {};
   switch (plan) {
     case 'Esencial': return { background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' };
     case 'Avanzado': return { background: '#3b82f6', color: '#fff', border: '1px solid #60a5fa', boxShadow: '0 2px 8px rgba(59,130,246,0.2)' };
     case 'Emprendedor': return { background: '#6366f1', color: '#fff', border: '1px solid #818cf8', boxShadow: '0 2px 8px rgba(99,102,241,0.2)' };
     case 'Premium': return { background: '#FFD700', color: '#000', border: '1px solid #fbbf24', boxShadow: '0 2px 12px rgba(251,191,36,0.4)' };
     default: return { background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' };
   }
 };

 return (
 <div className="min-h-screen bg-background flex transition-colors duration-500 font-sans">
 
 {/* SIDEBAR: Enterprise Modern Styled */}
 <aside className={`
 fixed inset-y-0 left-0 z-50 bg-background/50 backdrop-blur-xl backdrop-blur-xl border-r border-border 
 transition-all duration-500 flex flex-col
 ${isCollapsed ? 'w-20' : 'w-72'}
 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
 `}>
 
 {/* LOGO SECTION */}
 <div className="h-20 flex items-center justify-between px-6 border-b border-border shrink-0 bg-card/40">
        <GkadLogo size={32} isCollapsed={isCollapsed} />
 <button 
 onClick={() => setSidebarOpen(false)} 
 className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center justify-center min-h-[48px] min-w-[48px]"
 >
 <X size={24} />
 </button>
 </div>

 {/* NAVIGATION (Scrollable Modern Minimalist) */}
 <nav className="flex-1 px-3 py-8 space-y-1 overflow-y-auto custom-scrollbar">
 {menuItems.map((item) => {
 const isActive = activeTab === item.id;
 return (
  <button
  key={item.id}
  onClick={() => {
  setActiveTab(item.id);
  setSidebarOpen(false);
  }}
  className={`
  w-full flex items-center gap-3 px-3 py-2 rounded-[50px] text-sm font-bold transition-all duration-300 group relative min-h-[52px] border-transparent border
  ${isActive && !isCollapsed 
  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
  : 'text-muted-foreground hover:text-foreground'}
  ${isCollapsed ? 'justify-center px-0 bg-transparent' : ''}
  `}
  title={isCollapsed ? item.label : undefined}
  >
  {/* Icon Circle */}
  <div 
  className={`
  h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-300
  ${isActive 
  ? (isCollapsed ? 'bg-brand-500' : 'bg-white/15') 
  : 'bg-[#1a1a1a]'}
  `}
  style={{
  '--hover-bg': 'color-mix(in srgb, var(--brand-primary), transparent 80%)'
  } as any}
  onMouseEnter={(e) => {
  if (!isActive) {
  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
  const icon = e.currentTarget.querySelector('svg');
  if (icon) icon.style.color = 'var(--brand-primary)';
  }
  }}
  onMouseLeave={(e) => {
  if (!isActive) {
  e.currentTarget.style.backgroundColor = '#1a1a1a';
  const icon = e.currentTarget.querySelector('svg');
  if (icon) icon.style.color = '';
  }
  }}
  >
  <item.icon className={`
  h-5 w-5 shrink-0 transition-all duration-300
  ${isActive ? 'text-white' : `${item.color}`}
  `} />
  </div>
 
 {!isCollapsed && (
 <span className={`truncate ${isActive ? 'font-bold' : ''}`}>
 {item.label}
 </span>
 )}
 </button>
 );
 })}
 </nav>

 {/* SIDEBAR FOOTER */}
 {!isCollapsed && (
 <div className="p-6 border-t border-border text-center">
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-loose">v4.0.2 ENTERPRISE</p>
 </div>
 )}

 {/* FLOATING TOGGLE BUTTON (Simplified) */}
 <div className="absolute top-24 -right-3.5 z-50 hidden lg:block">
 <button 
 onClick={() => setIsCollapsed(!isCollapsed)}
 className="h-7 w-7 flex items-center justify-center bg-card text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-full border border-border transition-all shadow-md active:scale-90"
 >
 {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
 </button>
 </div>
 </aside>

 {/* OVERLAY FOR MOBILE */}
 <AnimatePresence>
 {sidebarOpen && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm lg:hidden"
 onClick={() => setSidebarOpen(false)} 
 />
 )}
 </AnimatePresence>

 {/* CONTENT AREA */}
 <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-500 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
 
 {/* TOP HEADER (Cohesive style) */}
 <header className="h-20 bg-card/80 backdrop-blur-xl border-b border-border px-4 md:px-8 flex items-center justify-between z-30 shrink-0 transition-all duration-500">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => setSidebarOpen(true)}
 className="lg:hidden p-2.5 bg-muted text-muted-foreground hover:bg-muted rounded-xl transition-all min-h-[48px] min-w-[48px] flex items-center justify-center"
 >
 <Menu size={24} />
 </button>
 <h2 className="text-xl font-bold text-foreground font-outfit uppercase tracking-tight truncate">
 {menuItems.find(i => i.id === activeTab)?.label}
 </h2>
 </div>

 <div className="flex items-center gap-2 sm:gap-5 shrink-0">
 <button 
 onClick={handleGlobalSync}
 disabled={isSyncing}
 title="Sincronizar Datos"
 className="hidden sm:flex p-2.5 bg-muted text-muted-foreground hover:text-brand-600 hover:bg-card hover:border-border border border-transparent rounded-xl transition-all"
 >
 <RefreshCw size={18} className={isSyncing ? 'animate-spin text-brand-500' : ''} />
 </button>

 <NotificationBell />

 <div className="h-8 w-[1px] bg-border"/>

 {/* PROFILE DROPDOWN */}
 <div className="relative" ref={dropdownRef}>
 <button 
 onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
 className="flex items-center gap-3 hover:bg-muted p-1.5 rounded-2xl transition-all group border border-transparent hover:border-border"
 >
 <div className="flex flex-col items-end hidden md:flex text-right">
 <span className="text-xs font-black text-foreground leading-none group-hover:text-brand-600 transition-colors">
 {profile?.full_name || 'Usuario'}
 </span>
 <span className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-2">
 {companyName}
 {currentPlan && (
 <span
 style={{
   ...getPlanBadgeStyle(currentPlan),
   fontSize: '8px',
   fontWeight: 900,
   textTransform: 'uppercase',
   letterSpacing: '0.1em',
   padding: '2px 6px',
   borderRadius: '5px',
 }}
 >
 {currentPlan}
 </span>
 )}
 </span>
 </div>
 <div
   className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md border border-white/20 group-hover:scale-105 transition-all"
   style={{ background: 'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary), #000 20%))' }}
 >
 {profile?.full_name?.charAt(0) || 'U'}
 </div>
 </button>

 {/* DROPDOWN PANEL */}
 {isProfileDropdownOpen && (
   <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
     {/* User info section */}
     <div className="p-4 border-b border-border/50">
       <div className="flex items-center gap-3">
         <div
           className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
           style={{
             background: 'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary), #000 20%))',
           }}
         >
           {profile?.full_name?.charAt(0) || 'U'}
         </div>
         <div className="min-w-0 flex-1">
           <p className="text-foreground text-[13px] font-bold m-0 overflow-hidden text-ellipsis whitespace-nowrap">
             {profile?.full_name || 'Usuario'}
           </p>
           <p className="text-muted-foreground text-[11px] m-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
             {profile?.email || ''}
           </p>
           {currentPlan && (
             <span
               className="inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md mt-1"
               style={{
                 ...getPlanBadgeStyle(currentPlan),
               }}
             >
               {currentPlan}
             </span>
           )}
         </div>
       </div>
     </div>

     {/* Menu options */}
     <div className="p-1.5 space-y-0.5">
       {/* Mi perfil */}
       <button
         onClick={() => { setActiveTab('settings'); setIsProfileDropdownOpen(false); }}
         className="w-full flex items-center gap-2.5 p-2.5 bg-transparent border-none rounded-xl cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-muted font-medium text-[13px]"
       >
         <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
           <User size={14} className="text-muted-foreground" />
         </div>
         Mi perfil
       </button>

       {/* Ajustes de cuenta */}
       <button
         onClick={() => { setActiveTab('settings'); setIsProfileDropdownOpen(false); }}
         className="w-full flex items-center gap-2.5 p-2.5 bg-transparent border-none rounded-xl cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-muted font-medium text-[13px]"
       >
         <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
           <SlidersHorizontal size={14} className="text-muted-foreground" />
         </div>
         Ajustes de cuenta
       </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => toggleDarkMode()}
          className="w-full flex items-center justify-between gap-2.5 p-2.5 bg-transparent border-none rounded-xl cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-muted font-medium text-[13px]"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              {darkMode ? <Moon size={14} className="text-brand-500" /> : <Sun size={14} className="text-amber-500" />}
            </div>
            {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
          </div>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-brand-500' : 'bg-muted-foreground/30'}`}>
            <div 
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${darkMode ? 'left-[18px]' : 'left-0.5'}`} 
            />
          </div>
        </button>
      </div>

      {/* Cerrar sesión */}
      <div className="p-1.5 border-t border-border/50">
        <button
          onClick={() => { setIsProfileDropdownOpen(false); signOut(); }}
          className="w-full flex items-center gap-2.5 p-2.5 bg-transparent border-none rounded-xl cursor-pointer transition-colors text-red-500 hover:bg-red-500/10 font-bold text-[13px]"
        >
          <div className="h-8 w-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <LogOut size={14} className="text-red-500" />
          </div>
          Cerrar sesión
        </button>
      </div>
   </div>
 )}
 </div>
 </div>
 </header>

 <main className="flex-1 bg-background transition-colors duration-500 overflow-y-auto custom-scrollbar scroll-smooth">
 <div className={`${activeTab === 'pos' ? 'p-0 h-full' : 'p-4 md:p-10 lg:p-12'}`}>
 <div className={`${activeTab === 'pos' ? 'max-w-none h-full' : 'max-w-7xl mx-auto w-full'} animate-fade-in`}>
 {children}
 </div>
 </div>
 </main>
 </div>



 </div>
 );
};
