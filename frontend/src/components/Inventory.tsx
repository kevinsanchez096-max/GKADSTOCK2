import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from './ui-components';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  LayoutGrid, 
  X,
  Upload,
  Hash,
  Scale,
  Download,
  History,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Scan
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useMemo } from 'react';
import { BulkImport } from './BulkImport';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const Inventory = () => {
  const { 
    categories, 
    products, 
    fetchProducts, 
    addProduct, 
    fetchCategories, 
    loading,
    inventoryMovements,
    fetchInventoryMovements 
  } = useShopStore();
  const { profile } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [isMermaModalOpen, setIsMermaModalOpen] = useState(false);
  const [selectedMermaProduct, setSelectedMermaProduct] = useState<any | null>(null);
  const [mermaData, setMermaData] = useState({ quantity: '', reason: 'Vencido' });

  const handleOpenMerma = (product: any) => {
    setSelectedMermaProduct(product);
    setMermaData({ quantity: '', reason: 'Vencido' });
    setIsMermaModalOpen(true);
  };

  // MÉTTRICAS DINÁMICAS (TIEMPO REAL)
  const metrics = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const filtered = safeProducts.filter(p => 
      (p?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p?.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const capital = filtered.reduce((acc, p) => {
      const pPrice = Number(p?.price || 0);
      const pStock = Number(p?.stock || 0);
      return acc + (pPrice * pStock);
    }, 0);

    const critical = filtered.filter(p => Number(p?.stock || 0) <= Number(p?.min_stock || 0)).length;

    return {
      totalCapital: isNaN(capital) ? 0 : capital,
      skusCount: filtered.length,
      criticalStock: critical,
      filteredProducts: filtered
    };
  }, [products, searchTerm]);

  const filteredProducts = metrics?.filteredProducts || [];

  const handleExportExcel = () => {
    if (products.length === 0) {
      // Inventario vacío → descargar la plantilla estática como guía de inicio
      const link = document.createElement('a');
      link.href = '/plantilla_importacion.xlsx';
      link.download = 'Plantilla_GKAD_STOCK.xlsx';
      link.click();
      toast.info('Descargando plantilla de importación...', { icon: '📥' });
      return;
    }

    const dataToExport = filteredProducts.map(p => ({
      Nombre: p.name,
      SKU: p.sku || 'N/A',
      Categoría: getCategoryName(p.category_id),
      Precio: p.price,
      Stock: p.stock,
      Unidad: p.unit,
      'Stock Mínimo': p.min_stock
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `Inventario_${profile?.organization_name || 'POS'}_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Excel generado correctamente");
  };

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '',
    min_stock: '5',
    unit: 'unid',
    category_id: '',
    barcode: '',
    is_weighted: false
  });

  const resetForm = () => {
    setNewProduct({ name: '', sku: '', price: '', stock: '', min_stock: '5', unit: 'unid', category_id: '', barcode: '', is_weighted: false });
    setEditingProduct(null);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      sku: product.sku || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      min_stock: (product.min_stock || 5).toString(),
      unit: product.unit || 'unid',
      category_id: product.category_id,
      barcode: product.barcode || '',
      is_weighted: !!product.is_weighted
    });
    setIsAddModalOpen(true);
  };

  const { deleteProduct, updateProduct } = useShopStore();

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto físicamente? Esta acción no se puede deshacer.')) {
      if (!profile?.organization_id) return;
      await deleteProduct(id, profile.organization_id);
    }
  };

  const handleMermaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMermaProduct || !profile?.organization_id) return;
    
    const deductQty = Number(mermaData.quantity);
    if (isNaN(deductQty) || deductQty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    
    if (deductQty > selectedMermaProduct.stock) {
      toast.error('La cantidad no puede superar el stock actual');
      return;
    }

    const newStock = selectedMermaProduct.stock - deductQty;

    const success = await updateProduct(selectedMermaProduct.id, { stock: newStock }, profile.organization_id);
    
    if (success) {
      // 1. Calcular el costo de la pérdida (usando fallback por ahora)
      const precioBase = selectedMermaProduct.costPrice || selectedMermaProduct.price;
      const valorPerdida = precioBase * deductQty;
      
      // 2. Registrar el Gasto Automático
      try {
        const { error: supabaseError } = await supabase
          .from('expenses')
          .insert([{
            description: `Merma de Inventario: ${mermaData.reason} - ${selectedMermaProduct.name}`,
            amount: valorPerdida,
            category: 'MERMA_INVENTARIO',
            organization_id: profile.organization_id
          }]);
          
        if (supabaseError) {
          throw supabaseError;
        }
      } catch (err: any) {
        console.error('Error al registrar gasto de merma:', err);
        toast.error(`Error al registrar gasto: ${err.message || 'supabase error'}`);
      }

      toast.success(`Merma registrada: -${deductQty} (${mermaData.reason})`, { icon: '📉' });
      setIsMermaModalOpen(false);
      setSelectedMermaProduct(null);
    }
  };

  useEffect(() => {
    if (profile?.organization_id) {
        fetchProducts(profile.organization_id);
        fetchCategories(profile.organization_id);

        // AISLAMIENTO REALTIME (Protección a nivel de Catalogo individual)
        const channel = supabase
          .channel(`inventory-sync-${profile.organization_id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products', filter: `organization_id=eq.${profile.organization_id}` },
            () => {
               fetchProducts(profile.organization_id);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
    }
  }, [profile?.organization_id]);

  // Accesibilidad: Tecla ESC para cerrar modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddModalOpen(false);
    };
    if (isAddModalOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isAddModalOpen]);

  const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.category_id) {
      toast.warning("La categoría es obligatoria");
      return;
    }
    if (!profile?.organization_id) return;

    const productData = {
      ...newProduct,
      name: toTitleCase(newProduct.name.trim()),
      organization_id: profile.organization_id,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      min_stock: Number(newProduct.min_stock)
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await addProduct(productData);
    }
    
    setIsAddModalOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (isHistoryModalOpen && profile?.organization_id) {
      fetchInventoryMovements(profile.organization_id, historyDate);
    }
  }, [isHistoryModalOpen, historyDate, profile?.organization_id]);

  const getCategoryName = (id: string) => {
    if (!Array.isArray(categories)) return 'General';
    return categories.find(c => c.id === id)?.name || 'General';
  };

  return (
    <div className="space-y-8 animate-slide-up">
      
      {/* PANEL DE MÉTRICAS DINÁMICAS (MODO DIOS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Card: Capital Invertido */}
         <div className="relative group overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 transition-all hover:border-emerald-500/50 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-all duration-700">
               <TrendingUp size={80} className="text-emerald-500" />
            </div>
            <div className="relative z-10">
               <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <DollarSign className="text-emerald-500" size={24} />
               </div>
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Capital en Existencias</p>
               <h3 className="text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tighter leading-none">
                  ${metrics.totalCapital.toLocaleString()}
               </h3>
               <div className="mt-4 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-widest">Valor de Mercado</span>
               </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
         </div>

         {/* Card: SKUs Activos */}
         <div className="relative group overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 transition-all hover:border-brand-500/50 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-all duration-700">
               <Package size={80} className="text-blue-500" />
            </div>
            <div className="relative z-10">
               <div className="h-12 w-12 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4 border border-brand-500/20 shadow-lg shadow-brand-500/10">
                  <LayoutGrid className="text-brand-500" size={24} />
               </div>
               <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-1">Entidades en Radar</p>
               <h3 className="text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tighter leading-none">
                  {metrics.skusCount} <span className="text-sm text-zinc-500 uppercase tracking-widest">SKUs</span>
               </h3>
               <div className="mt-4 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black rounded-lg border border-brand-500/20 uppercase tracking-widest">Catálogo Activo</span>
               </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-brand-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
         </div>

         {/* Card: Stock Crítico */}
         <div className="relative group overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 transition-all hover:border-red-500/50 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-all duration-700">
               <AlertTriangle size={80} className="text-red-500" />
            </div>
            <div className="relative z-10">
               <div className="h-12 w-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <ArrowUpRight className="text-red-500" size={24} />
               </div>
               <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-1">Riesgo de Quiebre</p>
               <h3 className="text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tighter leading-none">
                  {metrics.criticalStock} <span className="text-sm text-zinc-500 uppercase tracking-widest">Alertas</span>
               </h3>
               <div className="mt-4 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded-lg border uppercase tracking-widest ${metrics.criticalStock > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-500/10 text-zinc-500 border-white/5'}`}>
                     {metrics.criticalStock > 0 ? 'Reposición Urgente' : 'Stock Saludable'}
                  </span>
               </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
         </div>
      </div>
      
      {/* HEADER ACCIONES */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-4 flex-1">
          <div className="relative group max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Rastrear producto por nombre, SKU o tag..."
              className="w-full pl-12 pr-4 h-14 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none shadow-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
             <div className="bg-zinc-100 dark:bg-white/5 p-1 rounded-xl flex border border-zinc-200 dark:border-white/5 shadow-sm">
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Lista</button>
                <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Mosaico</button>
             </div>
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-2 italic opacity-60">Visualizando {filteredProducts?.length || 0} Entidades</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-sm">
            <button 
              onClick={() => setIsHistoryModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-amber-500 transition-all hover:bg-white dark:hover:bg-white/5"
            >
              <History size={14} /> VER INGRESOS
            </button>
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <button 
              onClick={handleExportExcel} 
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-brand-500 transition-all hover:bg-white dark:hover:bg-white/5"
            >
              <Download size={14} /> EXCEL
            </button>
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <button 
              onClick={() => setIsImportModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-brand-500 transition-all hover:bg-white dark:hover:bg-white/5"
            >
              <Upload size={14} /> IMPORTAR
            </button>
          </div>
          <Button icon={Plus} onClick={() => setIsAddModalOpen(true)} size="lg" className="px-8 shadow-2xl shadow-brand-500/20 glow-blue">
            AÑADIR PRODUCTO
          </Button>
        </div>
      </div>

      {/* MODALS */}
      {isImportModalOpen && (
        <BulkImport 
          onComplete={() => setIsImportModalOpen(false)} 
          onClose={() => setIsImportModalOpen(false)} 
        />
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up border border-gray-200 dark:border-slate-800">
              
              {/* Encabezado Fijo */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                <div>
                   <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                     {editingProduct ? 'Modificar Entidad Existente' : 'Nuevo Registro de Entidad'}
                   </h3>
                   <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-widest">
                     {editingProduct ? `Editando ID: ${editingProduct.id.split('-')[0]}` : 'Protocolo de Alta de Mercancía'} / Retail Hardware v4.8
                   </p>
                </div>
                <button 
                   onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Cuerpo del Formulario (Scroll Interno) */}
              <div className="overflow-y-auto p-6 sm:p-10 flex-1 custom-scrollbar">
                <form id="add-product-form" onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  
                  {/* Fila 1: Denominación (Ancho Completo) */}
                  <div className="md:col-span-2">
                    <Input 
                      label="Denominación del Producto" 
                      placeholder="Ej. ARROZ PREMIUM GOURMET 1KG" 
                      required 
                      autoFocus
                      value={newProduct.name} 
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} 
                      icon={Package} 
                      className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-lg py-6 focus:border-blue-500 focus:ring-0"
                    />
                  </div>

                  {/* Fila 2: SKU y Categoría */}
                  <Input 
                    label="SKU / Identificador" 
                    placeholder="SKU-0000" 
                    value={newProduct.sku} 
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} 
                    icon={Hash} 
                    className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                  />
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-gray-600 dark:text-slate-400 ml-1 uppercase tracking-widest">Categoría / Segmento</label>
                    <select 
                      className="w-full h-11 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-brand-500 transition-all appearance-none"
                      required value={newProduct.category_id || ''} onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Seleccionar...</option>
                      {(categories || []).map(c => ( <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">{c.name}</option> ))}
                    </select>
                  </div>

                  {/* Fila 3: Precio y Tipo de Venta */}
                  <Input 
                    label="P.V.P Actual" 
                    type="number" 
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                    required 
                    value={newProduct.price} 
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} 
                    icon={DollarSign} 
                    className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-bold"
                  />
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-gray-600 dark:text-slate-400 ml-1 uppercase tracking-widest">Unidad de Medida</label>
                    <div className="flex bg-gray-100 dark:bg-slate-800/80 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
                      <button 
                        type="button"
                        onClick={() => setNewProduct({...newProduct, is_weighted: false, unit: 'unid'})}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${!newProduct.is_weighted ? 'bg-white dark:bg-blue-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-300'}`}
                      >
                         Unidades
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewProduct({...newProduct, is_weighted: true, unit: 'kg'})}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${newProduct.is_weighted ? 'bg-white dark:bg-emerald-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-300'}`}
                      >
                         Granel (kg)
                      </button>
                    </div>
                  </div>

                  {/* Fila 4: Stock y Alerta */}
                  <Input 
                    label="Existencia Inicial" 
                    type="number" 
                    min="0"
                    step={newProduct.is_weighted ? "0.01" : "1"} 
                    placeholder="0" 
                    required 
                    value={newProduct.stock} 
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} 
                    icon={LayoutGrid} 
                    className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-bold"
                  />
                  <Input 
                    label="Alerta de Stock Bajo" 
                    type="number" 
                    min="0"
                    step="1"
                    placeholder="5" 
                    value={newProduct.min_stock} 
                    onChange={(e) => setNewProduct({...newProduct, min_stock: e.target.value})} 
                    className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-bold"
                  />

                  {/* Fila 5: Escáner Barcode (Ancho Completo) */}
                  <div className="md:col-span-2">
                    <Input 
                      label="Código de Barras (Escaneado Láser)" 
                      placeholder="Escanee el barcode del producto..." 
                      value={newProduct.barcode || ''} 
                      onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                      icon={Scan}
                      className="bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-mono text-xs"
                    />
                  </div>
                </form>
              </div>

              {/* Acciones Finales (Fijas al fondo) */}
              <div className="px-6 py-5 border-t border-gray-100 dark:border-slate-800 flex gap-4 bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <button 
                  onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                  type="button"
                  className="flex-1 h-12 text-[10px] font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 uppercase tracking-[0.2em] transition-all rounded-xl border border-gray-200 dark:border-slate-700"
                >
                  Cancelar Operación
                </button>
                <button 
                  form="add-product-form"
                  type="submit" 
                  className="flex-[1.5] h-12 text-[10px] font-bold text-white bg-brand-500 hover:bg-brand-600 uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-3 border-none"
                >
                  {editingProduct ? <Edit2 size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />} 
                  {editingProduct ? 'Guardar Cambios' : 'Sincronizar en Red'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* PRODUCT LIST */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-zinc-100/50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5"> </Card>)}
        </div>
      ) : viewMode === 'list' ? (
        <Card className="p-0 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-white/5 overflow-hidden shadow-2xl relative rounded-[2.5rem] backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em]">Producto / Entidad</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] hidden md:table-cell">ID Logístico</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] hidden md:table-cell">Categoría</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] text-right">Precio / Medida</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] text-center">Stock Disponible</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-brand-500/5 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-white/5 group-hover:scale-110 group-hover:border-brand-500/30 transition-all duration-300 shadow-sm">
                           <Package className="h-6 w-6 text-zinc-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                        <span className="font-outfit font-black text-sm text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white uppercase tracking-tight">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-zinc-500 dark:text-zinc-500 text-xs font-mono tracking-widest hidden md:table-cell">{p.sku || 'N/A'}</td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-brand-500/10 text-brand-500 rounded-lg border border-brand-500/20 shadow-sm shadow-brand-500/5">
                        {getCategoryName(p.category_id)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white font-outfit text-base tracking-tighter">
                      ${p.price.toLocaleString()} <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase ml-1 italic">/ {p.is_weighted ? 'KG' : 'UND'}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-mono text-sm font-black ${p.stock <= p.min_stock ? 'text-red-500 animate-pulse' : 'text-zinc-600 dark:text-zinc-300'}`}>
                          {p.is_weighted ? Number(p.stock || 0).toFixed(3) : (p.stock || 0)}
                        </span>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{p.is_weighted ? 'KG' : 'UND'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenMerma(p)}
                          title="Registrar Merma"
                          className="p-2.5 bg-zinc-100 dark:bg-white/5 text-orange-500 hover:bg-orange-500/10 rounded-xl border border-transparent hover:border-orange-500/20 transition-all cursor-pointer"
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(p)}
                          className="p-2.5 bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl border border-transparent hover:border-brand-500/20 transition-all cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2.5 bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center opacity-30">
               <Package size={60} strokeWidth={1} className="mb-4" />
               <p className="font-black uppercase tracking-[0.4em] text-[10px]">No se detectaron registros en el radar</p>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((p) => (
            <Card key={p.id} className="group bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-white/5 hover:border-brand-500/40 hover:-translate-y-2 transition-all p-6 relative overflow-hidden rounded-[2.5rem] backdrop-blur-xl">
              <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-brand-500/5 blur-[50px] rounded-full group-hover:bg-brand-500/10 transition-all pointer-events-none" />
              
              <div className="aspect-[4/3] bg-zinc-50 dark:bg-black/40 rounded-[2rem] mb-5 flex items-center justify-center relative shadow-inner overflow-hidden border border-zinc-200 dark:border-white/5">
                <Package className="h-16 w-16 text-zinc-200 dark:text-zinc-800 group-hover:scale-110 group-hover:text-brand-500/20 transition-all duration-700" />
                <div className="absolute top-4 right-4">
                   <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${p.stock > p.min_stock ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'}`}>
                      {p.stock > p.min_stock ? 'Operativo' : 'Crítico'}
                   </div>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest opacity-80">{getCategoryName(p.category_id)}</p>
                <h3 className="font-outfit font-black text-lg text-zinc-900 dark:text-white uppercase tracking-tight truncate leading-tight">{p.name}</h3>
                <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tracking-widest">{p.sku || 'N/A'}</p>
              </div>

              <div className="flex items-end justify-between border-t border-zinc-100 dark:border-white/5 pt-5 mt-auto mb-4">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Precio Mercado</span>
                   <span className="text-2xl font-black text-brand-500 font-outfit tracking-tighter leading-none">${p.price.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Disponible</span>
                   <span className="text-sm font-black text-zinc-800 dark:text-zinc-300 font-mono italic leading-none">{p.stock} <span className="text-zinc-400 dark:text-zinc-600 text-[10px] non-italic">{p.unit}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-10">
                 <button 
                   onClick={() => handleOpenMerma(p)}
                   className="w-full py-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-1.5"
                 >
                   <AlertTriangle size={12} /> Merma
                 </button>
                 <button 
                   onClick={() => handleEdit(p)}
                   className="w-full py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                 >
                   <Edit2 size={12} /> Editar
                 </button>
              </div>

              <div className="absolute bottom-0 left-0 h-1.5 w-0 bg-brand-500 group-hover:w-full transition-all duration-700" />
            </Card>
          ))}
        </div>
      )}
      {/* MODAL KARDEX: TRAZABILIDAD INBOUND */}
      {isHistoryModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
               
               <div className="px-10 py-8 border-b border-white/5 bg-slate-50/50 dark:bg-zinc-950/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <History size={20} />
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-outfit">Auditoría Kárdex</h3>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Trazabilidad Absoluta de Inventario</p>
                       </div>
                    </div>
                    <button 
                       onClick={() => setIsHistoryModalOpen(false)}
                       className="p-3 text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-all absolute top-6 right-6"
                    >
                       <X size={20} />
                    </button>
                  </div>
                  
                  {/* FILTROS KÁRDEX */}
                  <div className="mt-6 flex flex-col md:flex-row gap-3">
                     <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input 
                           type="text"
                           placeholder="Buscar por producto..."
                           className="w-full h-11 pl-12 pr-4 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                           onChange={(e) => {
                             // Usar un estado local si fuera complejo, pero por limpieza lo filtramos directamente al vuelo después
                             // Por ahora, aplicamos un id al input genérico de búsqueda o creamos estados
                           }}
                           id="kardex-search"
                        />
                     </div>
                     <select 
                       className="h-11 px-4 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                       id="kardex-type"
                     >
                       <option value="ALL">Todos los Movimientos</option>
                       <option value="IN">Entradas (IN)</option>
                       <option value="SALE">Ventas (SALE)</option>
                       <option value="OUT">Salidas/Ajustes (OUT)</option>
                     </select>
                     <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input 
                           type="date"
                           className="h-11 pl-12 pr-4 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                           value={historyDate}
                           onChange={(e) => setHistoryDate(e.target.value)}
                        />
                     </div>
                  </div>
               </div>

               <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5">
                           <th className="py-4 text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-4">Fecha / Hora</th>
                           <th className="py-4 text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Producto</th>
                           <th className="py-4 text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Tipo</th>
                           <th className="py-4 text-right text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pr-4">Cantidad</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {inventoryMovements?.length > 0 ? (
                           inventoryMovements
                             .filter(m => {
                                const term = (document.getElementById('kardex-search') as HTMLInputElement)?.value.toLowerCase() || '';
                                const typeStr = (document.getElementById('kardex-type') as HTMLSelectElement)?.value || 'ALL';
                                const matchesSearch = (m.product_name || '').toLowerCase().includes(term);
                                const matchesType = typeStr === 'ALL' || m.movement_type === typeStr;
                                return matchesSearch && matchesType;
                             })
                             .map((m, idx) => {
                               let badgeColors = "bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
                               let badgeLabel = m.movement_type || "DESCONOCIDO";
                               let mathPrefix = "";

                               if (m.movement_type === 'IN') { 
                                  badgeColors = "bg-green-100 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20"; 
                                  badgeLabel = "ENTRADA"; 
                                  mathPrefix = "+";
                               }
                               else if (m.movement_type === 'SALE' || m.movement_type === 'OUT') { 
                                  badgeColors = "bg-red-100 text-red-700 border-red-200 dark:bg-rose-500/10 dark:text-rose-500 dark:border-rose-500/20"; 
                                  badgeLabel = m.movement_type === 'SALE' ? "VENTA" : "SALIDA"; 
                               }
                               else if (m.movement_type === 'ADJUST') { 
                                  badgeColors = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20"; 
                                  badgeLabel = "AJUSTE"; 
                                  mathPrefix = m.quantity_added > 0 ? "+" : "";
                               }

                               return (
                                 <tr key={m.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-4 pl-4">
                                       <p className="text-xs font-bold text-slate-900 dark:text-white">
                                          {new Date(m.created_at).toLocaleDateString()}
                                       </p>
                                       <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                                          {new Date(m.created_at).toLocaleTimeString()}
                                       </p>
                                    </td>
                                    <td className="py-4">
                                       <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                          {m.product_name || 'Desconocido'}
                                       </p>
                                    </td>
                                    <td className="py-4">
                                       <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${badgeColors}`}>
                                          {badgeLabel}
                                       </span>
                                    </td>
                                    <td className="py-4 text-right pr-4">
                                       <span className={`text-xl font-black tracking-tighter ${m.movement_type === 'IN' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                          {mathPrefix}{m.quantity_added}
                                       </span>
                                    </td>
                                 </tr>
                               );
                             })
                        ) : (
                           <tr>
                              <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                                 No hay movimientos en esta fecha
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {/* MODAL DE MERMA */}
      {isMermaModalOpen && selectedMermaProduct && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-fade-in flex flex-col">
               <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-orange-50 dark:bg-orange-500/5">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 bg-orange-100 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center rounded-xl">
                        <AlertTriangle size={20} />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Registrar Merma</h3>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest">{selectedMermaProduct.name}</p>
                     </div>
                  </div>
                  <button onClick={() => setIsMermaModalOpen(false)} className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all">
                     <X size={16} />
                  </button>
               </div>
               <form onSubmit={handleMermaSubmit} className="p-6 space-y-5">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">Stock Actual</label>
                     <p className="text-xl font-black text-slate-900 dark:text-white font-mono">{selectedMermaProduct.stock} {selectedMermaProduct.unit}</p>
                  </div>
                  <div className="space-y-3">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-1.5 block">Cantidad a Descontar</label>
                        <Input
                           type="number"
                           step={selectedMermaProduct.is_weighted ? "0.001" : "1"}
                           value={mermaData.quantity}
                           onChange={(e) => setMermaData({...mermaData, quantity: e.target.value})}
                           placeholder="Ej. 1.5"
                           autoFocus
                           required
                           className="text-lg font-black"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-1.5 block">Motivo</label>
                        <select
                           value={mermaData.reason}
                           onChange={(e) => setMermaData({...mermaData, reason: e.target.value})}
                           className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-bold text-slate-900 dark:text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                        >
                           <option value="Vencido">Vencido</option>
                           <option value="Dañado">Dañado</option>
                           <option value="Defecto de fábrica">Defecto de fábrica</option>
                           <option value="Robo / Extravío">Robo / Extravío</option>
                           <option value="Otro">Otro</option>
                        </select>
                     </div>
                  </div>
                  <div className="pt-4 grid grid-cols-2 gap-3">
                     <Button type="button" variant="outline" onClick={() => setIsMermaModalOpen(false)} className="w-full">
                        Cancelar
                     </Button>
                     <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20 uppercase tracking-widest text-[10px] font-black">
                        Confirmar Baja
                     </Button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};
