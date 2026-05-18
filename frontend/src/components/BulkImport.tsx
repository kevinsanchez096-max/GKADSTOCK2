import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Card } from './ui-components';
import { 
  Upload, 
  X, 
  FileSpreadsheet 
} from 'lucide-react';
import { startBulkImport } from '../lib/bulkImportManager';
import { toast } from 'sonner';

interface BulkImportProps {
  onComplete: (report: any) => void;
  onClose: () => void;
}

export const BulkImport = ({ onComplete, onClose }: BulkImportProps) => {
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.organization_id) {
      toast.error("Error: No se detectó una organización activa.");
      return;
    }

    // Iniciar importación masiva en segundo plano
    startBulkImport(file, profile.organization_id, onComplete);

    // Cerrar el modal inmediatamente para liberar al usuario
    onClose();
  };

  return createPortal(
    <div 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
      <Card className="relative w-full max-w-2xl p-0 bg-card border border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden rounded-[3rem] max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
        <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
        
        {/* HEADER */}
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
              className="flex items-center justify-center animate-pulse shrink-0"
            >
              <Upload className="h-6 w-6"/>
            </div>
            <div>
              <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight m-0">
                IMPORTACIÓN <span style={{ color: 'var(--brand-primary)' }}>MASIVA</span>
              </h3>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
                MÁXIMO 2000 PRODUCTOS POR CARGA.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-brand-500 hover:bg-brand-50/10 transition-all cursor-pointer group"
          >
            <input 
              type="file"
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls"
              className="hidden"
            />
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto mb-4 group-hover:scale-110 group-hover:text-brand-500 transition-all"/>
            <h3 className="text-lg font-bold text-foreground mb-1">Selecciona tu archivo Excel</h3>
            <p className="text-sm text-muted-foreground mb-6">El modal se cerrará al instante y procesará la carga en segundo plano.</p>
            <div className="bg-muted px-4 py-2 rounded-lg inline-flex items-center text-xs font-mono text-muted-foreground">
              Formato aceptado: .xlsx / .xls
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
            Paso #1: Descarga y completa la plantilla, luego impórtala aquí.
          </p>
          <a
            href="/plantilla_importacion.xlsx"
            download="Plantilla_GKAD_STOCK.xlsx"
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-500/20 whitespace-nowrap active:scale-95"
          >
            <FileSpreadsheet className="h-3.5 w-3.5"/>
            Descargar Plantilla
          </a>
        </div>
      </Card>
    </div>,
    document.body
  );
};