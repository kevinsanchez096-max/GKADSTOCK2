import { create } from 'zustand';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
}

interface SaleItem {
  product_id: string; 
  name?: string;
  price: number;
  quantity: number; // Ya es number, pero nos aseguramos de que la lógica lo trate como tal
  subtotal: number;
  unit?: string; // Nuevo: Para mostrar kg vs unid
}

interface Sale {
  id: string;
  created_at: string;
  items?: any[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_received?: number;
  change_given?: number;
}

interface ShopState {
  categories: Category[];
  products: any[];
  sales: Sale[];
  cart: SaleItem[];
  loading: boolean;
  inventoryMovements: any[];
  
  // Acciones: Carrito
  addToCart: (item: SaleItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Acciones: Categorías
  fetchCategories: (orgId: string) => Promise<void>;
  addCategory: (name: string, orgId: string) => Promise<void>;
  updateCategory: (id: string, name: string, orgId: string) => Promise<void>;
  deleteCategory: (id: string, orgId: string) => Promise<void>;
  
  // Acciones: Productos
  fetchProducts: (orgId: string) => Promise<void>;
  addProduct: (productData: any) => Promise<void>;
  updateProduct: (id: string, productData: any) => Promise<void>;
  deleteProduct: (id: string, orgId: string) => Promise<void>;

  // Acciones: Kardex
  fetchInventoryMovements: (orgId: string, date?: string) => Promise<void>;
  
  // Acciones: Ventas
  processSale: (saleData: any, items: any[]) => Promise<boolean>;
  fetchSalesHistory: (orgId: string, limit?: number) => Promise<void>;
}

export const useShopStore = create<ShopState>((set, get) => ({
  categories: [],
  products: [],
  sales: [],
  cart: [],
  inventoryMovements: [],
  loading: false,

  // CARRITO: Lógica centralizada
  addToCart: (item) => {
    const { cart } = get();
    // Normalizamos para asegurar que 'id' y 'product_id' existan (compatibilidad POSTerminal)
    const normalizedItem = {
      ...item,
      id: item.product_id, // Alias para renderizado
    };

    const existing = cart.find(i => i.product_id === normalizedItem.product_id);
    if (existing) {
      set({ cart: cart.map(i => i.product_id === normalizedItem.product_id ? { ...i, quantity: i.quantity + normalizedItem.quantity } : i) });
    } else {
      set({ cart: [...cart, normalizedItem] });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(i => i.product_id !== productId) });
  },

  updateCartQuantity: (productId, quantity) => {
    set({ cart: get().cart.map(i => i.product_id === productId ? { ...i, quantity: Math.max(0, quantity) } : i) });
  },

  clearCart: () => set({ cart: [] }),

  // CATEGORÍAS: Sincronización con API (Blindada)
  fetchCategories: async (orgId) => {
    try {
      const data = await api.get(`/inventory/categories?organization_id=${orgId}`);
      // Solo actualizamos si data es un array para evitar crasheos de renderizado
      if (Array.isArray(data)) {
        set({ categories: data });
      } else if (data && typeof data === 'object' && data.error) {
          console.error('[ShopStore] Error en categorías:', data.error);
          set({ categories: [] });
      }
    } catch (error) {
      console.error('[ShopStore] Fallo crítico al cargar categorías:', error);
      set({ categories: [] });
      toast.error('Error al conectar con el servidor de categorías');
    }
  },

  addCategory: async (name, orgId) => {
    try {
      await api.post('/inventory/categories', { name, organization_id: orgId });
      toast.success('Categoría añadida con éxito');
      get().fetchCategories(orgId); // Recargar
    } catch (error) {
      toast.error('Fallo al crear categoría');
    }
  },

  updateCategory: async (id, name, orgId) => {
    try {
      await api.patch(`/inventory/categories/${id}`, { name });
      toast.success('Categoría actualizada con éxito');
      get().fetchCategories(orgId);
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar categoría');
    }
  },

  deleteCategory: async (id, orgId) => {
    try {
      await api.delete(`/inventory/categories/${id}`);
      toast.success('Categoría eliminada con éxito');
      get().fetchCategories(orgId);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar categoría');
    }
  },

  // PRODUCTOS: Gestión real de inventario (Blindada con Rutas REST Limpias)
  fetchProducts: async (orgId) => {
    // Guard: si no hay orgId válido, limpiar estado y abortar para evitar
    // llamadas a /inventory?organization_id=undefined que rompen el DOM tree.
    if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
      set({ products: [], loading: false });
      return;
    }

    set({ loading: true });
    try {
      const data = await api.get(`/inventory?organization_id=${orgId}`);
      if (Array.isArray(data)) {
        set({ products: data, loading: false });
      } else {
        set({ products: [], loading: false });
      }
    } catch (error) {
      set({ products: [], loading: false });
      toast.error('No se pudo cargar el inventario');
    }
  },

  addProduct: async (productData) => {
    const sanitizedData = {
      ...productData,
      barcode: (productData.barcode?.trim() === '') ? null : productData.barcode
    };

    try {
      await api.post('/inventory', sanitizedData);
      toast.success('Producto ingresado al almacén');
      get().fetchProducts(productData.organization_id);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  },

  updateProduct: async (id, productData) => {
    const sanitizedData = {
      ...productData,
      barcode: (productData.barcode?.trim() === '') ? null : productData.barcode
    };

    try {
      // Usamos PATCH según la nueva definición del router
      await api.patch(`/inventory/${id}`, sanitizedData);
      toast.success('Producto actualizado y Kardex registrado');
      get().fetchProducts(productData.organization_id);
    } catch (error: any) {
      toast.error(`Error al actualizar: ${error.message}`);
    }
  },

  deleteProduct: async (id, orgId) => {
    try {
      await api.delete(`/inventory/${id}`);
      toast.success('Producto eliminado físicamente');
      get().fetchProducts(orgId);
    } catch (error: any) {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  },

  // KARDEX: Trazabilidad Audit Forever
  fetchInventoryMovements: async (orgId, date) => {
    try {
      const query = date ? `&date=${date}` : '';
      const data = await api.get(`/inventory/movements?organization_id=${orgId}${query}`);
      set({ inventoryMovements: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error('[ShopStore] Error en Kardex:', error);
      toast.error('Fallo al recuperar historial de ingresos');
    }
  },

  // VENTAS: Registro transaccional ATÓMICO
  processSale: async (saleData, items) => {
    try {
      const response = await api.post('/sales/process', { saleData, items });
      if (response.success) {
        // La vista de POS se encarga de mostrar el éxito y limpiar.
        // Solo recargamos el catálogo silenciosamente
        get().fetchProducts(saleData.organization_id);
        return true; 
      }
      return false;
    } catch (error: any) {
      // UX Defensiva: Extraer el mensaje exacto del servidor (fetch parseado en api.ts)
      const serverMessage = error?.data?.error || error?.message || 'Error de conexión con el servidor';
      
      // Mostrar el TOAST sin bloquear la pantalla para que el cajero sepa qué corregir
      toast.error(serverMessage, { 
        duration: 5000, 
        icon: error.status === 400 ? '🚨' : '❌' 
      });

      return false; // POSTerminal atrapará el false y mantendrá el carrito intacto.
    }
  },

  fetchSalesHistory: async (orgId: string, limit: number = 20) => {
    try {
      const data = await api.get(`/sales/history?organization_id=${orgId}&limit=${limit}`);
      set({ sales: Array.isArray(data) ? data : [] });
    } catch (error: any) {
      // Manejo Silencioso: Si el perfil no existe todavía o hay error de tenant, devolvemos array vacío
      if (error.status === 404 || error.status === 401 || error.message?.includes('perfil')) {
        console.warn('[useShopStore] Sincronización de perfil pendiente. Reintentando en segundo plano...');
        set({ sales: [] });
      } else {
        toast.error('Error al recuperar historial de ventas', { duration: 3000 });
      }
    }
  }
}));
