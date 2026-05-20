import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { toast } from 'sonner';

export interface ImportError {
  row: number;
  message: string;
  productName?: string;
}

export interface SuccessDetail {
  row: number;
  productName: string;
  sku?: string;
}

export const translateError = (message: string): string => {
  if (!message) return "Error desconocido";

  if (message.includes("duplicate key value violates unique constraint idx_products_barcode")) {
    return "Código de barras ya registrado en el sistema";
  }
  if (message.includes("duplicate key value violates unique constraint idx_products_sku")) {
    return "SKU ya registrado en el sistema";
  }
  if (message.includes("El campo Nombre es obligatorio")) {
    return "El nombre del producto es obligatorio";
  }
  if (message.includes("SKU duplicado") || message.includes("SKU repetido")) {
    return "SKU repetido en el archivo";
  }
  if (message.includes("Código de barras duplicado") || message.includes("Código de barras repetido")) {
    return "Código de barras repetido en el archivo";
  }
  if (
    message.includes("Fallo al insertar en base de datos") || 
    message.includes("Error de base de datos") ||
    message.includes("violates unique constraint")
  ) {
    return "No se pudo guardar, verifica los datos del producto";
  }
  
  return message;
};

export const startBulkImport = async (
  file: File,
  orgId: string,
  onComplete: (report: { successCount: number; totalFailed: number; errors: ImportError[]; successDetails: SuccessDetail[] }) => void
) => {
  const toastId = toast.loading('Leyendo archivo Excel... (0%)', { duration: Infinity });

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData: any[] = XLSX.utils.sheet_to_json(ws);

      if (rawData.length === 0) {
        toast.error('Error de Importación: El archivo está vacío.', { id: toastId, duration: 5000 });
        return;
      }
      if (rawData.length > 2000) {
        toast.error('Error de Importación: El límite máximo es de 2000 filas.', { id: toastId, duration: 5000 });
        return;
      }

      toast.loading('Iniciando procesamiento de productos... (5%)', { id: toastId });
      await processImport(rawData, orgId, onComplete, toastId);
    } catch (err: any) {
      toast.error(`Error de Lectura: ${err.message}`, { id: toastId, duration: 5000 });
    }
  };

  reader.onerror = () => {
    toast.error('Error al leer el archivo seleccionado.', { id: toastId, duration: 5000 });
  };

  reader.readAsBinaryString(file);
};

// ════════════════════════════════════════════════════════════════
// FUNCIÓN DE LIMPIEZA AUTOMÁTICA (Sanitization)
// ════════════════════════════════════════════════════════════════
const sanitizeData = (rawData: any[]) => {
  return rawData.map((row) => {
    // Normalizar precios
    let cleanPrice = 0;
    if (row.Precio_Venta) {
      const priceStr = row.Precio_Venta.toString().replace(/[^0-9.-]+/g, "");
      cleanPrice = Number(priceStr);
    }

    let cleanCostPrice = 0;
    if (row.Precio_Compra) {
      const costStr = row.Precio_Compra.toString().replace(/[^0-9.-]+/g, "");
      cleanCostPrice = Number(costStr);
    }

    // Leer Margen_Ganancia
    let cleanMargin = 0;
    if (row.Margen_Ganancia !== undefined && row.Margen_Ganancia !== null) {
      const marginStr = row.Margen_Ganancia.toString().replace(/[^0-9.-]+/g, "");
      cleanMargin = Number(marginStr);
      if (isNaN(cleanMargin)) cleanMargin = 0;
    }

    let finalPrice = isNaN(cleanPrice) ? 0 : cleanPrice;
    const finalCostPrice = isNaN(cleanCostPrice) ? 0 : cleanCostPrice;

    // Si viene con margen > 0 y Precio_Venta está vacío o es 0, calcula el precio de venta
    if (cleanMargin > 0 && finalPrice === 0 && finalCostPrice > 0) {
      const divisor = 1 - (cleanMargin / 100);
      if (divisor > 0) {
        finalPrice = Math.round(finalCostPrice / divisor);
      }
    }

    // Normalizar si es pesable (SI / NO)
    const esPesableStr = row.Es_Pesable?.toString().trim().toUpperCase() || 'NO';
    const isWeighted = esPesableStr === 'SI';

    return {
      Nombre: row.Nombre?.toString().trim().toUpperCase() || '',
      Sku: row.SKU?.toString().trim() || '',
      Codigo_Barras: row.Codigo_Barras?.toString().trim() || '',
      Precio_Venta: finalPrice,
      Precio_Compra: finalCostPrice,
      Stock: Number(row.Stock) || 0,
      Minimo_Stock: Math.floor(Number(row.Minimo_Stock)) || 5,
      Unidad: row.Unidad?.toString().trim().toLowerCase() || 'unid',
      Es_Pesable: isWeighted,
      Categoria: row.Categoria?.toString().trim() || ''
    };
  });
};

