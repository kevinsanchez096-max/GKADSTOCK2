import { createClient } from '@supabase/supabase-js';

// MODO CONFIGURACIÓN DINÁMICA
// Se priorizan variables de entorno para producción, con fallback a Mock Client para Demo/Desarrollo.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificación de disponibilidad de variables de entorno
const isProd = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isProd 
 ? createClient(supabaseUrl, supabaseAnonKey)
 : {
 auth: {
 getSession: async () => ({ data: { session: null }, error: null }),
 onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
 signInWithPassword: async () => ({ data: { user: { id: 'demo-user-123', email: 'demo@gkad.com' } }, error: null }),
 signUp: async () => ({ data: { user: { id: 'demo-user-123' } }, error: null }),
 signOut: async () => ({ error: null }),
 },
 from: (table: string) => ({
 select: () => ({
 eq: () => ({
 single: async () => ({ data: { 
 full_name: 'Administrador Demo', 
 role: 'admin', 
 organization_name: 'GKAD STORE MOCK',
 organization_id: 'org-123'
 }, error: null }),
 order: () => ({ data: [], error: null }),
 }),
 order: () => ({ data: [], error: null }),
 lte: () => ({ productCount: 0, lowStockCount: 0, data: [], error: null }),
 gt: () => ({ data: [], error: null }),
 }),
 insert: async () => ({ data: {}, error: null }),
 update: async () => ({ data: {}, error: null }),
 delete: async () => ({ data: {}, error: null }),
 }),
 storage: {
 from: (bucket: string) => ({
 upload: async (path: string, file: any) => ({ data: { path }, error: null }),
 getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock.supabase.co/storage/v1/render/image/public/${bucket}/${path}` } }),
 remove: async (paths: string[]) => ({ data: [], error: null }),
 })
 }
 };
