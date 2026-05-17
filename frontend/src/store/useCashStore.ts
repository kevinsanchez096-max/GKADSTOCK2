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
                get().fetchHistory(); // Recargar el historial
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
        set({ loading: true });
        try {
            const data = await api.get('/cash-sessions/history');
            if (Array.isArray(data)) {
                set({ history: data });
            } else {
                set({ history: [] });
            }
        } catch (error) {
            console.error('[CashStore] Error fetching history:', error);
            set({ history: [] });
        } finally {
            set({ loading: false });
        }
    },

    deleteSession: async (id) => {
        set({ loading: true });
        try {
            const data = await api.delete(`/cash-sessions/${id}`);
            if (data && data.success) {
                toast.success('Reporte de cierre de caja eliminado con éxito.');
                await get().fetchHistory(); // Recargar historial de arqueos
                return true;
            }
            return false;
        } catch (error: any) {
            const serverMessage = error?.data?.error || error?.message || 'Error al eliminar el reporte';
            toast.error(serverMessage);
            return false;
        } finally {
            set({ loading: false });
        }
    },

    resetStore: () => set({ activeSession: null, history: [], loading: false, hasCheckedActive: false })
}));
