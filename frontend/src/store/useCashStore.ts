import { create } from 'zustand';
import { api } from '../lib/api';
import { toast } from 'sonner';

export interface CashSession {
    id: string;
    organization_id: string;
    user_id: string;
    user_name: string;
    status: 'open' | 'closed';
    opening_time: string;
    closing_time: string | null;
    opening_balance: number;
    sales_cash: number;
    sales_other: number;
    total_expenses: number;
    expected_cash: number;
    actual_cash: number | null;
    difference: number | null;
    notes: string;
    auto_closed: boolean;
}

interface CashState {
    activeSession: CashSession | null;
    history: CashSession[];
    loading: boolean;
    loadingHistory: boolean;
    hasCheckedActive: boolean;

    fetchActiveSession: () => Promise<void>;
    openSession: (openingBalance: number) => Promise<boolean>;
    closeSession: (actualCash: number, notes: string) => Promise<boolean>;
    fetchHistory: () => Promise<void>;
    deleteSession: (id: string) => Promise<boolean>;
    resetStore: () => void;
}

export const useCashStore = create<CashState>((set, get) => ({
    activeSession: null,
    history: [],
    loading: false,
    loadingHistory: false,
    hasCheckedActive: false,

    fetchActiveSession: async (retries = 2) => {
        set({ loading: true });
        try {
            const data = await api.get('/cash-sessions/active');
            if (data && data.active) {
                set({ activeSession: data.session, hasCheckedActive: true });
            } else {
                set({ activeSession: null, hasCheckedActive: true });
            }
        } catch (error: any) {
            console.error('[CashStore] Error fetching active cash session:', error);
            // Si el backend arrojó 502 Bad Gateway u otro error de red, reintentar
            if (retries > 0) {
                console.warn(`[CashStore] Network error on active. Retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 1500));
                return get().fetchActiveSession(retries - 1);
            }
            set({ activeSession: null, hasCheckedActive: true });
        } finally {
            set({ loading: false });
        }
    },

    openSession: async (openingBalance) => {
        set({ loading: true });
        try {
            const data = await api.post('/cash-sessions/open', { opening_balance: openingBalance });
            if (data && data.success) {
                toast.success('¡Caja abierta con éxito!');
                set({ activeSession: data.session });
                // Refrescar historial en background sin bloquear UI
                get().fetchHistory();
                return true;
            }
            return false;
        } catch (error: any) {
            const serverMessage = error?.data?.error || error?.message || 'Error al abrir la caja';
            toast.error(serverMessage);
            return false;
        } finally {
            set({ loading: false });
        }
    },

    closeSession: async (actualCash, notes) => {
        set({ loading: true });
        try {
            const data = await api.post('/cash-sessions/close', { actual_cash: actualCash, notes });
            if (data && data.success) {
                toast.success('¡Caja cerrada y arqueada con éxito!');
                set({ activeSession: null });
                // Refrescar historial en background sin bloquear UI
                get().fetchHistory();
                return true;
            }
            return false;
        } catch (error: any) {
            const serverMessage = error?.data?.error || error?.message || 'Error al cerrar la caja';
            toast.error(serverMessage);
            return false;
        } finally {
            set({ loading: false });
        }
    },

    fetchHistory: async (retries = 2) => {
        set({ loadingHistory: true });
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/cash-sessions/history?_t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gkad_token') || ''}`,
                    'Cache-Control': 'no-cache, no-store',
                    'Pragma': 'no-cache',
                }
            });

            if (!response.ok) {
                if (response.status === 502 && retries > 0) {
                    console.warn(`[CashStore] 502 Bad Gateway. Retrying... (${retries} left)`);
                    await new Promise(r => setTimeout(r, 1500));
                    return get().fetchHistory(retries - 1);
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (Array.isArray(data)) {
                set({ history: data });
            } else {
                set({ history: [] });
            }
        } catch (error) {
            console.error('[CashStore] Error fetching history:', error);
            // Si es un error de red o timeout, reintentar si quedan intentos
            if (retries > 0) {
                console.warn(`[CashStore] Network error. Retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 1500));
                return get().fetchHistory(retries - 1);
            }
        } finally {
            set({ loadingHistory: false });
        }
    },

    deleteSession: async (id: string) => {
        const previousHistory = get().history;

        // 1. Actualización optimista instantánea: quitar de la UI al instante
        set({ history: previousHistory.filter(s => s.id !== id) });

        try {
            // 2. Llamar al backend para eliminar de disco
            const response = await fetch(`/api/cash-sessions/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gkad_token') || ''}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody?.error || `Error ${response.status}`);
            }

            toast.success('Reporte eliminado correctamente.');

            // 3. Sincronizar con el servidor en background para asegurar consistencia
            get().fetchHistory();
            return true;
        } catch (error: any) {
            // 4. Revertir si falló en el servidor
            set({ history: previousHistory });
            const serverMessage = error?.message || 'Error al eliminar el reporte';
            toast.error(serverMessage);
            return false;
        }
    },

    resetStore: () => set({ activeSession: null, history: [], loading: false, loadingHistory: false, hasCheckedActive: false })
}));
