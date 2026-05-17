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
        return <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Aprobado</span>;
      case 'rejected':
        return <span className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Rechazado</span>;
      default:
        return <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Pendiente</span>;
    }
  };

  const totalReq = requests.length;
  const pendingReq = requests.filter(r => r.payment_status === 'pending').length;
  const approvedReq = requests.filter(r => r.payment_status === 'approved').length;
  const rejectedReq = requests.filter(r => r.payment_status === 'rejected').length;

  return (
    <div className="space-y-8 animate-slide-up pb-32">
      
      {/* 1. MISSION CONTROL HEADER */}
      <div className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-[var(--brand-primary)]/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] animate-pulse shadow-[0_0_10px_var(--brand-primary)]" />
              <CreditCard size={18} className="text-[var(--brand-primary)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--brand-primary)]">
                Auditoría Financiera
              </span>
            </div>
            
            <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
              Solicitudes de <span className="text-[var(--brand-primary)]">Pago</span>
            </h1>
            
            <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">
              Gestión de transferencias y pagos pendientes
            </p>
          </div>
        </div>
      </div>

      {/* PANEL DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card: Total Solicitudes */}
        <div className="p-6 text-left bg-card border border-border rounded-[2rem] shadow-sm transition-all relative group hover:shadow-md">
          <div className="h-12 w-12 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center text-[var(--brand-primary)] mb-4">
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Solicitudes</p>
          <p className="text-2xl font-black text-foreground mt-1">{totalReq}</p>
        </div>

        {/* Card: Pendientes */}
        <div className="p-6 text-left bg-card border border-border rounded-[2rem] shadow-sm transition-all relative group hover:shadow-md">
          <div className="h-12 w-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-4">
            <Clock className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pendientes</p>
          <p className="text-2xl font-black text-foreground mt-1">{pendingReq}</p>
        </div>

        {/* Card: Aprobadas */}
        <div className="p-6 text-left bg-card border border-border rounded-[2rem] shadow-sm transition-all relative group hover:shadow-md">
          <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-4">
            <CheckCircle className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aprobadas</p>
          <p className="text-2xl font-black text-foreground mt-1">{approvedReq}</p>
        </div>

        {/* Card: Rechazadas */}
        <div className="p-6 text-left bg-card border border-border rounded-[2rem] shadow-sm transition-all relative group hover:shadow-md">
          <div className="h-12 w-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4">
            <XCircle className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rechazadas</p>
          <p className="text-2xl font-black text-foreground mt-1">{rejectedReq}</p>
        </div>

      </div>

      <div className="bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-border/50 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
             <div className="h-8 w-8 rounded-full border-2 border-[var(--brand-primary)] border-t-transparent animate-spin" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargando solicitudes...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50 rounded-[2rem] m-6 bg-muted/20">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <CreditCard size={24} className="text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-black font-outfit uppercase tracking-tight text-foreground mb-1">Sin Solicitudes</h3>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              No hay solicitudes de pago registradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fecha</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Organización</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Plan Solicitado</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Monto</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Método</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Estado</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-muted-foreground">
                      {new Date(req.created_at).toLocaleString('es-CO', { 
                        year: 'numeric', month: 'short', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-6 py-5 font-black uppercase text-xs">{req.organization_name}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-widest border border-[var(--brand-primary)]/20">
                        {req.plan_name}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-black font-outfit text-foreground text-base">
                      ${Number(req.plan_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1.5 bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {req.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {getStatusBadge(req.payment_status)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {req.payment_status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('approve');
                            }}
                            className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Aprobar"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('reject');
                            }}
                            className="h-8 w-8 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Rechazar"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">-</span>
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
