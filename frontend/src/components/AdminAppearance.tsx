import React, { useState, useEffect } from 'react';
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
import { useOrganizationStore } from '../store/useOrganizationStore';

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
  const { organization, updateOrganization } = useOrganizationStore();
  
  const [accentColor, setAccentColor] = useState(organization?.theme_color || '#3b82f6');
  const [colorMode, setColorMode] = useState(organization?.theme_style || 'solid');
  const [secondaryColor, setSecondaryColor] = useState(organization?.theme_secondary_color || '#8b5cf6');
  const [borderRadius, setBorderRadius] = useState(localStorage.getItem('admin_border_radius') || '1.5rem');
  const [uiStyle, setUiStyle] = useState(localStorage.getItem('admin_ui_style') || 'glass');
  const [activeFont, setActiveFont] = useState(localStorage.getItem('admin_font') || 'Plus Jakarta Sans');
  const [sidebarStyle, setSidebarStyle] = useState(localStorage.getItem('admin_sidebar') || 'expanded');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estados locales cuando la organización cargue
  useEffect(() => {
    if (organization) {
      setAccentColor(organization.theme_color || '#3b82f6');
      setColorMode(organization.theme_style || 'solid');
      setSecondaryColor(organization.theme_secondary_color || '#8b5cf6');
    }
  }, [organization]);

  // Sincronizar estado inicial al montar
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', accentColor);
    document.documentElement.style.setProperty('--font-sans', `"${activeFont}", sans-serif`);
    document.documentElement.style.setProperty('--radius-2xl', borderRadius);
    
    if (colorMode === 'gradient') {
      document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
      document.body.classList.add('theme-gradient');
    } else {
      document.body.classList.remove('theme-gradient');
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Guardar en Base de Datos (Persistencia Real)
      await updateOrganization({
        theme_color: accentColor,
        theme_style: colorMode as 'solid' | 'gradient',
        theme_secondary_color: secondaryColor
      });

      // 2. Guardar en LocalStorage (Cache & UI instantánea)
      localStorage.setItem('admin_accent_color', accentColor);
      localStorage.setItem('admin_color_mode', colorMode);
      localStorage.setItem('admin_secondary_color', secondaryColor);
      localStorage.setItem('admin_border_radius', borderRadius);
      localStorage.setItem('admin_ui_style', uiStyle);
      localStorage.setItem('admin_font', activeFont);
      localStorage.setItem('admin_sidebar', sidebarStyle);
      
      // 3. Aplicar al DOM
      document.documentElement.style.setProperty('--brand-primary', accentColor);
      document.documentElement.style.setProperty('--radius-2xl', borderRadius);
      
      if (colorMode === 'gradient') {
        document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
        document.body.classList.add('theme-gradient');
      } else {
        document.documentElement.style.setProperty('--brand-secondary', `color-mix(in srgb, ${accentColor}, black 15%)`);
        document.body.classList.remove('theme-gradient');
      }

      document.documentElement.style.setProperty('--font-sans', `"${activeFont}", sans-serif`);
      
      toast.success('Identidad visual sincronizada con la nube');
    } catch (error) {
      toast.error('Error al persistir la marca');
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewBrandBg = () => {
    if (colorMode === 'gradient') {
      return { backgroundImage: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` };
    }
    return { backgroundColor: accentColor };
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
          <Button variant="ghost" icon={Undo} onClick={() => window.location.reload()} className="h-12 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest text-muted-foreground">Resetear</Button>
          <Button onClick={handleSave} loading={isSaving} icon={Save} className="h-12 px-8 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-brand-600 shadow-xl shadow-brand-600/20 text-white border-none">Aplicar Cambios</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* CONFIGURATION COLUMN */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* Accent Color Selection */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Palette size={16} className="text-brand-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Paleta de Identidad</h3>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modo de Relleno</p>
              <div className="flex gap-3">
                {[
                  { id: 'solid', name: 'Sólido', icon: Layers },
                  { id: 'gradient', name: 'Difuminado', icon: Sparkles }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setColorMode(mode.id)}
                    className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${
                      colorMode === mode.id ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-border text-muted-foreground hover:border-brand-500/30'
                    }`}
                  >
                    <mode.icon size={14} />
                    {mode.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Color Primario</p>
                <div className="flex gap-4 items-center">
                  <div className="relative group">
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-16 w-16 rounded-2xl cursor-pointer bg-card border-2 border-border p-1 shadow-lg group-hover:border-brand-500/50 transition-all"
                    />
                    <div className="absolute -bottom-2 -left-2 px-2 py-0.5 bg-black text-white text-[8px] font-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">CUSTOM</div>
                  </div>
                  <div className="flex-1 grid grid-cols-6 gap-3">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setAccentColor(color.value)}
                        className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                          accentColor === color.value ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border hover:border-brand-500/30'
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-lg ${color.class} shadow-sm`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {colorMode === 'gradient' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 pt-4 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Color Secundario (Destino Gradiente)</p>
                  <div className="flex gap-4 items-center">
                    <div className="relative group">
                      <input 
                        type="color" 
                        value={secondaryColor} 
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-16 w-16 rounded-2xl cursor-pointer bg-card border-2 border-border p-1 shadow-lg group-hover:border-brand-500/50 transition-all"
                      />
                    </div>
                    <div className="flex-1 grid grid-cols-6 gap-3">
                      {ACCENT_COLORS.slice().reverse().map((color) => (
                        <button
                          key={`sec-${color.value}`}
                          onClick={() => setSecondaryColor(color.value)}
                          className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                            secondaryColor === color.value ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border hover:border-brand-500/30'
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-lg ${color.class} shadow-sm`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Geometría Atómica (Bordes)</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Recto', value: '0px' },
                { name: 'Suave', value: '1rem' },
                { name: 'Redondeado', value: '2rem' },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setBorderRadius(r.value)}
                  className={`h-12 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${
                    borderRadius === r.value ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-border text-muted-foreground hover:border-brand-500/30'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Layers size={16} className="text-brand-500" />
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
            
            <Card className={`p-0 overflow-hidden border-border shadow-2xl relative ${uiStyle === 'glass' ? 'backdrop-blur-2xl bg-white/40' : 'bg-card'}`} style={{fontFamily: activeFont, borderRadius}}>
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
                  <div className="h-8 w-8 rounded-xl shadow-lg" style={getPreviewBrandBg()} />
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
                    <div className="h-10 w-24 rounded-xl" style={getPreviewBrandBg()} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-card border border-border" style={{borderRadius: `calc(${borderRadius} / 1.5)`}} />
                    <div className="h-32 bg-card border border-border" style={{borderRadius: `calc(${borderRadius} / 1.5)`}} />
                  </div>
                  <div className="h-24 bg-card border border-border p-6 flex flex-col justify-end gap-2" style={{borderRadius: `calc(${borderRadius} / 1.5)`}}>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full" style={{width: '75%', ...getPreviewBrandBg()}} />
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
