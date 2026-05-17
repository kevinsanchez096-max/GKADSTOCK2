import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface PaymentRequest {
  id: string;
  created_at: string;
  organization_id: string;
  organization_name: string;
  plan_name: string;
  plan_price: number;
  payment_method: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  customer_name?: string;
  customer_email?: string;
  customer_document?: string;
  bank_name?: string;
  transaction_reference?: string;
}

export const PaymentRequests = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Suscripción a Supabase Realtime
    const subscription = supabase
      .channel('payment_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_requests' },
        (payload) => {
          console.log('Cambio en payment_requests recibido:', payload);
          if (payload.eventType === 'INSERT') {
            setRequests((prev) => [payload.new as PaymentRequest, ...prev]);
            toast.info('Nueva solicitud de pago recibida');
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((req) => (req.id === payload.new.id ? (payload.new as PaymentRequest) : req))
            );
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((req) => req.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/requests', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!res.ok) throw new Error('Error al obtener solicitudes');
      const data = await res.json();
      setRequests(data);
    } catch (error: any) {
      toast.error(error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    setIsProcessing(true);
    
    const status = actionType === 'approve' ? 'approved' : 'rejected';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/payments/requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error procesando la solicitud');
      }
      
      toast.success(data.message);
      
      // Local state update is handled by Realtime, but we can do it optimistically
      setRequests((prev) =>
        prev.map((req) => (req.id === selectedRequest.id ? { ...req, payment_status: status } : req))
      );
    } catch (error: any) {
      toast.error(error.message || `Error al ${actionType === 'approve' ? 'aprobar' : 'rechazar'} la solicitud`);
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-bold uppercase tracking-wider">Aprobado</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold uppercase tracking-wider">Rechazado</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-bold uppercase tracking-wider">Pendiente</span>;
    }
  };

  const totalReq = requests.length;
  const pendingReq = requests.filter(r => r.payment_status === 'pending').length;
  const approvedReq = requests.filter(r => r.payment_status === 'approved').length;
  const rejectedReq = requests.filter(r => r.payment_status === 'rejected').length;

  return (
    <div className="p-6">
      <div className="flex flex-col gap-1 mb-8">
        <div className="flex items-center gap-3">
          <CreditCard size={22} className="text-[var(--brand-primary)]" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground leading-none">
            SOLICITUDES DE <span className="text-[var(--brand-primary)]">PAGO</span>
          </h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-[34px]">
          Gestión de transferencias y pagos pendientes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Solicitudes</div>
          <div className="text-2xl font-black">{totalReq}</div>
        </div>
        <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <div className="text-xs font-bold text-yellow-500 uppercase mb-1">Pendientes</div>
          <div className="text-2xl font-black text-yellow-500">{pendingReq}</div>
        </div>
        <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
          <div className="text-xs font-bold text-green-500 uppercase mb-1">Aprobadas</div>
          <div className="text-2xl font-black text-green-500">{approvedReq}</div>
        </div>
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="text-xs font-bold text-red-500 uppercase mb-1">Rechazadas</div>
          <div className="text-2xl font-black text-red-500">{rejectedReq}</div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay solicitudes de pago registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Organización</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Plan Solicitado</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Monto</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Método</th>
                  <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-[10px]">Estado</th>
                  <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-[10px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleString('es-CO', { 
                        year: 'numeric', month: 'short', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{req.organization_name}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--brand-primary)]">{req.plan_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-500">
                      ${Number(req.plan_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-muted rounded text-xs font-semibold">
                        {req.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(req.payment_status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {req.payment_status === 'pending' && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('approve');
                            }}
                            className="p-1.5 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                            title="Aprobar"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('reject');
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Rechazar"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && actionType && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-4 flex items-center gap-3 border-b ${actionType === 'approve' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              {actionType === 'approve' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
              <h2 className="text-lg font-bold">
                {actionType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
              </h2>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                ¿Estás seguro de que deseas {actionType === 'approve' ? 'aprobar' : 'rechazar'} la solicitud de pago de <strong>{selectedRequest.organization_name}</strong> por el plan <strong>{selectedRequest.plan_name}</strong>?
              </p>
              
              {actionType === 'approve' && (
                <div className="bg-muted/50 p-3 rounded-lg border border-border text-xs mb-4">
                  <p className="text-muted-foreground">Esta acción actualizará automáticamente el plan de la organización a <strong>{selectedRequest.plan_name}</strong>.</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAction}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 rounded-xl font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    actionType === 'approve' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {isProcessing && <Clock size={16} className="animate-spin" />}
                  {isProcessing ? 'Procesando...' : (actionType === 'approve' ? 'Sí, Aprobar' : 'Sí, Rechazar')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
