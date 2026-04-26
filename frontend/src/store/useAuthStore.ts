import { create } from 'zustand';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useShopStore } from './useShopStore';

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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: false,
  isInitialized: false,

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
      // El backend usa el token del header Authorization (inyectado por api.ts)
      // para identificar al usuario. NUNCA ejecuta signIn internamente.
      const profileData = await api.get('/auth/me');

      // ── PASO 3: Validar bloqueos SaaS ──
      const organization = profileData?.organizations;
      if (organization && (organization.is_active === false || organization.billing_status === 'suspendido')) {
        // Cerrar sesión local si la org está bloqueada
        await supabase.auth.signOut();
        localStorage.removeItem('gkad_token');
        const reason = organization.billing_status === 'suspendido'
          ? 'La licencia de su organización se encuentra suspendida por falta de pago.'
          : 'Su organización ha sido suspendida administrativamente.';
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

      // 🎨 Hidratación de Branding
      if (profileData?.role === 'super_admin') {
        document.documentElement.style.removeProperty('--brand-primary');
        document.documentElement.style.removeProperty('--brand-secondary');
      } else {
        try {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('theme_color, theme_secondary_color')
            .eq('id', user.id)
            .maybeSingle();

          if (dbProfile) {
            if (dbProfile.theme_color) document.documentElement.style.setProperty('--brand-primary', dbProfile.theme_color);
            if (dbProfile.theme_secondary_color) document.documentElement.style.setProperty('--brand-secondary', dbProfile.theme_secondary_color);
          } else {
            document.documentElement.style.removeProperty('--brand-primary');
            document.documentElement.style.removeProperty('--brand-secondary');
          }
        } catch (dbErr) {
          console.error('Error al hidratar estilo crudo:', dbErr);
        }
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
    // ── PASO 1: Purga inmediata del estado (desbloquea la UI al instante) ──
    // Esto hace que App.tsx vea profile===null y muestre AuthForm de inmediato.
    // NUNCA reseteamos isInitialized a false, eso causa el spinner infinito.
    set({ user: null, profile: null, loading: false });

    // ── PASO 2: Limpieza asíncrona (no bloquea la UI) ──
    localStorage.removeItem('gkad_token');
    useShopStore.getState().clearCart();
    document.documentElement.style.removeProperty('--brand-primary');
    document.documentElement.style.removeProperty('--brand-secondary');

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Error al cerrar sesión en Supabase:', error);
    }
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
  }
}));
