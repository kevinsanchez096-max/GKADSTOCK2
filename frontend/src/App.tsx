import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './components/Dashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { Inventory } from './components/Inventory';
import { SalesHistory } from './components/SalesHistory';
import { Settings } from './components/Settings';
import { PlatformOrganizations } from './components/PlatformOrganizations';
import { AdminAppearance } from './components/AdminAppearance';
import { AdminWelcome } from './components/AdminWelcome';
import { GlobalUserAudit } from './components/GlobalUserAudit';
import { SubscriptionsManager } from './components/SubscriptionsManager';
import { Home } from './components/Home';
import { POSTerminal } from './components/POSTerminal';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { CategoryManager } from './components/CategoryManager';
import { Expenses } from './components/Expenses';
import { AuthForm } from './components/AuthForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { useAuthStore } from './store/useAuthStore';
import { useOrganizationStore } from './store/useOrganizationStore';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalPlatformSettings } from './components/GlobalPlatformSettings';
import { supabase } from './lib/supabase';

function App() {
  const { user, profile, loading, isInitialized, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gkad_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Listener de autenticación y detección de recovery desde URL
  useEffect(() => {
    // Detectar recuperación desde URL en el primer render
    const fullUrl = window.location.href;
    const isRecovery = fullUrl.includes('type=recovery') ||
                       fullUrl.includes('recovery_token=');
    if (isRecovery) {
      console.log('🎯 Recuperación detectada en URL:', fullUrl);
      setIsResettingPassword(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      console.log('🛡️ Auth Event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔑 Modo recuperación de contraseña activado.');
        setIsResettingPassword(true);
        return; // No ejecutar nada más — no cargar perfil
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Inicialización de sesión — solo si NO estamos en modo recuperación
  useEffect(() => {
    if (!isResettingPassword) {
      checkAuth();
    }
  }, [checkAuth, isResettingPassword]);

  // Reset de navegación al cerrar sesión para evitar "residuos" de vista
  useEffect(() => {
    if (!user && !isResettingPassword) {
      setActiveTab('home');
    }
  }, [user, isResettingPassword]);

  // Sincronización de Organización Global
  const { fetchOrganization, subscribeToChanges, unsubscribeFromChanges } = useOrganizationStore();
  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrganization(profile.organization_id);
      subscribeToChanges(profile.organization_id);
    }
    return () => unsubscribeFromChanges();
  }, [profile?.organization_id, fetchOrganization, subscribeToChanges, unsubscribeFromChanges]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gkad_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gkad_theme', 'light');
    }
  }, [darkMode]);

  // Sincronización Global de Identidad Visual (Persistencia Maestro)
  const { organization } = useOrganizationStore();
  
  useEffect(() => {
    const applyTheme = () => {
      const accentColor = organization?.theme_color || localStorage.getItem('admin_accent_color') || '#3b82f6';
      const colorMode = organization?.theme_style || localStorage.getItem('admin_color_mode') || 'solid';
      const secondaryColor = organization?.theme_secondary_color || localStorage.getItem('admin_secondary_color') || '#8b5cf6';
      const borderRadius = localStorage.getItem('admin_border_radius') || '1.5rem';
      const activeFont = localStorage.getItem('admin_font') || 'Plus Jakarta Sans';
      
      document.documentElement.style.setProperty('--brand-primary', accentColor);
      document.documentElement.style.setProperty('--font-sans', `"${activeFont}", sans-serif`);
      document.documentElement.style.setProperty('--radius-2xl', borderRadius);
      
      if (colorMode === 'gradient') {
        document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
        document.body.classList.add('theme-gradient');
      } else {
        document.documentElement.style.setProperty('--brand-secondary', `color-mix(in srgb, ${accentColor}, black 15%)`);
        document.body.classList.remove('theme-gradient');
      }
    };

    applyTheme();
    // Escuchar cambios desde otras pestañas o desde el propio componente de apariencia
    window.addEventListener('storage', applyTheme);
    return () => window.removeEventListener('storage', applyTheme);
  }, [organization]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // ═══════════════════════════════════════════════════════════
  // ORDEN DE RENDERIZADO CRÍTICO
  // 1. Recovery PRIMERO — antes de cualquier carga de perfil
  // 2. Splash de carga
  // 3. Login si no hay usuario
  // ═══════════════════════════════════════════════════════════

  if (isResettingPassword) {
    return (
      <>
        <ResetPasswordForm />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Iniciando Protocolo GKAD...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm 
          darkMode={darkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
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
      case 'customers':
        return <Customers />;
      case 'suppliers':
        return <Suppliers />;
      case 'categories':
        return <CategoryManager />;
      case 'expenses':
        return <Expenses />;
      case 'sales_history':
        return <SalesHistory />;
      case 'settings':
        return <Settings />;
      case 'admin_metrics':
        return <SuperAdminDashboard setActiveTab={setActiveTab} />;
      case 'admin_organizations':
        return <PlatformOrganizations />;
      case 'admin_users':
        return <GlobalUserAudit />;
      case 'admin_subscriptions':
        return <SubscriptionsManager />;
      case 'admin_appearance':
        return <AdminAppearance />;
      case 'admin_settings':
        return <GlobalPlatformSettings />;
      default:
        if (profile?.role === 'super_admin') {
          return <AdminWelcome setActiveTab={setActiveTab} />;
        }
        return <Dashboard />;
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
        <ErrorBoundary fallbackMessage="Módulo protegido ante errores para evitar el colapso de la sesión.">
          {renderContent()}
        </ErrorBoundary>
      </DashboardLayout>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
