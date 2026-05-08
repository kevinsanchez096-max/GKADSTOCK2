import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { api } from './lib/api';
import { useAuthStore } from './store/useAuthStore';
import { useOrganizationStore } from './store/useOrganizationStore';
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
import { PlatformOrganizations } from './components/PlatformOrganizations';
import { GlobalPlatformSettings } from './components/GlobalPlatformSettings';
import { AdminWelcome } from './components/AdminWelcome';
import { AdminAppearance } from './components/AdminAppearance';
import { SubscriptionsManager } from './components/SubscriptionsManager';
import { CreditCard } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
 const { user, profile, isInitialized, setProfile, setUser } = useAuthStore();
 const [activeTab, setActiveTab] = useState(() => {
 if (profile?.role === 'super_admin') return 'home';
 return 'home';
 });

 // Ajustar pestaña si el perfil cambia (ej. al loguear)
 useEffect(() => {
 if (profile) {
 setActiveTab('home');
 }
 }, [profile?.role]);

 // [NEW] Sincronización Organizacional Realtime
 useEffect(() => {
 const orgId = profile?.organization_id;
 if (orgId) {
 const orgStore = useOrganizationStore.getState();
 
 // 1. Carga inicial de la organización como fuente única de verdad
 const safeOrgs = Array.isArray(profile.organizations) ? profile.organizations : (profile.organizations ? [profile.organizations] : []);
 const orgData = safeOrgs[0];
 
 if (orgData && orgData.id) {
 orgStore.setOrganization(orgData);
 } else {
 orgStore.fetchOrganization(orgId);
 }

 // 2. Activar Canal Realtime Enterprise
 orgStore.subscribeToChanges(orgId);
 }

 return () => {
 useOrganizationStore.getState().unsubscribeFromChanges();
 };
 }, [profile?.organization_id]);

 // ══════════════════════════════════════════════════════════════════
 // EFECTO DE ARRANQUE: Rehidratación de sesión segura
 // ══════════════════════════════════════════════════════════════════
 useEffect(() => {
 const rehydrate = async () => {
 const token = localStorage.getItem('gkad_token');
 if (!token) {
 useAuthStore.setState({ user: null, profile: null, isInitialized: true });
 return;
 }

 try {
 console.log(`[HYDRATION] Iniciando hidratación Auth...`);
 const dbProfile = await api.get('/auth/profile');

 if (dbProfile && dbProfile.id) {
 console.log(`[HYDRATION] Perfil auth hidratado correctamente`);
 setProfile(dbProfile);
 setUser(dbProfile.user || { id: dbProfile.id, email: dbProfile.email });
 } else {
 console.warn('[HYDRATION] Perfil vacío recibido. Purgando sesión.');
 localStorage.removeItem('gkad_token');
 useAuthStore.setState({ user: null, profile: null });
 }
 } catch (err: any) {
 console.error('[HYDRATION] Fallo crítico de hidratación:', err);
 // Sólo destruir sesión si el error es de autenticación o token expirado
 if (err.status === 401 || err.status === 403) {
 console.warn('[HYDRATION] Token inválido. Purgando sesión.');
 localStorage.removeItem('gkad_token');
 useAuthStore.setState({ user: null, profile: null });
 } else {
 console.warn('[HYDRATION] Error de red, manteniendo sesión en caché...');
 }
 } finally {
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
 // 1. Escudo Super Admin (Configuración Persistente)
 if (user?.role === 'super_admin' || profile?.role === 'super_admin') {
 const savedColor = localStorage.getItem('admin_accent_color');
 if (savedColor) {
 document.documentElement.style.setProperty('--brand-primary', savedColor);
 } else {
 document.documentElement.style.removeProperty('--brand-primary');
 }
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
 <div className="min-h-screen bg-background flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
 <p className="text-muted-foreground font-medium animate-pulse">Sincronizando identidad...</p>
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
 if (profile?.role === 'super_admin') return <AdminWelcome setActiveTab={setActiveTab} />;
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
 case 'admin_metrics':
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
 return <SubscriptionsManager />;
 case 'admin_settings':
 if (profile?.role !== 'super_admin') return <Dashboard />;
 return <GlobalPlatformSettings />;
 case 'admin_appearance':
 if (profile?.role !== 'super_admin') return <Dashboard />;
 return <AdminAppearance />;
 default:
 return profile?.role === 'super_admin' ? <SuperAdminDashboard /> : <Dashboard />;
 }
 };

 return (
 <>
 <ErrorBoundary fallbackMessage="Módulo protegido ante errores para evitar el colapso de la sesión.">
 <DashboardLayout 
 activeTab={activeTab} 
 setActiveTab={setActiveTab}
 darkMode={darkMode}
 toggleDarkMode={toggleDarkMode}
 >
 {renderContent()}
 </DashboardLayout>
 </ErrorBoundary>
 <Toaster position="top-right" richColors />
 </>
);
}

export default App;