const processImport = async (
  rawData: any[],
  orgId: string,
  onComplete: () => void,
  toastId: string | number
) => {
  const data = sanitizeData(rawData);
  let successCount = 0;
  let failedCount = 0;
  const localErrors: ImportError[] = [];
  const successDetails: SuccessDetail[] = [];

  try {
    // 1. Resolver categorías
    toast.loading('Sincronizando categorías... (10%)', { id: toastId });
    const uniqueCategoryNames = Array.from(new Set(data.map(d => d.Categoria).filter(Boolean)));
    const categoryMap: Record<string, string> = {};

    // Obtener categorías existentes
    const { data: existingCats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', orgId);

    existingCats?.forEach((c: any) => {
      categoryMap[c.name.toLowerCase()] = c.id;
    });

    // Crear categorías faltantes
    for (const catName of uniqueCategoryNames) {
      const lowerName = catName.toLowerCase();
      if (!categoryMap[lowerName]) {
        const { data: newCat, error: catErr } = await (supabase
          .from('categories')
          .insert([{ name: catName, organization_id: orgId }]) as any)
          .select()
          .single();

        if (!catErr && newCat) {
          categoryMap[lowerName] = newCat.id;
        }
      }
    }

    // 2. Traer SKUs y códigos de barras existentes para evitar duplicados en la BD
    toast.loading('Validando códigos de barras y SKUs... (20%)', { id: toastId });
    const { data: existingProducts } = await supabase
      .from('products')
      .select('sku, barcode')
      .eq('organization_id', orgId);

    const existingSkus = new Set(existingProducts?.map((p: any) => p.sku?.toLowerCase()).filter(Boolean));
    const existingBarcodes = new Set(existingProducts?.map((p: any) => p.barcode?.toLowerCase()).filter(Boolean));

    // ════════════════════════════════════════════════════════════════
    // FASE 1: VALIDACIÓN ATÓMICA COMPLETA (Pre-flight)
    // ════════════════════════════════════════════════════════════════
    const validatedRows: any[] = [];
    const seenSkus = new Set<string>();
    const seenBarcodes = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Fila de Excel (1-based + cabecera)

      if (!row.Nombre) {
        localErrors.push({ row: rowNum, message: `El campo "Nombre" es obligatorio y está vacío.` });
        continue;
      }

      if (row.Precio_Venta <= 0) {
        localErrors.push({ 
          row: rowNum, 
          message: `Columna "Precio_Venta": El valor debe ser un número mayor a 0.`, 
          productName: row.Nombre 
        });
        continue;
      }

      if (row.Stock < 0) {
        localErrors.push({ 
          row: rowNum, 
          message: `Columna "Stock": El valor debe ser mayor o igual a 0.`, 
          productName: row.Nombre 
        });
        continue;
      }

      if (row.Sku) {
        const skuLower = row.Sku.toLowerCase();
        if (existingSkus.has(skuLower) || seenSkus.has(skuLower)) {
          localErrors.push({ 
            row: rowNum, 
            message: `SKU duplicado detectado: "${row.Sku}".`, 
            productName: row.Nombre 
          });
          continue;
        }
        seenSkus.add(skuLower);
      }

      if (row.Codigo_Barras) {
        const barcodeLower = row.Codigo_Barras.toString().toLowerCase().trim();
        if (existingBarcodes.has(barcodeLower) || seenBarcodes.has(barcodeLower)) {
          localErrors.push({ 
            row: rowNum, 
            message: 'Código de barras duplicado', 
            productName: row.Nombre 
          });
          continue;
        }
        seenBarcodes.add(barcodeLower);
      }

      validatedRows.push({
        rowNum,
        payload: {
          organization_id: orgId,
          name: row.Nombre,
          sku: row.Sku || null,
          barcode: row.Codigo_Barras || null,
          price: row.Precio_Venta,
          cost_price: row.Precio_Compra || 0,
          stock: row.Stock,
          min_stock: row.Minimo_Stock,
          unit: row.Unidad,
          is_weighted: row.Es_Pesable,
          category_id: row.Categoria ? categoryMap[row.Categoria.toLowerCase()] : null
        }
      });
    }

    // FASE 2: INSERCIÓN INDIVIDUAL PRODUCTO POR PRODUCTO (Permisiva)
    if (validatedRows.length > 0) {
      const totalRows = validatedRows.length;

      for (let i = 0; i < totalRows; i++) {
        const { rowNum, payload } = validatedRows[i];

        const { error: insertErr } = await supabase.from('products').insert([payload]);
        if (insertErr) {
          console.error(`[BulkImport] Error al insertar producto "${payload.name}" (Fila ${rowNum}):`, insertErr);
          failedCount++;
          localErrors.push({
            row: rowNum,
            message: `Fallo al insertar en base de datos: ${insertErr.message}`,
            productName: payload.name
          });
        } else {
          successCount++;
          successDetails.push({
            row: rowNum,
            productName: payload.name,
            sku: payload.sku || undefined
          });
        }

        const progress = Math.min(100, Math.round(((i + 1) / totalRows) * 80) + 20);
        toast.loading(`Sincronizando inventario... (${progress}%)`, { id: toastId });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // FASE 3: COMPLEMENTACIÓN Y REPORTE DETALLADO
    // ════════════════════════════════════════════════════════════════
    const totalFailed = localErrors.length + failedCount;
    toast.dismiss(toastId);

    onComplete({
      successCount,
      totalFailed,
      errors: localErrors,
      successDetails
    });

  } catch (err: any) {
    toast.error(`Error crítico en importación: ${err.message}`, { id: toastId, duration: 6000 });
  }
};
