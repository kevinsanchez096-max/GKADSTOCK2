import { useState } from 'react';
import { Card, Button } from './ui-components';
import { 
  Plus, 
  Trash2, 
  Layers, 
  Search,
  Tag,
  Pencil
} from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { useAuthStore } from '../store/useAuthStore';

export const CategoryManager = () => {
  const { profile } = useAuthStore();
  const { categories, addCategory, updateCategory, deleteCategory } = useShopStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const toTitleCase = (str: string) => {
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !profile?.organization_id) return;
    const sanitizedName = toTitleCase(newCategoryName.trim());
    
    if (editingId) {
      updateCategory(editingId, sanitizedName, profile.organization_id);
      setEditingId(null);
    } else {
      addCategory(sanitizedName, profile.organization_id);
    }
    setNewCategoryName('');
  };

  const handleEditInit = (id: string, currentName: string) => {
    setEditingId(id);
    setNewCategoryName(currentName);
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-slide-up flex-1 min-h-full flex flex-col">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black dark:text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
            <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20 text-brand-500">
              <Layers className="h-6 w-6" />
            </div>
            ARQUITECTURA DE INVENTARIO
          </h2>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] ml-1">Clasificación Lógica y Jerarquía de Productos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ADD CATEGORY FORM */}
        <Card className="lg:col-span-4 p-8 glass-dark border-brand-500/10 bg-brand-500/[0.02] h-fit rounded-[2.5rem] relative overflow-hidden shadow-2xl">
          <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-brand-500/5 blur-[60px] rounded-full pointer-events-none" />
          
          <h3 className="font-black text-white mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] opacity-50">
            {editingId ? 'EDICIÓN DE ETIQUETA' : 'SOLICITUD DE ALTA'}
          </h3>
          <form onSubmit={handleAdd} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nombre de Etiqueta</label>
              <div className="relative group">
                 <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-500 transition-colors" />
                 <input 
                    type="text" 
                    placeholder="Ej. Bebidas, SNACKs..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-sm font-black focus:ring-2 focus:ring-brand-500 transition-all dark:text-white outline-none placeholder:text-zinc-700 uppercase"
                 />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest glow-blue border border-brand-400/30 transition-all active:scale-95 shadow-xl shadow-brand-500/10" 
              icon={editingId ? Pencil : Plus}
              disabled={!newCategoryName.trim()}
            >
              {editingId ? 'GUARDAR CAMBIOS' : 'VINCULAR CATEGORÍA'}
            </Button>
          </form>
        </Card>

        {/* LIST OF CATEGORIES */}
        <Card className="lg:col-span-8 p-0 glass-dark border-white/5 shadow-2xl overflow-hidden rounded-[2.5rem]">
          <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="FILTRAR POR NOMBRE DE CLASIFICACIÓN..."
                className="w-full h-12 pl-14 pr-6 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest focus:ring-2 focus:ring-brand-500 transition-all dark:text-white outline-none placeholder:text-zinc-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto scrollbar-hide">
            {filteredCategories.length === 0 ? (
              <div className="py-32 text-center opacity-20">
                <Layers className="h-20 w-20 mx-auto mb-4 text-zinc-700" strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No se detectan coincidencias en la red</p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="p-6 px-8 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shadow-lg shadow-brand-500/5 group-hover:scale-110 transition-transform">
                      <Tag className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-black text-sm dark:text-zinc-100 uppercase tracking-tight font-outfit group-hover:text-white transition-colors">{category.name}</p>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest font-mono">UID: {category.id.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">ESTADO: ACTIVO</span>
                    <button 
                      onClick={() => handleEditInit(category.id, category.name)}
                      className="p-3 bg-white/5 text-zinc-600 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl border border-transparent hover:border-brand-500/20 transition-all"
                      title="Editar Categoría"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={() => profile && deleteCategory(category.id, profile.organization_id)}
                      className="p-3 bg-white/5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all"
                      title="Eliminar Categoría"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between px-8">
            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.5em]">CERTIFICACIÓN DE NODO GKAD CLOUD V.4.0</p>
            <div className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(0,136,255,0.5)] animate-pulse" />
          </div>
        </Card>
      </div>

    </div>
  );
};
