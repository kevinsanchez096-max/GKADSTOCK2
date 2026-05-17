import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button } from './ui-components';
import { X, RotateCcw, AlertTriangle, Loader2, Minus, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface ReturnSaleModalProps {
  sale: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnSaleModal = ({ sale, onClose, onSuccess }: ReturnSaleModalProps) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await api.get(`/sales/${sale.id}`);
        setItems(data);
        const initialQtys: Record<string, number> = {};
        data.forEach((item: any) => {
          initialQtys[item.id] = 0;
        });
        setReturnQuantities(initialQtys);
      } catch (error) {
        toast.error('Error al cargar detalles de la venta');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [sale.id]);

  const handleQtyChange = (itemId: string, maxQty: number, delta: number) => {
    setReturnQuantities(prev => {
      const current = prev[itemId] || 0;
      const newValue = Math.min(maxQty, Math.max(0, current + delta));
      return { ...prev, [itemId]: newValue };
    });
  };

  const calculateRefundTotal = () => {
    return items.reduce((acc, item) => {
      const qty = returnQuantities[item.id] || 0;
      return acc + (qty * Number(item.price));
    }, 0);
  };

  const handleConfirmReturn = async () => {
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = items.find(i => i.id === itemId);
        return {
          product_id: item.product_id,
          quantity: qty
        };
      });

    if (itemsToReturn.length === 0) {
      toast.warning('Selecciona al menos un artículo para devolver');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/sales/${sale.id}/return`, { itemsToReturn });
      toast.success('Devolución procesada con éxito');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  const totalToRefund = calculateRefundTotal();
  const isTotalReturn = items.length > 0 && items.every(item => (returnQuantities[item.id] || 0) === item.quantity);

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.45)'
      }} 
      className="no-print"
    >
      <Card className="w-full max-w-2xl p-0 glass-dark border-border relative overflow-hidden rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
        
        {/* Modal Header */}
        <div 
          style={{
            padding: '40px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 95%)'
          }}
          className="relative shrink-0"
        >
          <div className="flex items-center gap-4">
            <div 
              style={{ 
                padding: '12px',
                backgroundColor: 'var(--brand-primary)', 
                borderRadius: '16px', 
                color: 'white', 
                border: '2px solid var(--border)',
                boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--brand-primary), transparent 60%)'
              }}
              className="flex items-center justify-center animate-pulse"
            >
              <RotateCcw className="h-6 w-6"/>
            </div>
            <div>
              <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight m-0">
                Logística <span style={{ color: 'var(--brand-primary)' }}>Inversa</span>
              </h3>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
                Factura de Referencia: {sale.id?.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-8 top-8 p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all"
          >
            <X className="h-5 w-5"/>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-10 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-brand-500 animate-spin"/>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Consultando Folio...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500">
                <AlertTriangle className="h-5 w-5 shrink-0"/>
                <p className="text-[11px] font-bold leading-relaxed uppercase m-0">
                  Atención: Las unidades seleccionadas serán cargadas automáticamente de nuevo al inventario real.
                </p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-5 bg-muted rounded-2xl border border-border hover:border-border transition-all group">
                    <div className="space-y-1">
                      <p className="font-black text-foreground uppercase text-sm tracking-tight m-0">{item.products?.name || 'Producto'}</p>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                        <span className="px-2 py-0.5 bg-muted rounded-md">Original: {item.quantity} {item.products?.unit || 'unid'}</span>
                        <span>Precio: ${Number(item.price).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-background/40 rounded-xl border border-border p-1">
                        <button 
                          onClick={() => handleQtyChange(item.id, item.quantity, -1)}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 border-none bg-transparent cursor-pointer"
                          disabled={returnQuantities[item.id] === 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center font-black text-foreground text-lg font-outfit">
                          {returnQuantities[item.id] || 0}
                        </span>
                        <button 
                          onClick={() => handleQtyChange(item.id, item.quantity, 1)}
                          className="p-2 text-brand-500 hover:text-brand-400 transition-colors disabled:opacity-30 border-none bg-transparent cursor-pointer"
                          disabled={returnQuantities[item.id] === item.quantity}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER INFO */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="p-6 bg-brand-500/5 rounded-[2rem] border border-brand-500/10">
                  <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1 m-0">Monto a Reintegrar</p>
                  <p className="text-3xl font-black text-brand-500 font-outfit tracking-tighter leading-none m-0">${totalToRefund.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-card/50 rounded-[2rem] border border-border flex flex-col justify-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 m-0">TIPO DE DEVOLUCIÓN</p>
                  <p className={`text-sm font-black uppercase tracking-tight m-0 ${isTotalReturn ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isTotalReturn ? 'TOTAL (ANULACIÓN)' : 'PARCIAL (AJUSTE)'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Button 
                  variant="outline"
                  onClick={onClose} 
                  className="flex-1 h-14 text-[11px] font-black uppercase tracking-widest rounded-2xl"
                  disabled={submitting}
                >
                  CANCELAR
                </Button>
                <Button 
                  onClick={handleConfirmReturn} 
                  className="flex-[2] h-14 text-[11px] font-black uppercase tracking-widest rounded-2xl bg-brand-500 text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                  loading={submitting}
                  disabled={totalToRefund === 0}
                >
                  CONFIRMAR DEVOLUCIÓN DE MERCANCÍA
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>,
    document.body
  );
};
