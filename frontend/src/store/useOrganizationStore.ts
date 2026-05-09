import { create } from 'zustand';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Organization {
 id: string;
 company_name: string;
 corporate_email: string;
 legal_representative: string;
 tax_id: string;
 primary_address: string;
 phone_number: string;
 logo_url: string;
 tax_percentage: number;
 currency: string;
 billing_resolution: string;
 footer_message: string;
 theme_color: string;
 theme_secondary_color: string;
 theme_style: 'solid' | 'gradient';
 is_active: boolean;
 plan: string;
}

interface OrganizationState {
 organization: Organization | null;
 organizations: Organization[];
 isLoading: boolean;
 error: string | null;
 hydrated: boolean;
 isRealtimeActive: boolean;
 
 // Acciones
 setOrganization: (org: Organization) => void;
 fetchOrganization: (id: string) => Promise<void>;
 updateOrganization: (updates: Partial<Organization>) => Promise<void>;
 subscribeToChanges: (id: string | undefined | null) => void;
 unsubscribeFromChanges: () => void;
 applyBranding: (org: Organization) => void;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
 organization: null,
 organizations: [],
 isLoading: false,
 error: null,
 hydrated: false,
 isRealtimeActive: false,

 setOrganization: (org) => {
 set({ organization: org });
 get().applyBranding(org);
 },

 fetchOrganization: async (id) => {
 if (!id) return;
 set({ isLoading: true, error: null });
 try {
 console.log(`[ORG] Fetching data for organization: ${id}`);
 // El backend devuelve { success, message, data } manejado por api.ts
 // Llamamos a la ruta segura que valida mediante JWT y no requiere permisos de superAdmin
 const responseData = await api.get(`/auth/organization`);
 
 // Manejo defensivo en caso de que api.ts devuelva el result completo en vez de data
 const org = responseData && responseData.id ? responseData : (responseData?.data || null);
 
 if (org) {
 set({ organization: org, hydrated: true, error: null });
 get().applyBranding(org);
 } else {
 set({ error: "No se encontraron datos corporativos", hydrated: true });
 }
 } catch (error: any) {
 console.error('[ORG] Error fetching organization aisled:', error);
 set({ error: error.message || "Error al cargar la organización", hydrated: true });
 } finally {
 set({ isLoading: false });
 }
 },

 updateOrganization: async (updates) => {
 const { organization } = get();
 if (!organization) return;

 // 1. Actualización Optimista
 const previousOrg = { ...organization };
 const optimisticOrg = { ...organization, ...updates };
 set({ organization: optimisticOrg, error: null });
 get().applyBranding(optimisticOrg);

 try {
 // api.ts ya valida que !result.success lance error, y retorna result.data
 const updatedOrg = await api.patch('/auth/profile', updates);
 
 // updateProfile actualiza y devuelve profiles + organizations, hay que asegurar extraer organizations
 const finalOrg = updatedOrg?.organizations || updatedOrg;
 
 if (finalOrg && finalOrg.id) {
 set({ organization: finalOrg });
 get().applyBranding(finalOrg);
 }
 } catch (error: any) {
 // Rollback visual si falla
 set({ organization: previousOrg, error: error.message });
 get().applyBranding(previousOrg);
 toast.error('Fallo en sincronización: ' + (error.message || 'Error desconocido'));
 }
 },

 subscribeToChanges: (id) => {
 if (!id) {
 console.warn('[REALTIME] Intento de suscripción con ID nulo abortado.');
 return;
 }
 if (get().isRealtimeActive) return;

 console.log(`[REALTIME] Suscribiendo a cambios de Org: ${id}`);
 
 const channel = supabase
 .channel(`org_changes_${id}`)
 .on(
 'postgres_changes',
 {
 event: 'UPDATE',
 schema: 'public',
 table: 'organizations',
 filter: `id=eq.${id}`
 },
 (payload) => {
 console.log('[REALTIME] Cambio detectado en BD:', payload.new);
 const newOrg = payload.new as Organization;
 set({ organization: newOrg });
 get().applyBranding(newOrg);
 }
 )
 .subscribe();

 set({ isRealtimeActive: true });
 },

 unsubscribeFromChanges: () => {
 console.log(`[REALTIME] Limpiando suscripciones`);
 supabase.removeAllChannels();
 set({ isRealtimeActive: false });
 },

 applyBranding: (org) => {
 if (!org) return;
 
 try {
 const root = document.documentElement;
 if (org.theme_color) root.style.setProperty('--brand-primary', org.theme_color);
 if (org.theme_secondary_color) root.style.setProperty('--brand-secondary', org.theme_secondary_color);
 if (org.theme_style === 'gradient') {
   document.body.classList.add('theme-gradient');
 } else {
   document.body.classList.remove('theme-gradient');
 }
 
 // Inyectar logo en el DOM para acceso global si es necesario
 (window as any).__GKAD_LOGO__ = org.logo_url;
 } catch(e) {
 console.warn('[ORG] Fallo al aplicar branding, continuando...', e);
 }
 }
}));
