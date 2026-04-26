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
  CreditCard
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useShopStore } from '../store/useShopStore';
import { ProfileSettingsModal } from './ProfileSettingsModal';
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
      setTimeout(() => setIsSyncing(false), 500); // Dar tiempo visual al spin
    }
  };

  useEffect(() => {
    localStorage.setItem('sidebar_state', isCollapsed ? 'collapsed' : 'expanded');
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
    { id: 'settings', label: 'Ajustes', icon: Settings, color: 'text-slate-500' },
  ];

  const saasMenuItems = [
    { id: 'home', label: 'Inicio', icon: LayoutGrid, color: 'text-blue-500' },
    { id: 'admin_metrics', label: 'Analíticas', icon: LayoutDashboard, color: 'text-cyan-500' },
    { id: 'admin_organizations', label: 'Organizaciones', icon: Building2, color: 'text-blue-500' },
    { id: 'admin_users', label: 'Usuarios Globales', icon: Users, color: 'text-orange-500' },
    { id: 'admin_subscriptions', label: 'Suscripciones', icon: CreditCard, color: 'text-emerald-500' },
    { id: 'admin_settings', label: 'Ajustes SaaS', icon: Settings, color: 'text-slate-500' },
  ];

  const menuItems = profile?.role === 'super_admin' ? saasMenuItems : standardMenuItems;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex transition-colors duration-500 font-sans">
      
      {/* SIDEBAR: Enterprise Modern Styled */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 
        transition-all duration-500 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-72'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* LOGO SECTION */}
        <div className="h-20 flex items-center px-6 border-b border-slate-200 dark:border-white/5 shrink-0 bg-white/40 dark:bg-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 border border-white/20">
              <Package className="text-white h-6 w-6" />
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-slate-800 dark:text-white truncate font-outfit tracking-tighter uppercase text-xl animate-fade-in">
                GKAD <span className="text-brand-600">STOCK</span>
              </span>
            )}
          </div>
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
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative border
                  ${isActive 
                    ? 'bg-brand-50/80 text-brand-600 border-brand-100 shadow-sm dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20' 
                    : 'text-slate-500 dark:text-zinc-400 border-transparent hover:bg-white hover:border-slate-200 dark:hover:bg-white/5 dark:hover:border-white/10 dark:hover:text-white'}
                  ${isCollapsed ? 'justify-center px-0' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Active Bar Indicator */}
                {isActive && !isCollapsed && (
                  <motion.div 
                    layoutId="active-nav-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand-600 rounded-r-full shadow-[0_0_8px_rgba(var(--brand-primary),0.5)]"
                  />
                )}

                <item.icon className={`
                  h-5 w-5 shrink-0 transition-all duration-300
                  ${isActive ? 'text-brand-600 dark:text-brand-400' : `${item.color} opacity-70 group-hover:opacity-100 group-hover:scale-110 group-hover:drop-shadow-[0_0_5px_currentColor]`}
                `} />
                
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
          <div className="p-6 border-t border-slate-200 dark:border-white/5 text-center bg-white/20 dark:bg-transparent">
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest leading-loose">v4.0.2 ENTERPRISE</p>
          </div>
        )}

        {/* FLOATING TOGGLE BUTTON (Simplified) */}
        <div className="absolute top-24 -right-3.5 z-50 hidden lg:block">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 flex items-center justify-center bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-full border border-slate-200 dark:border-white/10 transition-all shadow-md active:scale-90"
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
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-500 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        
        {/* TOP HEADER (Cohesive style) */}
        <header className="h-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 flex items-center justify-between z-30 shrink-0 transition-all duration-500">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setSidebarOpen(true)}
               className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
             >
               <Menu size={20} />
             </button>
             <h2 className="text-xl font-bold text-slate-800 dark:text-brand-400 font-outfit uppercase tracking-tight truncate">
               {menuItems.find(i => i.id === activeTab)?.label}
             </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            <button 
              onClick={handleGlobalSync}
              disabled={isSyncing}
              title="Sincronizar Datos"
              className="hidden sm:flex p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white hover:border-slate-200 border border-transparent rounded-xl transition-all"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin text-brand-500' : ''} />
            </button>

            <button 
              onClick={toggleDarkMode}
              title="Modo Oscuro"
              className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white hover:border-slate-200 border border-transparent rounded-xl transition-all"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10" />

            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsProfileModalOpen(true)}
                 className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 p-1.5 rounded-2xl transition-all group border border-transparent hover:border-slate-200 dark:hover:border-white/10"
               >
                 <div className="flex flex-col items-end hidden md:flex text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-none group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {profile?.full_name || 'Usuario'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 mt-1 flex items-center gap-2">
                      {profile?.organizations?.name || 'Gestión Stock'}
                      {profile?.organizations?.plan && (
                        <span 
                          title={`Su licencia vence el: ${profile?.organizations?.next_billing_date ? new Date(profile.organizations.next_billing_date).toLocaleDateString() : 'N/A'}`}
                          className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all
                            ${profile?.organizations?.plan === 'Esencial' ? 'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10' : ''}
                            ${profile?.organizations?.plan === 'Avanzado' ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20' : ''}
                            ${profile?.organizations?.plan === 'Emprendedor' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' : ''}
                            ${profile?.organizations?.plan === 'Premium' ? 'bg-[#FFD700] text-black border-amber-400 font-black shadow-lg shadow-amber-500/40' : ''}
                          `}
                        >
                           {profile?.organizations?.plan}
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
                 className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                 title="Cerrar Sesión"
               >
                 <LogOut size={18} />
               </button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-white dark:bg-zinc-950 transition-colors duration-500 overflow-y-auto custom-scrollbar scroll-smooth">
          <div className={`${activeTab === 'pos' ? 'p-0 h-full' : 'p-6 md:p-10 lg:p-12'}`}>
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
