import React, { useRef } from 'react';
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
  onComplete: () => void;
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-card shadow-2xl border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg text-brand-600 dark:text-brand-400">
              <Upload className="h-6 w-6"/>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">Importación Masiva</h2>
              <p className="text-xs text-muted-foreground">Máximo 2000 productos por carga.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-6 w-6"/>
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
    </div>
  );
};