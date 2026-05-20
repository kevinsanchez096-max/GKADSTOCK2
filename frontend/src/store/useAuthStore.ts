import { create } from 'zustand';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useShopStore } from './useShopStore';
import { useOrganizationStore } from './useOrganizationStore';

interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<void>;
  setUser: (user: any) => void;
  setProfile: (profile: any) => void;
  updateProfile: (updates: any) => void;
  updateSecureSettings: (data: { currentPassword: string, newPassword?: string, newFullName?: string, newEmail?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  requestOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<any>;
  activateAccount: (email: string, code: string) => Promise<any>;
  requestPasswordReset: (email: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: false,
  isInitialized: false,

  requestPasswordReset: async (email) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) throw error;
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  checkAuth: async () => {
    // Evitar múltiples llamadas simultáneas
    const { isInitialized } = useAuthStore.getState();
    if (isInitialized) return;

    set({ loading: true });
    try {
      // 1. Obtener sesión de Supabase (Cliente)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        set({ user: null, profile: null, loading: false, isInitialized: true });
        return;
      }

      // 2. Persistir token para API
      localStorage.setItem('gkad_token', session.access_token);

      // 3. Hidratar perfil desde el backend
      const profileData = await api.get('/auth/me');

      // 4. Guardar ID de organización para el script del index.html
      if (profileData?.organization_id) {
        localStorage.setItem('gkad_last_org_id', profileData.organization_id);
      }

      set({
        user: session.user,
        profile: profileData,
        loading: false,
        isInitialized: true
      });
    } catch (error) {
      console.error('[checkAuth] Error de hidratación:', error);
      set({ user: null, profile: null, loading: false, isInitialized: true });
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // LOGIN STATELESS: La autenticación se ejecuta DIRECTAMENTE en el
  // cliente (React → Supabase Auth). El backend NUNCA toca signIn.
  // Esto elimina el State Leak en el servidor Node.js.
  // ══════════════════════════════════════════════════════════════════
  login: async (email, password) => {
    set({ loading: true });
    try {
      // ── PASO 1: Autenticación directa con Supabase Auth (Cliente) ──
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const session = authData.session;
      const user = authData.user;

      if (!session?.access_token) {
        throw new Error('No se recibió un token de sesión válido.');
      }

      // Persistir token para las peticiones HTTP al backend
      localStorage.setItem('gkad_token', session.access_token);

      // ── PASO 2: Hidratar perfil desde el backend (Stateless) ──
      const profileData = await api.get('/auth/me?is_login=true');

      // ── PASO 3: Guardar ID de organización para carga instantánea ──
      if (profileData?.organization_id) {
        localStorage.setItem('gkad_last_org_id', profileData.organization_id);
      }

      // ── PASO 4: Validar bloqueos SaaS ──
      const organization = profileData?.organizations;
      if (organization && (organization.is_active === false || organization.billing_status === 'suspendido')) {
        // Cerrar sesión local si la org está bloqueada
        await supabase.auth.signOut();
        localStorage.removeItem('gkad_token');
        
        let reason = 'Su organización se encuentra inactiva.';
        if (organization.billing_status === 'suspendido') {
          reason = 'La licencia de su organización se encuentra suspendida por falta de pago.';
        } else if (organization.is_active === false) {
          reason = 'Su cuenta está pendiente de verificación. Por favor, revise su correo electrónico para activar su organización.';
        }
        
        throw new Error(reason);
      }

      // ── PASO 4: Verificar cambio obligatorio de contraseña ──
      if (profileData?.require_password_change) {
        set({ loading: false });
        return { requirePasswordChange: true, user, message: 'Cambio de contraseña obligatorio.' };
      }

      // Limpiar rastro de sesiones anteriores
      useShopStore.getState().clearCart();

      // Almacenamos el usuario y perfil
      set({
        user,
        profile: profileData,
        loading: false,
        isInitialized: true
      });

      // ── RESTAURAR ESTADO DE CAJA ACTIVA ──
      try {
        const { useCashStore } = await import('./useCashStore');
        useCashStore.getState().fetchActiveSession();
      } catch (err) {
        console.warn('[Login] No se pudo restaurar sesión de caja:', err.message);
      }

      return { user, profile: profileData, session };
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  // Registro centralizado en el backend (usa supabaseAdmin, no contamina)
  register: async (registerData) => {
    set({ loading: true });
    try {
      await api.post('/auth/register', registerData);
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile, loading: false }),
  
  updateProfile: async (updates) => {
    const { profile } = useAuthStore.getState();
    if (!profile) return;
    
    // Actualización optimista del estado local
    set((state) => {
      const newProfile = { ...state.profile, ...updates };
      if (state.profile?.organizations) {
        const orgFields = ['name', 'address', 'phone', 'email', 'tax_percentage', 'currency', 'billing_resolution', 'footer_message', 'logo_url', 'theme_color', 'theme_secondary_color', 'theme_style'];
        const orgUpdates: any = {};
        Object.keys(updates).forEach(key => {
          if (orgFields.includes(key)) orgUpdates[key] = updates[key];
          if (key === 'organization_name') orgUpdates['name'] = updates[key];
        });

        if (Object.keys(orgUpdates).length > 0) {
          newProfile.organizations = { ...state.profile.organizations, ...orgUpdates };
        }
      }
      return { profile: newProfile };
    });

    try {
      const updatedProfile = await api.patch('/auth/profile', updates);
      set({ profile: { ...profile, ...updatedProfile } });
    } catch (error) {
      console.error('Error al persistir perfil:', error);
    }
  },

  updateSecureSettings: async (data) => {
    set({ loading: true });
    try {
      const response = await api.post('/auth/profile/update-secure', data);
      
      const updates: any = {};
      if (response.updatedName) updates.full_name = response.updatedName;
      if (response.updatedEmail) updates.email = response.updatedEmail;

      if (Object.keys(updates).length > 0) {
        set((state) => ({
          profile: { ...state.profile, ...updates }
        }));
      }
      
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // LOGOUT STATELESS: Cierre de sesión directamente en el cliente.
  // El backend NO ejecuta signOut() sobre el singleton.
  // ══════════════════════════════════════════════════════════════════
  signOut: async () => {
    // ── PASO 1: Desconectar canal Realtime de la organización ──
    await useOrganizationStore.getState().unsubscribeFromChanges();

    // ── PASO 2: Purga total de todos los stores ──
    useOrganizationStore.getState().resetStore();
    useShopStore.getState().resetStore();

    // ── PASO 3: Limpiar estado de autenticación ──
    set({ user: null, profile: null, loading: false, isInitialized: false });

    // ── PASO 4: Limpiar persistencia local ──
    localStorage.removeItem('gkad_token');
    localStorage.removeItem('gkad_last_org_id');
    localStorage.removeItem('gkad_brand_color'); // Limpieza de rastro antiguo
    document.documentElement.style.removeProperty('--brand-primary');
    document.documentElement.style.removeProperty('--brand-secondary');
    document.body.classList.remove('theme-gradient');

    // ── PASO 5: Cerrar sesión en Supabase ──
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Error al cerrar sesión en Supabase:', error);
    }

    // ── PASO 6: Redirigir y forzar recarga total para asegurar limpieza de memoria ──
    window.location.href = '/';
  },

  requestOTP: async (email) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    set({ loading: false });
    if (error) throw error;
  },

  verifyOTP: async (email, token) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) throw error;
      if (!data.session) throw new Error('No se pudo establecer la sesión.');

      localStorage.setItem('gkad_token', data.session.access_token);
      const profileData = await api.get('/auth/me');

      if (profileData?.organization_id) {
        localStorage.setItem('gkad_last_org_id', profileData.organization_id);
      }

      set({
        user: data.user,
        profile: profileData,
        loading: false,
        isInitialized: true
      });

      return { user: data.user, profile: profileData };
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  
  activateAccount: async (email: string, code: string) => {
    set({ loading: true });
    try {
      const response = await api.post('/auth/activate', { email, code });
      
      // La respuesta incluye la session de Supabase y el user
      const session = response.session;
      const user = response.user;

      if (session?.access_token) {
        localStorage.setItem('gkad_token', session.access_token);
      }

      // Refrescar perfil localmente para que is_active sea true
      const profileData = await api.get('/auth/me');
      
      set({ 
        user,
        profile: profileData,
        loading: false,
        isInitialized: true
      });
      return { user, profile: profileData };
    } catch (error) {
      set({ loading: false });
      console.error('Error al activar cuenta:', error);
      throw error;
    }
  }
}));
