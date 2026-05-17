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

    fetchActiveSession: async () => {
        set({ loading: true });
        try {
            const data = await api.get('/cash-sessions/active');
            if (data && data.active) {
                set({ activeSession: data.session, hasCheckedActive: true });
            } else {
                set({ activeSession: null, hasCheckedActive: true });
            }
        } catch (error) {
            console.error('[CashStore] Error fetching active cash session:', error);
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

    fetchHistory: async () => {
        set({ loadingHistory: true });
        try {
            const data = await api.get('/cash-sessions/history');
            if (Array.isArray(data)) {
                set({ history: data });
            } else {
                set({ history: [] });
            }
        } catch (error) {
            console.error('[CashStore] Error fetching history:', error);
        } finally {
            set({ loadingHistory: false });
        }
    },

    deleteSession: async (id: string) => {
        const previousHistory = get().history;

        // 1. Actualización optimista instantánea: quitar de la UI al instante
        set({ history: previousHistory.filter(s => s.id !== id) });

        try {
            // 2. Llamar al backend para eliminar
            await api.delete(`/cash-sessions/${id}`);

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
