import React, { useState } from 'react';
import { 
  Palette, 
  Layers, 
  Check, 
  Sparkles,
  Layout,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from './ui-components';
import { toast } from 'sonner';

const colors = [
  { name: 'Azul (Default)', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Morado', value: '#8b5cf6', class: 'bg-purple-500' },
  { name: 'Verde', value: '#10b981', class: 'bg-emerald-500' },
  { name: 'Naranja', value: '#f59e0b', class: 'bg-orange-500' },
];

export const AdminAppearance = () => {
  const [accentColor, setAccentColor] = useState(localStorage.getItem('admin_accent_color') || '#3b82f6');
  const [uiStyle, setUiStyle] = useState(localStorage.getItem('admin_ui_style') || 'glass');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    // Guardar en Local Storage para persistencia inmediata en la sesión del Admin
    localStorage.setItem('admin_accent_color', accentColor);
    localStorage.setItem('admin_ui_style', uiStyle);
    
    // Aplicar color al :root
    document.documentElement.style.setProperty('--brand-primary', accentColor);
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Preferencias de apariencia actualizadas');
      // Forzar recarga ligera o notificación de cambio de estilo
    }, 800);
  };

  return (
    <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-light text-white font-outfit tracking-tight uppercase">Apariencia <span className="font-black text-brand-500">Visual</span></h1>
        <p className="text-white/20 font-bold text-[10px] uppercase tracking-[0.3em]">Personalización del Centro de Mando</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLOR DE ACENTO */}
        <div className={`p-10 rounded-[2.5rem] border ${uiStyle === 'solid' ? 'bg-zinc-900 border-zinc-800' : 'bg-white/[0.02] border-white/5 backdrop-blur-xl'}`}>
           <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500">
                 <Palette size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Color de Acento</h3>
           </div>

           <div className="grid grid-cols-2 gap-4">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    accentColor === color.value 
                    ? 'border-brand-500 bg-brand-500/5' 
                    : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                   <div className={`h-6 w-6 rounded-lg ${color.class} shadow-lg`} />
                   <span className="text-[10px] font-bold text-white/60 uppercase">{color.name}</span>
                   {accentColor === color.value && <Check size={14} className="ml-auto text-brand-500" />}
                </button>
              ))}
           </div>
        </div>

        {/* ESTILO DE INTERFAZ */}
        <div className={`p-10 rounded-[2.5rem] border ${uiStyle === 'solid' ? 'bg-zinc-900 border-zinc-800' : 'bg-white/[0.02] border-white/5 backdrop-blur-xl'}`}>
           <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500">
                 <Layout size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Estilo de Interfaz</h3>
           </div>

           <div className="space-y-4">
              <button
                onClick={() => setUiStyle('glass')}
                className={`w-full flex items-center justify-between p-6 rounded-3xl border transition-all ${
                  uiStyle === 'glass' 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                }`}
              >
                 <div className="flex items-center gap-4">
                    <Sparkles size={18} className={uiStyle === 'glass' ? 'text-brand-500' : 'text-white/20'} />
                    <div className="text-left">
                       <p className="text-[11px] font-black text-white uppercase tracking-widest">Difuminado</p>
                       <p className="text-[9px] text-white/20 font-medium">Glassmorphism & Blurs</p>
                    </div>
                 </div>
                 {uiStyle === 'glass' && <Check size={16} className="text-brand-500" />}
              </button>

              <button
                onClick={() => setUiStyle('solid')}
                className={`w-full flex items-center justify-between p-6 rounded-3xl border transition-all ${
                  uiStyle === 'solid' 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                }`}
              >
                 <div className="flex items-center gap-4">
                    <Layers size={18} className={uiStyle === 'solid' ? 'text-brand-500' : 'text-white/20'} />
                    <div className="text-left">
                       <p className="text-[11px] font-black text-white uppercase tracking-widest">Sólido</p>
                       <p className="text-[9px] text-white/20 font-medium">Fondo Opaco & Bordes</p>
                    </div>
                 </div>
                 {uiStyle === 'solid' && <Check size={16} className="text-brand-500" />}
              </button>
           </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSave}
          loading={isSaving}
          className="bg-brand-600 hover:bg-brand-700 text-white px-12 h-16 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20"
        >
          Guardar Preferencias
        </Button>
      </div>

      {/* PREVIEW CARD */}
      <div className="pt-12">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-6 text-center">Vista Previa</p>
        <div className="flex justify-center">
           <div className={`w-full max-w-sm p-8 border rounded-[2.5rem] ${uiStyle === 'solid' ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white/[0.03] border-white/10 backdrop-blur-xl'}`}>
              <div className="h-10 w-10 bg-brand-500 rounded-xl mb-6 shadow-lg shadow-brand-500/40 animate-pulse" />
              <div className="h-4 w-32 bg-white/20 rounded-full mb-3" />
              <div className="h-3 w-48 bg-white/5 rounded-full" />
           </div>
        </div>
      </div>
    </div>
  );
};
