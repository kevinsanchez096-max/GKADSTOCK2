const BASE_URL = '/api';

/**
 * API CONFIGURATION (Fetch Wrapper)
 * Proporciona una interfaz centralizada para las peticiones HTTP
 * al backend local de Node.js.
 */
export const api = {
 async request(endpoint: string, options: RequestInit = {}) {
 const url = `${BASE_URL}${endpoint}`;
 
 // Detectar si el cuerpo es FormData para no forzar JSON ni cabecera manual
 const isFormData = options.body instanceof FormData;
 
 // Configuración por defecto de cabeceras con Token JWT si existe
 const token = localStorage.getItem('gkad_token');
 const headers: any = {
 ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
 ...options.headers,
 };

 if (!isFormData) {
 headers['Content-Type'] = 'application/json';
 }

 try {
 const response = await fetch(url, { 
 ...options, 
 headers,
 body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
 });
 
 const contentType = response.headers.get("content-type");
 let result: any;

 if (!contentType?.includes("application/json")) {
 const text = await response.text();
 console.error(`[API] Respuesta no JSON de ${url}:`, text.substring(0, 200));
 throw new Error(`Respuesta inválida del servidor: ${text.substring(0, 120)}`);
 }

 result = await response.json();

  if (!response.ok) {
  const err: any = new Error(result?.message || result?.error || `Error ${response.status}: Petición fallida`);
  err.status = response.status;
  err.data = result;

  // ── PLAN LIMIT INTERCEPTION (403) ──────────────────────────────────
  if (response.status === 403) {
    window.dispatchEvent(new CustomEvent('gkad:plan-limit-reached', {
      detail: { message: result?.error || result?.message || 'Has alcanzado el límite de tu plan.' }
    }));
  }

  throw err;
  }

 // Si la API devuelve un objeto con success, validarlo (arquitectura enterprise)
 if (result && typeof result === 'object' && 'success' in result && result.success === false) {
 throw new Error(result.message || "Error desconocido en la API");
 }

 // Si el backend envuelve en { success, data }, devolvemos data, de lo contrario result completo
 return (result && result.success && result.data !== undefined) ? result.data : result;
 } catch (error: any) {
 console.error(`[API] Error [${endpoint}]:`, error.message || error);
 throw error;
 }
 },

 get(endpoint: string, options?: RequestInit) {
 return this.request(endpoint, { ...options, method: 'GET' });
 },

 post(endpoint: string, body: any, options?: RequestInit) {
 return this.request(endpoint, {
 ...options,
 method: 'POST',
 body,
 });
 },

 put(endpoint: string, body: any, options?: RequestInit) {
 return this.request(endpoint, {
 ...options,
 method: 'PUT',
 body,
 });
 },

 patch(endpoint: string, body: any, options?: RequestInit) {
 return this.request(endpoint, {
 ...options,
 method: 'PATCH',
 body,
 });
 },

 delete(endpoint: string, options?: RequestInit) {
 return this.request(endpoint, { ...options, method: 'DELETE' });
 },
};
