import React, { useState } from 'react';
import { 
  Palette, 
  Layers, 
  Check, 
  Sparkles,
  Type,
  Layout,
  Moon,
  Sun,
  Monitor,
  Sidebar as SidebarIcon,
  Maximize2,
  Save,
  Undo
} from 'lucide-react';
import { Button, Card } from './ui-components';
import { toast } from 'sonner';

const ACCENT_COLORS = [
  { name: 'Azul Real', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Púrpura Elite', value: '#8b5cf6', class: 'bg-purple-500' },
  { name: 'Esmeralda', value: '#10b981', class: 'bg-emerald-500' },
  { name: 'Oro Ámbar', value: '#f59e0b', class: 'bg-amber-500' },
  { name: 'Rosa Velvet', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Negro Profundo', value: '#18181b', class: 'bg-zinc-900' },
];

const FONTS = [
  { name: 'Jakarta Sans', value: 'Plus Jakarta Sans', desc: 'Moderno & Geométrico' },
  { name: 'Inter Tight', value: 'Inter Tight', desc: 'Refinado & Corporativo' },
  { name: 'Outfit', value: 'Outfit', desc: 'Suave & Amigable' },
];

export const AdminAppearance = () => {
  const [accentColor, setAccentColor] = useState(localStorage.getItem('admin_accent_color') || '#3b82f6');
  const [uiStyle, setUiStyle] = useState(localStorage.getItem('admin_ui_style') || 'glass');
  const [activeFont, setActiveFont] = useState(localStorage.getItem('admin_font') || 'Plus Jakarta Sans');
  const [sidebarStyle, setSidebarStyle] = useState(localStorage.getItem('admin_sidebar') || 'expanded');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('admin_accent_color', accentColor);
    localStorage.setItem('admin_ui_style', uiStyle);
    localStorage.setItem('admin_font', activeFont);
    localStorage.setItem('admin_sidebar', sidebarStyle);
    
    document.documentElement.style.setProperty('--brand-primary', accentColor);
    document.documentElement.style.setProperty('--font-sans', `"${activeFont}", sans-serif`);
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Estética del sistema actualizada con éxito');
    }, 1000);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* 1. HEADER INTEGRADO */}
      <div className="flex items-end justify-between border-b border-border pb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-foreground font-heading tracking-tight uppercase italic">Estética <span className="font-black text-brand-500 not-italic">Visual</span></h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.4em]">Personalización de la Experiencia Maestro</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" icon={Undo} className="h-12 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest text-muted-foreground">Resetear</Button>
          <Button onClick={handleSave} loading={isSaving} icon={Save} className="h-12 px-8 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-brand-600 shadow-xl shadow-brand-600/20 text-white border-none">Aplicar Cambios</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* CONFIGURATION COLUMN */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* Accent Color Selection */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Palette size={16} className="text-brand-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Paleta de Identidad</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  className={`group relative h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    accentColor === color.value ? 'border-brand-500 bg-brand-500/5' : 'border-border hover:border-brand-500/30'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full ${color.class} shadow-lg shadow-${color.class.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`} />
                  {accentColor === color.value && (
                    <div className="absolute -top-2 -right-2 h-5 w-5 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Selection */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Type size={16} className="text-brand-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Sistemas Tipográficos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setActiveFont(font.value)}
                  className={`p-6 rounded-[2rem] border-2 text-left transition-all ${
                    activeFont === font.value ? 'border-brand-500 bg-brand-500/5' : 'border-border hover:border-brand-500/30'
                  }`}
                >
                  <p className="text-2xl font-black text-foreground mb-1" style={{fontFamily: font.value}}>{font.name[0]}</p>
                  <p className="text-[10px] font-black text-foreground uppercase tracking-widest">{font.name}</p>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{font.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interface Style */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Layout size={16} className="text-brand-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Estilo de Componentes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'glass', name: 'Ultra Difuminado', desc: 'Glassmorphism Premium V5', icon: Sparkles },
                { id: 'solid', name: 'Arquitectura Sólida', desc: 'Minimalismo & Bordes Definidos', icon: Layers },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setUiStyle(style.id)}
                  className={`p-8 rounded-[2.5rem] border-2 text-left transition-all flex items-start gap-6 ${
                    uiStyle === style.id ? 'border-brand-500 bg-brand-500/5 shadow-2xl shadow-brand-500/5' : 'border-border hover:border-brand-500/30'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${uiStyle === style.id ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    <style.icon size={24} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-foreground uppercase tracking-widest">{style.name}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{style.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PREVIEW COLUMN */}
        <div className="lg:col-span-5 space-y-8">
          <div className="sticky top-10">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-6 text-center">Simulador de Experiencia</p>
            
            <Card className={`p-0 overflow-hidden border-border shadow-2xl relative ${uiStyle === 'glass' ? 'backdrop-blur-2xl bg-white/40' : 'bg-card'}`} style={{fontFamily: activeFont}}>
              <div className="h-12 bg-muted/30 border-b border-border flex items-center px-6 justify-between">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/50" />
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <Monitor size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Master Preview</span>
                </div>
              </div>

              <div className="flex h-[400px]">
                {/* Sidebar Preview */}
                <div className={`w-16 border-r border-border flex flex-col items-center py-6 gap-6 ${uiStyle === 'glass' ? 'bg-white/10' : 'bg-muted/10'}`}>
                  <div className="h-8 w-8 rounded-xl bg-brand-500 shadow-lg shadow-brand-500/30" />
                  <div className="space-y-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-6 w-6 rounded-lg bg-muted-foreground/10" />)}
                  </div>
                </div>
                {/* Content Preview */}
                <div className="flex-1 p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-foreground/10 rounded-full" />
                      <div className="h-3 w-48 bg-muted-foreground/10 rounded-full" />
                    </div>
                    <div className="h-10 w-24 bg-brand-500 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-card border border-border rounded-3xl" />
                    <div className="h-32 bg-card border border-border rounded-3xl" />
                  </div>
                  <div className="h-24 bg-card border border-border rounded-3xl p-6 flex flex-col justify-end gap-2">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{width: '75%'}} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <Button variant="outline" icon={SidebarIcon} className="h-14 rounded-2xl text-[9px] font-black uppercase tracking-widest border-border">Panel Colapsado</Button>
              <Button variant="outline" icon={Maximize2} className="h-14 rounded-2xl text-[9px] font-black uppercase tracking-widest border-border">Modo Fullscreen</Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
