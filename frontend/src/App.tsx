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
import { useAuthStore } from './store/useAuthStore';
import { useOrganizationStore } from './store/useOrganizationStore';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalPlatformSettings } from './components/GlobalPlatformSettings';

function App() {
  const { user, profile, loading, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gkad_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

  // 2. APLICACIÓN DE TEMA CORPORATIVO (Desde Base de Datos)
  const { organization } = useOrganizationStore();

  useEffect(() => {
    const applyCorporateTheme = () => {
      // Prioridad de Identidad Visual: 
      // 1. Base de Datos (Personalización de la Empresa)
      // 2. LocalStorage (Preferencia guardada en el navegador)
      // 3. Default (Azul corporativo GKAD)
      const accentColor = organization?.theme_color || localStorage.getItem('admin_accent_color') || '#3b82f6';
      const colorMode = organization?.theme_style || localStorage.getItem('admin_color_mode') || 'solid';
      const secondaryColor = organization?.theme_secondary_color || localStorage.getItem('admin_secondary_color') || '#8b5cf6';
      const borderRadius = localStorage.getItem('admin_border_radius') || '1.5rem';
      const activeFont = localStorage.getItem('admin_font') || 'Plus Jakarta Sans';
      
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', accentColor);
      root.style.setProperty('--font-sans', `"${activeFont}", sans-serif`);
      root.style.setProperty('--radius-2xl', borderRadius);
      
      if (colorMode === 'gradient') {
        root.style.setProperty('--brand-secondary', secondaryColor || `color-mix(in srgb, ${accentColor}, black 15%)`);
        document.body.classList.add('theme-gradient');
      } else {
        root.style.setProperty('--brand-secondary', `color-mix(in srgb, ${accentColor}, black 15%)`);
        document.body.classList.remove('theme-gradient');
      }

      // Sincronizar LocalStorage para que la carga inicial sea instantánea en la próxima visita
      if (organization?.theme_color) localStorage.setItem('admin_accent_color', organization.theme_color);
      if (organization?.theme_style) localStorage.setItem('admin_color_mode', organization.theme_style);
    };

    applyCorporateTheme();
    window.addEventListener('storage', applyCorporateTheme);
    return () => window.removeEventListener('storage', applyCorporateTheme);
  }, [organization]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (loading) {
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
