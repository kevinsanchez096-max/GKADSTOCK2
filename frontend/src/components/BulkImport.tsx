import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Card } from './ui-components';
import { 
 Upload, 
 AlertCircle, 
 CheckCircle2, 
 X, 
 FileSpreadsheet, 
 ChevronDown, 
 ChevronUp 
} from 'lucide-react';

interface BulkImportProps {
 onComplete: () => void;
 onClose: () => void;
}

interface ImportError {
 row: number;
 message: string;
 data?: any;
}

export const BulkImport = ({ onComplete, onClose }: BulkImportProps) => {
 const { profile } = useAuthStore(); // Eliminado 'user' para evitar error TS6133
 const [isUploading, setIsUploading] = useState(false);
 const [progress, setProgress] = useState(0);
 const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
 const [errors, setErrors] = useState<ImportError[]>([]);
 const [showErrors, setShowErrors] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setIsUploading(true);
 setProgress(0);
 setErrors([]);
 setResults(null);

 const reader = new FileReader();
 reader.onload = async (evt) => {
 try {
 const bstr = evt.target?.result;
 const wb = XLSX.read(bstr, { type: 'binary' });
 const wsname = wb.SheetNames[0];
 const ws = wb.Sheets[wsname];
 const rawData: any[] = XLSX.utils.sheet_to_json(ws);

 if (rawData.length === 0) throw new Error('El archivo está vacío.');
 if (rawData.length > 2000) throw new Error('El límite máximo es de 2000 filas para garantizar estabilidad.');

 await processImport(rawData);
 } catch (err: any) {
 setErrors([{ row: 0, message: err.message }]);
 setIsUploading(false);
 }
 };
 reader.readAsBinaryString(file);
 };

 // ════════════════════════════════════════════════════════════════
 // FUNCIÓN DE LIMPIEZA AUTOMÁTICA (Sanitization)
 // Evita errores si el usuario pone"$", comas o espacios en el Excel
 // ════════════════════════════════════════════════════════════════
 const sanitizeData = (rawData: any[]) => {
 return rawData.map((row) => {
 // Extraer solo números del precio
 let cleanPrice = 0;
 if (row.Precio) {
 const priceStr = row.Precio.toString().replace(/[^0-9.-]+/g,"");
 cleanPrice = Number(priceStr);
 }

 return {
 Nombre: row.Nombre?.toString().trim().toUpperCase() || '',
 Sku: row.Sku?.toString().trim() || '',
 Precio: isNaN(cleanPrice) ? 0 : cleanPrice,
 Stock: Math.floor(Number(row.Stock)) || 0,
 Minimo_Stock: Math.floor(Number(row.Minimo_Stock)) || 5,
 Unidad: row.Unidad?.toString().trim() || 'unidad',
 Categoria: row.Categoria?.toString().trim() || ''
 };
 });
 };

 const processImport = async (rawData: any[]) => {
 // 1. Aplicamos la limpieza automática
 const data = sanitizeData(rawData);
 
 let successCount = 0;
 let failedCount = 0;
 const localErrors: ImportError[] = [];

 // 2. Resolve Categories Atomics
 const uniqueCategoryNames = Array.from(new Set(data.map(d => d.Categoria).filter(Boolean)));
 const categoryMap: Record<string, string> = {};

 try {
 // Fetch existing categories
 const { data: existingCats } = await supabase
 .from('categories')
 .select('id, name');
 
 existingCats?.forEach((c: any) => {
 categoryMap[c.name.toLowerCase()] = c.id;
 });

 // Create missing categories
 for (const catName of uniqueCategoryNames) {
 const lowerName = catName.toLowerCase();
 if (!categoryMap[lowerName]) {
 // Cast 'as any' para evitar el error TS2339 en cadenas de Supabase
 const { data: newCat, error: catErr } = await (supabase
 .from('categories')
 .insert([{ name: catName, organization_id: profile?.organization_id }]) as any)
 .select()
 .single();
 
 if (!catErr && newCat) {
 categoryMap[lowerName] = newCat.id;
 }
 }
 }

 // 3. Fetch existing SKUs to avoid duplicates (Optimization)
 const { data: existingProducts } = await supabase
 .from('products')
 .select('sku');
 const existingSkus = new Set(existingProducts?.map((p: any) => p.sku?.toLowerCase()).filter(Boolean));

 // ════════════════════════════════════════════════════════════════
 // FASE 1: VALIDACIÓN ATÓMICA COMPLETA (Pre-flight)
 // ════════════════════════════════════════════════════════════════
 const validatedRows: any[] = [];
 const seenSkus = new Set<string>();

 for (let i = 0; i < data.length; i++) {
 const row = data[i];
 const rowNum = i + 2; // Fila de Excel (1-based + header)

 if (!row.Nombre) {
 localErrors.push({ row: rowNum, message: `Error en fila ${rowNum}: El campo"Nombre"es obligatorio y está vacío.` });
 continue;
 }

 if (row.Precio <= 0) {
 localErrors.push({ row: rowNum, message: `Error en fila ${rowNum}, columna"Precio": El valor no es un número válido mayor a 0.` });
 continue;
 }

 if (row.Stock < 0) {
 localErrors.push({ row: rowNum, message: `Error en fila ${rowNum}, columna"Stock": El valor debe ser mayor o igual a 0.` });
 continue;
 }

 if (row.Sku) {
 const skuLower = row.Sku.toLowerCase();
 if (existingSkus.has(skuLower) || seenSkus.has(skuLower)) {
 localErrors.push({ row: rowNum, message: `Error en fila ${rowNum}: SKU duplicado detectado:"${row.Sku}".` });
 continue;
 }
 seenSkus.add(skuLower);
 }

 validatedRows.push({
 organization_id: profile?.organization_id,
 name: row.Nombre,
 sku: row.Sku,
 price: row.Precio,
 stock: row.Stock,
 min_stock: row.Minimo_Stock,
 unit: row.Unidad,
 category_id: row.Categoria ? categoryMap[row.Categoria.toLowerCase()] : null
 });
 }

 // DECISIÓN ATÓMICA
 if (localErrors.length > 0) {
 setResults({ success: 0, failed: localErrors.length });
 setErrors(localErrors);
 setIsUploading(false);
 return; 
 }

 // ════════════════════════════════════════════════════════════════
 // FASE 2: INSERCIÓN 
 // ════════════════════════════════════════════════════════════════
 const batchSize = 50;
 for (let i = 0; i < validatedRows.length; i += batchSize) {
 const batch = validatedRows.slice(i, i + batchSize);

 const { error: insertErr } = await supabase.from('products').insert(batch);
 if (insertErr) {
 localErrors.push({ row: i + 1, message: `Error de base de datos en lote ${Math.floor(i / batchSize) + 1}: ${insertErr.message}` });
 failedCount += batch.length;
 } else {
 successCount += batch.length;
 }

 setProgress(Math.round(((i + batch.length) / validatedRows.length) * 100));
 }

 setResults({ success: successCount, failed: failedCount });
 setErrors(localErrors);
 if (successCount > 0) onComplete();
 } catch (err: any) {
 setErrors(prev => [...prev, { row: 0, message: 'Error fatal: ' + err.message }]);
 } finally {
 setIsUploading(false);
 }
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
 <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors">
 <X className="h-6 w-6"/>
 </button>
 </div>

 {/* CONTENT */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 
 {!isUploading && !results && (
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
 <p className="text-sm text-muted-foreground mb-6">O arrastra y suelta el archivo aquí para comenzar.</p>
 <div className="bg-muted px-4 py-2 rounded-lg inline-flex items-center text-xs font-mono text-muted-foreground">
 Formato aceptado: .xlsx / .xls
 </div>
 </div>
 )}

 {isUploading && (
 <div className="py-10 text-center space-y-6">
 <div className="relative h-24 w-24 mx-auto">
 <div className="absolute inset-0 border-4 border-border rounded-full"/>
 <div 
 className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"
 style={{ animationDuration: '0.8s' }}
 />
 <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-foreground">
 {progress}%
 </div>
 </div>
 <div>
 <h3 className="text-lg font-bold text-foreground mb-2">Procesando Importación...</h3>
 <p className="text-sm text-muted-foreground">Validando datos y sincronizando con el servidor.</p>
 </div>
 <div className="w-full bg-muted h-2 rounded-full overflow-hidden max-w-sm mx-auto">
 <div 
 className="bg-brand-600 h-full transition-all duration-300"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>
 )}

 {results && (
 <div className="space-y-6 animate-in zoom-in duration-300">
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl p-6 text-center">
 <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2"/>
 <p className="text-3xl font-bold text-green-600">{results.success}</p>
 <p className="text-xs font-bold text-green-700/60 uppercase tracking-wider">Productos Éxitosos</p>
 </div>
 <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-6 text-center">
 <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2"/>
 <p className="text-3xl font-bold text-red-500">{results.failed}</p>
 <p className="text-xs font-bold text-red-600/60 uppercase tracking-wider">Productos Fallidos</p>
 </div>
 </div>

 {errors.length > 0 && (
 <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
 <button 
 onClick={() => setShowErrors(!showErrors)}
 className="w-full p-4 flex items-center justify-between bg-muted hover:bg-muted transition-colors"
 >
 <div className="flex items-center gap-2">
 <AlertCircle className="h-4 w-4 text-red-500"/>
 <span className="text-sm font-bold text-foreground">Resumen de Errores ({errors.length})</span>
 </div>
 {showErrors ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
 </button>
 
 {showErrors && (
 <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-card">
 {errors.map((err, i) => (
 <div key={i} className="p-3 flex items-start gap-3">
 <div className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold mt-0.5">
 Fila {err.row || 'N/A'}
 </div>
 <p className="text-xs text-muted-foreground font-medium">{err.message}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 <Button onClick={onClose} className="w-full h-12 text-base font-bold">
 Cerrar y Ver Inventario
 </Button>
 </div>
 )}

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