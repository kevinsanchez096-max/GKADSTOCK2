const BASE_URL = 'https://gkad-backend.onrender.com'; // SIN el slash al final

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
      
      const data = await response.json();

      if (!response.ok) {
        const err: any = new Error(data.error || 'Error en la petición al servidor');
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error.message || error);
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
