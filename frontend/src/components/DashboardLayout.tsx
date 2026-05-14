import { type ReactNode, useState, useEffect } from 'react';
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
 X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useShopStore } from '../store/useShopStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { ProfileSettingsModal } from './ProfileSettingsModal';
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
 const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);
 const [isCollapsed, setIsCollapsed] = useState(() => {
 const saved = localStorage.getItem('sidebar_state');
 return saved === 'collapsed';
 });
 const { profile, signOut } = useAuthStore();

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
 { id: 'sales_history', label: 'Historial', icon: FileText, color: 'text-amber-500' },
 { id: 'inventory', label: 'Inventario', icon: Package, color: 'text-violet-500' },
 { id: 'customers', label: 'Clientes', icon: Contact, color: 'text-pink-500' },
 { id: 'suppliers', label: 'Proveedores', icon: Truck, color: 'text-blue-400' },
 { id: 'categories', label: 'Categorías', icon: Layers, color: 'text-purple-500' },
 { id: 'expenses', label: 'Gastos', icon: ArrowDownRight, color: 'text-red-500' },
 { id: 'settings', label: 'Ajustes', icon: Settings, color: 'text-muted-foreground' },
 ];

 const saasMenuItems = [
 { id: 'home', label: 'Inicio', icon: LayoutGrid, color: 'text-blue-500' },
 { id: 'admin_metrics', label: 'Analíticas', icon: LayoutDashboard, color: 'text-cyan-500' },
 { id: 'admin_organizations', label: 'Organizaciones', icon: Building2, color: 'text-blue-500' },
 { id: 'admin_users', label: 'Usuarios Globales', icon: Users, color: 'text-orange-500' },
 { id: 'admin_subscriptions', label: 'Suscripciones', icon: CreditCard, color: 'text-emerald-500' },
 { id: 'admin_appearance', label: 'Apariencia', icon: Palette, color: 'text-pink-500' },
 { id: 'admin_settings', label: 'Ajustes SaaS', icon: Settings, color: 'text-muted-foreground' },
 ];

 const menuItems = profile?.role === 'super_admin' ? saasMenuItems : standardMenuItems;

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
  w-full flex items-center gap-3 px-3 py-2 rounded-[50px] text-sm font-bold transition-all duration-300 group relative min-h-[52px]
  ${isActive && !isCollapsed 
  ? 'text-white shadow-lg shadow-brand-500/20' 
  : 'text-muted-foreground hover:text-foreground'}
  ${isCollapsed ? 'justify-center px-0 bg-transparent' : ''}
  `}
  style={isActive && !isCollapsed ? { backgroundColor: 'var(--brand-primary)' } : {}}
  title={isCollapsed ? item.label : undefined}
  >
  {/* Icon Circle */}
  <div 
  className={`
  h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-300
  ${isActive 
  ? (isCollapsed ? '' : 'bg-white/15') 
  : 'bg-[#1a1a1a]'}
  `}
  style={{
  backgroundColor: isActive 
  ? (isCollapsed ? 'var(--brand-primary)' : 'rgba(255,255,255,0.15)') 
  : undefined,
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

 <button 
 onClick={toggleDarkMode}
 title="Modo Oscuro"
 className="p-2.5 bg-muted text-muted-foreground hover:text-brand-600 hover:bg-card hover:border-border border border-transparent rounded-xl transition-all"
 >
 {darkMode ? <Sun size={18} /> : <Moon size={18} />}
 </button>

 <NotificationBell />

 <div className="h-8 w-[1px] bg-border"/>

 <div className="flex items-center gap-3">
 <button 
 onClick={() => setIsProfileModalOpen(true)}
 className="flex items-center gap-3 hover:bg-muted p-1.5 rounded-2xl transition-all group border border-transparent hover:border-border"
 >
 <div className="flex flex-col items-end hidden md:flex text-right">
 <span className="text-xs font-black text-foreground leading-none group-hover:text-brand-600 transition-colors">
 {profile?.full_name || 'Usuario'}
 </span>
 <span className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-2">
 {useOrganizationStore().organization?.company_name || profile?.organizations?.name || 'Gestión Stock'}
 {(useOrganizationStore().organization?.plan || profile?.organizations?.plan) && (
 <span 
 title={`Su licencia vence el: ${(useOrganizationStore().organization?.next_billing_date || profile?.organizations?.next_billing_date) ? new Date(useOrganizationStore().organization?.next_billing_date || profile?.organizations?.next_billing_date).toLocaleDateString() : 'N/A'}`}
 className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all
 ${(useOrganizationStore().organization?.plan || profile?.organizations?.plan) === 'Esencial' ? 'bg-muted text-muted-foreground border-border' : ''}
 ${(useOrganizationStore().organization?.plan || profile?.organizations?.plan) === 'Avanzado' ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20' : ''}
 ${(useOrganizationStore().organization?.plan || profile?.organizations?.plan) === 'Emprendedor' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' : ''}
 ${(useOrganizationStore().organization?.plan || profile?.organizations?.plan) === 'Premium' ? 'bg-[#FFD700] text-black border-amber-400 font-black shadow-lg shadow-amber-500/40' : ''}
 `}
 >
 {useOrganizationStore().organization?.plan || profile?.organizations?.plan}
 </span>
 )}
 </span>
 </div>
 <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center text-white font-black text-sm shadow-md border border-white/20 group-hover:scale-105 group-hover:shadow-brand-500/30 transition-all">
 {profile?.full_name?.charAt(0) || 'U'}
 </div>
 </button>
 
 <button 
 onClick={signOut}
 className="p-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
 title="Cerrar Sesión"
 >
 <LogOut size={18} />
 </button>
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

 {/* MODAL DE AJUSTES DE PERFIL (MODO DIOS) */}
 <ProfileSettingsModal 
 isOpen={isProfileModalOpen} 
 onClose={() => setIsProfileModalOpen(false)} 
 />

 </div>
 );
};
