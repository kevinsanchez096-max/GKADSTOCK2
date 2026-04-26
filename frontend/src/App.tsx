import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { api } from './lib/api';
import { useAuthStore } from './store/useAuthStore';
import { AuthForm } from './components/AuthForm';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POSTerminal } from './components/POSTerminal';
import { Settings } from './components/Settings';
import { Users } from './components/Users';
import { SalesHistory } from './components/SalesHistory';
import { Expenses } from './components/Expenses';
import { CategoryManager } from './components/CategoryManager';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { GlobalUserAudit } from './components/GlobalUserAudit';
import { Home } from './components/Home';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';

function App() {
  const { user, profile, isInitialized, setProfile, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState(() => {
    // Si ya hay sesión, intentar determinar la pestaña inicial
    const storedProfile = localStorage.getItem('auth-storage'); // O como se guarde en tu store
    if (profile?.role === 'super_admin') return 'admin_saas';
    return 'home';
  });

  // Ajustar pestaña si el perfil cambia (ej. al loguear)
  useEffect(() => {
    if (profile?.role === 'super_admin') {
      setActiveTab('admin_saas');
    } else if (profile) {
      setActiveTab('home');
    }
  }, [profile?.role]);

  // ══════════════════════════════════════════════════════════════════
  // EFECTO DE ARRANQUE: Rehidratación de sesión con PURGA TOTAL en error
  // Si el token es inválido o la API falla, se limpia TODO el estado
  // para evitar que React monte componentes con profile === null.
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const rehydrate = async () => {
      const token = localStorage.getItem('gkad_token');
      if (!token) {
        useAuthStore.setState({ user: null, profile: null, isInitialized: true });
        return;
      }

      try {
        const dbProfile = await api.get('/auth/profile');
        if (dbProfile && dbProfile.id) {
          setProfile(dbProfile);
          setUser(dbProfile.user || { id: dbProfile.id, email: dbProfile.email });
        } else {
          // Perfil vacío o inválido — purga total
          console.warn('[REHYDRATE] Perfil vacío recibido. Purgando sesión.');
          localStorage.removeItem('gkad_token');
          useAuthStore.setState({ user: null, profile: null });
        }
      } catch (err) {
        // Token expirado, API caída, etc. — PURGA TOTAL
        console.error('[REHYDRATE] Fallo de hidratación. Purgando sesión:', err);
        localStorage.removeItem('gkad_token');
        useAuthStore.setState({ user: null, profile: null });
      } finally {
        // SIEMPRE desbloquear la UI al terminar, pase lo que pase
        useAuthStore.setState({ isInitialized: true });
      }
    };

    rehydrate();
  }, []);
  
  // GESTIÓN DE TEMA GLOBAL
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // INYECCIÓN DINÁMICA DE TEMA INDIVIDUAL (Marca Blanca V5)
  useEffect(() => {
    // 1. Escudo Super Admin (Hard Stop)
    if (user?.role === 'super_admin' || profile?.role === 'super_admin') {
      document.documentElement.style.removeProperty('--brand-primary');
      return;
    }

    // Lee el color desde la raíz del perfil (tabla profiles)
    // O desde organization (tabla organizations)
    const org = Array.isArray(profile?.organizations)
      ? profile.organizations[0]
      : profile?.organizations;

    const color = profile?.theme_color || org?.theme_color || '';
    const secondary = profile?.theme_secondary_color || org?.theme_secondary_color || '';
    const style = profile?.theme_style || org?.theme_style || 'solid';
    
    // Inyección / Hidratación global al :root
    if (color && typeof color === 'string' && color.trim() !== '') {
      document.documentElement.style.setProperty('--brand-primary', color.trim());
    } else {
      document.documentElement.style.removeProperty('--brand-primary');
    }


    if (secondary) {
      document.documentElement.style.setProperty('--brand-secondary', secondary);
    } else {
      document.documentElement.style.removeProperty('--brand-secondary');
    }

    if (style === 'gradient') {
      document.documentElement.classList.add('theme-gradient');
    } else {
      document.documentElement.classList.remove('theme-gradient');
    }
  }, [profile?.theme_color, profile?.theme_secondary_color, profile?.theme_style, profile?.organizations, user?.role, profile?.role]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Sincronizando identidad...</p>
        </div>
      </div>
    );
  }

  // ── BLOQUEO ESTRICTO: Si no hay perfil, SIEMPRE mostramos login. ──
  // Usamos `!profile` como candado principal (no `!user && !profile`)
  // porque un estado parcial (user sin profile) causaría un TypeError
  // al intentar leer profile.role, profile.organization_id, etc.
  if (!profile) {
    return (
      <>
        <AuthForm darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home setActiveTab={setActiveTab} />;
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POSTerminal />;
      case 'sales_history':
        return <SalesHistory />;
      case 'categories':
        return <CategoryManager />;
      case 'expenses':
        return <Expenses />;
      case 'customers':
        return <Customers />;
      case 'suppliers':
        return <Suppliers />;
      case 'settings':
        return <Settings />;
      
      // ── MÓDULOS DE SUPER ADMINISTRADOR ──
      case 'admin_saas':
        if (profile?.role !== 'super_admin') return <Dashboard />;
        return <SuperAdminDashboard />;
      case 'admin_organizations':
        if (profile?.role !== 'super_admin') return <Dashboard />;
        return <PlatformOrganizations />;
      case 'admin_users':
        if (profile?.role !== 'super_admin') return <Dashboard />;
        return <GlobalUserAudit />;
      case 'admin_subscriptions':
        if (profile?.role !== 'super_admin') return <Dashboard />;
        return (
          <div className="p-20 text-center opacity-40">
            <CreditCard size={64} className="mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase tracking-widest">Módulo de Suscripciones</h2>
            <p className="text-xs font-bold uppercase mt-2">Próximamente en v4.1</p>
          </div>
        );
      case 'admin_settings':
        if (profile?.role !== 'super_admin') return <Dashboard />;
        return <GlobalPlatformSettings />;
      default:
        return profile?.role === 'super_admin' ? <SuperAdminDashboard /> : <Dashboard />;
    }
  };

  return (
    <>
      <DashboardLayout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {renderContent()}
      </DashboardLayout>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
