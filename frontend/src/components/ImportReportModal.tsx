import React from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, X, AlertTriangle, CheckCircle, ListX } from 'lucide-react';
import { translateError } from '../lib/bulkImportManager';

interface ImportReportModalProps {
  report: {
    successCount: number;
    totalFailed: number;
    errors: Array<{
      row: number;
      message: string;
      productName?: string;
    }>;
  };
  onClose: () => void;
}

export const ImportReportModal = ({ report, onClose }: ImportReportModalProps) => {
  const { successCount, totalFailed, errors } = report;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden rounded-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Efecto de brillo de fondo */}
        <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
        
        {/* HEADER */}
        <div className="relative shrink-0 p-8 border-b border-border bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-brand-500 text-white border border-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0 animate-pulse">
              <FileSpreadsheet className="h-6 w-6"/>
            </div>
            <div>
              <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tight m-0">
                REPORTE DE <span style={{ color: 'var(--brand-primary)' }}>IMPORTACIÓN</span>
              </h3>
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-[3px] m-0 mt-0.5">
                Resumen de sincronización masiva
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-8 top-8 p-2.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-hover rounded-xl transition-all active:scale-95"
          >
            <X className="h-4.5 w-4.5"/>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider m-0">Guardados</p>
                <p className="text-xl font-black text-foreground font-outfit m-0 leading-none mt-1">{successCount}</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl flex items-center gap-3 border ${
              totalFailed > 0 
                ? 'bg-rose-500/10 border-rose-500/20' 
                : 'bg-muted/30 border-border'
            }`}>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                totalFailed > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-muted text-muted-foreground'
              }`}>
                <ListX className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-wider m-0 ${
                  totalFailed > 0 ? 'text-rose-500' : 'text-muted-foreground'
                }`}>Omitidos / Fallidos</p>
                <p className="text-xl font-black text-foreground font-outfit m-0 leading-none mt-1">{totalFailed}</p>
              </div>
            </div>
          </div>

          {/* Listado de Errores */}
          {errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="h-4 w-4 animate-bounce" />
                <h4 className="text-xs font-black uppercase tracking-wider">Detalle de Anomalías Detectadas</h4>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-muted/10 divide-y divide-border max-h-[30vh] overflow-y-auto shadow-inner">
                {errors.map((error, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                    <div className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border select-none mt-0.5 shrink-0">
                      {error.row !== -1 ? `Fila ${error.row}` : 'Sistema'}
                    </div>
                    <div className="flex-1 min-w-0">
                      {error.productName && (
                        <p className="text-xs font-bold text-foreground truncate m-0 mb-0.5">
                          {error.productName}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground m-0">
                        {translateError(error.message)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.length === 0 && (
            <div className="text-center py-8 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-2">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">¡Importación Perfecta!</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Todos los productos se cargaron y sincronizaron con éxito sin reportar duplicados o fallos.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-muted/30 border-t border-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
          >
            Entendido y Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
