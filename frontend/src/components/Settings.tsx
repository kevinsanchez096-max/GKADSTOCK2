import { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui-components';
import { 
 Building2, 
 MapPin, 
 Phone, 
 Mail, 
 Globe, 
 Save, 
 Receipt, 
 Palette, 
 User, 
 Image as ImageIcon,
 FileText,
 CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { GlobalPlatformSettings } from './GlobalPlatformSettings';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { X, Loader2, History, Lock, Layers, Upload, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRef } from 'react';
import { GkadLogo } from './GkadLogo';

export const Settings = () => {
 const { user, profile } = useAuthStore();
 const { organization, updateOrganization, isLoading: isOrgLoading } = useOrganizationStore();
 const fileInputRef = useRef<HTMLInputElement>(null);
 
  const [activeTab, setActiveTab] = useState<'business' | 'billing' | 'ticket' | 'account'>('business');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
 const [showLogsModal, setShowLogsModal] = useState(false);
 const [isUploading, setIsUploading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [showSaved, setShowSaved] = useState(false);

 // 1. NORMALIZACIÓN DE ESTADO (Single Source of Truth)
 const [formData, setFormData] = useState({
 company_name: '',
 primary_address: '',
 phone_number: '',
 corporate_email: '',
 tax_percentage: 19,
 currency: 'COP',
 billing_resolution: '',
 footer_message: '',
 logo_url: '',
 legal_representative: '',
 tax_id: '',
 theme_color: '',
 theme_secondary_color: '',
 theme_style: 'solid'
 });

 const isSuperAdmin = profile?.role === 'super_admin';
  
  // 1.5 LIVE PREVIEW: Aplicar cambios de formData al DOM localmente antes de guardar
  useEffect(() => {
    if (formData.theme_color) {
      document.documentElement.style.setProperty('--brand-primary', formData.theme_color);
    }
    if (formData.theme_secondary_color) {
      document.documentElement.style.setProperty('--brand-secondary', formData.theme_secondary_color);
    }
    if (formData.theme_style === 'gradient') {
      document.body.classList.add('theme-gradient');
    } else {
      document.body.classList.remove('theme-gradient');
    }
  }, [formData.theme_color, formData.theme_secondary_color, formData.theme_style]);

 // Sincronizar localmente cuando la organización cambie (Realtime o Fetch)
 useEffect(() => {
 if (organization) {
 setFormData({
 company_name: organization.company_name || '',
 primary_address: organization.primary_address || '',
 phone_number: organization.phone_number || '',
 corporate_email: organization.corporate_email || '',
 tax_percentage: organization.tax_percentage || 0,
 currency: organization.currency || 'COP',
 billing_resolution: organization.billing_resolution || '',
 footer_message: organization.footer_message || '',
 logo_url: organization.logo_url || '',
 legal_representative: organization.legal_representative || '',
 tax_id: organization.tax_id || '',
 theme_color: organization.theme_color || '#3b82f6',
 theme_secondary_color: organization.theme_secondary_color || '#2563eb',
 theme_style: organization.theme_style || 'solid',
 });
 }
 }, [organization]);

 const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 2 * 1024 * 1024) return toast.error('El archivo excede los 2MB');
 if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
 return toast.error('Formato no soportado (Solo JPG, PNG o SVG)');
 }

 setIsUploading(true);
 const toastId = toast.loading('Sincronizando logo corporativo...');
 
 try {
 const uploadData = new FormData();
 uploadData.append('logo', file);

 const response = await api.post('/auth/upload-logo', uploadData);
 const publicUrl = response.logo_url;

 if (!publicUrl) throw new Error('No se recibió la URL del logo');

 // Actualización directa al Store Organizacional
 await updateOrganization({ logo_url: publicUrl });
 toast.success('Branding actualizado', { id: toastId });
 } catch (error: any) {
 toast.error('Error al subir imagen: ' + error.message, { id: toastId });
 } finally {
 setIsUploading(false);
 }
 };

 const handleSave = async () => {
 setIsSaving(true);
 try {
 // Sincronización Enterprise: Se envía todo el payload normalizado
 await updateOrganization(formData);
 
 setShowSaved(true);
 setTimeout(() => setShowSaved(false), 3000);
 } catch (error) {
 // El store ya maneja el rollback visual y el toast de error
 } finally {
 setIsSaving(false);
 }
 };

 const handleTestPrint = () => {
 // Generar datos ficticios para el ticket de prueba
 const testData = {
 items: [
 { name: 'Producto de Prueba V5', price: 45000, quantity: 1, unit: 'unid', is_weighted: false },
 { name: 'Articulo Premium x 3', price: 12500, quantity: 3, unit: 'unid', is_weighted: false }
 ],
 subtotal: 82500,
 total: 82500,
 discount: 0,
 paymentMethod: 'Efectivo',
 amountReceived: 100000,
 change: 17500,
 date: new Date().toLocaleString('es-CO')
 };

 // Crear un iframe temporal para la impresión (método limpio)
 const printWindow = window.open('', '_blank');
 if (!printWindow) return toast.error('Bloqueador de ventanas detectado. Por favor permite popups.');

 const logoHtml = formData.logo_url 
 ? `<div style="text-align: center; margin-bottom: 5mm;">
 <img src="${formData.logo_url}"style="
 max-height: 28mm; 
 max-width: 50mm; 
 border-radius: 50%; 
 box-shadow: 0 0 10px rgba(0,0,0,0.1);
 filter: drop-shadow(0 0 3px rgba(0,0,0,0.05));
 object-fit: contain;
"/>
 </div>` 
 : '';

 printWindow.document.write(`
 <html>
 <head>
 <title>Prueba de Impresión - GKAD STOCK</title>
 <style>
 @page { margin: 0; size: 80mm auto; }
 body { 
 font-family: 'Courier New', Courier, monospace; 
 width: 80mm; 
 padding: 5mm; 
 margin: 0 auto; 
 font-size: 12px; 
 color: black;
 }
 .center { text-align: center; }
 .divider { border-top: 1px dashed black; margin: 3mm 0; }
 .row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
 .bold { font-weight: bold; }
 .total { font-size: 16px; border-top: 2px solid black; padding-top: 2mm; margin-top: 3mm; }
 .footer { margin-top: 8mm; font-size: 10px; border-top: 1px solid #ccc; padding-top: 3mm; }
 </style>
 </head>
 <body>
 <div class="center">
 ${logoHtml}
 <h1 style="font-size: 18px; margin: 0;">${formData.company_name || 'GKAD STOCK'}</h1>
 <p style="margin: 2mm 0;">${formData.primary_address || 'Calle 123 #45-67, Bogotá'}</p>
 <p>Nit: ${formData.tax_id || '900.567.890-1'}</p>
 <p>Tel: ${formData.phone_number || '300 000 0000'}</p>
 </div>
 
 <div class="divider"></div>
 <p class="bold">TICKET DE PRUEBA: #${Math.floor(Math.random() * 9999)}</p>
 <p>FECHA: ${testData.date}</p>
 <div class="divider"></div>
 
 <div class="row bold">
 <span>DESCRIPCIÓN</span>
 <span>TOTAL</span>
 </div>
 
 ${testData.items.map(item => `
 <div style="margin-top: 2mm;">
 <div class="row bold">
 <span>${item.name.toUpperCase()}</span>
 <span>$${(item.price * item.quantity).toLocaleString()}</span>
 </div>
 <div class="row">
 <span>${item.quantity} ${item.unit} x $${item.price.toLocaleString()}</span>
 </div>
 </div>
 `).join('')}
 
 <div class="divider"style="margin-top: 4mm;"></div>
 <div class="row"><span>SUBTOTAL:</span><span>$${testData.subtotal.toLocaleString()}</span></div>
 <div class="row"><span>IVA:</span><span>$0</span></div>
 <div class="row total bold"><span>TOTAL:</span><span>$${testData.total.toLocaleString()}</span></div>
 
 <div class="divider"></div>
 <div class="row"><span>RECIBIDO:</span><span>$${testData.amountReceived.toLocaleString()}</span></div>
 <div class="row bold"><span>SU CAMBIO:</span><span>$${testData.change.toLocaleString()}</span></div>
 
 <div class="center footer">
 <p class="bold"style="font-size: 11px;">${formData.footer_message || '¡GRACIAS POR SU COMPRA! VUELVA PRONTO'}</p>
 <p style="font-size: 8px; margin-top: 2mm;">GKAD STOCK POS - Sistema de Control V5</p>
 </div>

 <script>
 window.onload = function() {
 window.print();
 setTimeout(() => { window.close(); }, 500);
 };
 </script>
 </body>
 </html>
 `);
 printWindow.document.close();
 };



 return (
 <div className="max-w-6xl mx-auto space-y-10 animate-slide-up">
 
    {/* 1. MISSION CONTROL HEADER */}
    <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
      {/* Decorative elements */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
      <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"/>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"/>
            <Building2 size={18} className="text-brand-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Configuración del Sistema</span>
          </div>
          <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
            Panel de <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Control</span>
          </h1>
          <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Personalización de Experiencia y Datos Operativos</p>
        </div>

        <div className="flex items-center gap-6">
          <Button 
            onClick={handleSave}
            icon={showSaved ? CheckCircle2 : Save}
            loading={isSaving}
            className={`h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-2xl border-none ${
              showSaved 
                ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                : 'bg-brand-500 text-white shadow-brand-500/20 hover:bg-brand-600'
            }`}
          >
            {showSaved ? 'Sincronizado' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </Card>

 <div className="flex flex-col lg:flex-row gap-10">
 
  {/* TABS NAVIGATION */}
  <aside className="w-full lg:w-72 space-y-2">
  {isSuperAdmin && <TabButton active={activeTab === 'platform'} onClick={() => setActiveTab('platform')} icon={Layers} label="Plataforma"/>}
  <TabButton active={activeTab === 'business'} onClick={() => setActiveTab('business')} icon={Building2} label="Empresa"/>
  <TabButton active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={Receipt} label="Facturación"/>
  <TabButton active={activeTab === 'ticket'} onClick={() => setActiveTab('ticket')} icon={FileText} label="Diseño Ticket"/>
  <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={User} label="Mi Perfil"/>
  </aside>

 {/* CONTENT AREA */}
 <Card className="flex-1 p-10 glass-dark border-border relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-[0.01] dark:opacity-[0.02] -translate-y-1/4 translate-x-1/4 pointer-events-none">
 <Building2 size={200} className="text-foreground"/>
 </div>
 

 
 {activeTab === 'business' && (
 <div className="space-y-8 animate-fade-in relative z-10">
 <div className="flex items-center gap-3 mb-2">
 <Building2 className="text-brand-500 h-5 w-5"/>
 <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tight">Datos de Organización</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <Input 
 label="Razón Social"
 value={formData.company_name} 
 onChange={(e) => setFormData({...formData, company_name: e.target.value})} 
 icon={Building2} 
 />
 <Input 
 label="NIT / Identificación Fiscal"
 value={formData.tax_id} 
 onChange={(e) => setFormData({...formData, tax_id: e.target.value})} 
 icon={FileText} 
 />
 <Input 
 label="Email de Contacto"
 type="email"
 value={formData.corporate_email} 
 onChange={(e) => setFormData({...formData, corporate_email: e.target.value})} 
 icon={Mail} 
 />
 <Input 
 label="Teléfono Principal"
 value={formData.phone_number} 
 onChange={(e) => setFormData({...formData, phone_number: e.target.value})} 
 icon={Phone} 
 />
 <div className="md:col-span-2">
 <Input 
 label="Dirección Principal"
 value={formData.primary_address} 
 onChange={(e) => setFormData({...formData, primary_address: e.target.value})} 
 icon={MapPin} 
 />
 </div>
 <div className="md:col-span-2">
 <Input 
 label="Representante Legal"
 value={formData.legal_representative} 
 onChange={(e) => setFormData({...formData, legal_representative: e.target.value})} 
 icon={User} 
 />
 </div>
 </div>
 </div>
 )}

 {activeTab === 'billing' && (
 <div className="space-y-8 animate-fade-in relative z-10">
 <div className="flex items-center gap-3 mb-2">
 <Receipt className="text-brand-500 h-5 w-5"/>
 <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tight">Parámetros Fiscales</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <Input label="Iva Actual (%)"type="number"value={formData.tax_percentage} onChange={(e) => setFormData({...formData, tax_percentage: Number(e.target.value)})} icon={Palette} helperText="Este valor se usará para el cálculo informativo en cada venta."/>
 <Input label="Divisa del Sistema"value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} icon={Globe} />
 <div className="md:col-span-2">
 <Input label="Resolución de Facturación DIAN"value={formData.billing_resolution} onChange={(e) => setFormData({...formData, billing_resolution: e.target.value})} icon={FileText} />
 </div>
 </div>
 </div>
 )}


 {activeTab === 'ticket' && (
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-fade-in relative z-10">
 <div className="space-y-8">
 <div className="flex items-center gap-3 mb-2">
 <FileText className="text-brand-500 h-5 w-5"/>
 <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tight">Interfaz de Recibo</h3>
 </div>
 <input 
 type="file"
 ref={fileInputRef}
 className="hidden"
 accept=".webp,.png,.jpg,.jpeg,.svg"
 onChange={handleLogoUpload}
 aria-label="Subir logo de la organización"
 />
 <div 
 onClick={() => !isUploading && fileInputRef.current?.click()}
 className={`p-8 border-2 border-dashed border-border rounded-2xl text-center space-y-3 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all cursor-pointer group relative overflow-hidden ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
 >
 {formData.logo_url ? (
 <div className="relative h-24 w-full flex items-center justify-center">
 <img src={formData.logo_url} alt="Logo Prev"className="max-h-full max-w-[120px] object-contain"/>
 <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
 <Upload size={20} className="text-foreground"/>
 </div>
 </div>
 ) : (
 <div className="h-14 w-14 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground group-hover:text-brand-500 group-hover:scale-110 transition-all">
 {isUploading ? <Loader2 className="animate-spin"size={28} /> : <ImageIcon size={28} />}
 </div>
 )}
 <p className="text-sm font-black text-foreground uppercase tracking-tight font-outfit">
 {isUploading ? 'Subiendo...' : formData.logo_url ? 'Cambiar Logo' : 'Sincronizar Logo'}
 </p>
 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Formatos: SVG, PNG o JPG (Máx 2MB)</p>
 </div>
 <Input 
 label="Mensaje Legal / Pie de Página"
 value={formData.footer_message} 
 onChange={(e) => setFormData({...formData, footer_message: e.target.value})}
 icon={FileText}
 />
 <div className="space-y-2">
 <label htmlFor="ticket-formato-salida"className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Formato de Salida</label>
 <select id="ticket-formato-salida"className="w-full h-12 bg-card border border-border rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/50 transition-all outline-none text-foreground appearance-none shadow-inner">
 <option>Térmico 80mm (Recomendado)</option>
 <option>Térmico 58mm</option>
 <option>Ecológico / Digital Only</option>
 </select>
 </div>
 </div>

 {/* PREVIEW */}
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row items-center justify-center gap-4">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center opacity-70">Monitor de Salida (Simulado)</p>
 <Button 
 variant="secondary"
 size="sm"
 icon={Printer} 
 onClick={handleTestPrint}
 className="h-8 py-1 px-4 bg-brand-500/10 text-brand-500 border-brand-500/20 hover:bg-brand-500 hover:text-white dark:bg-brand-500/5 transition-all text-[9px] font-black uppercase tracking-widest rounded-lg"
 >
 Probar Impresión Real
 </Button>
 </div>
 <div className="bg-muted/40 p-8 rounded-3xl shadow-inner border border-border">
 <div className="bg-card text-black p-8 shadow-2xl max-w-[280px] mx-auto min-h-[420px] font-mono text-[10px] rounded-sm transform hover:scale-[1.02] transition-transform duration-500 border border-border">
 <div className="text-center mb-6">
 <div className="h-20 w-20 bg-card rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(0,0,0,0.2)] overflow-hidden border border-border p-1">
 {formData.logo_url ? (
 <img src={formData.logo_url} alt="Logo"className="max-h-full max-w-full object-contain rounded-full"style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.05))' }} />
 ) : (
 <ImageIcon size={28} className="text-muted-foreground"/>
 )}
 </div>
 <h4 className="font-black uppercase text-sm tracking-tighter leading-tight">{formData.company_name || 'GKAD STOCK'}</h4>
 <p className="text-[9px] opacity-60">NIT: {formData.tax_id || 'Sin NIT registrado'}</p>
 </div>
 <div className="border-b border-dashed border-border pb-3 mb-3 space-y-1">
 <div className="flex justify-between font-bold"><span>FAC:</span><span>TKT-4492</span></div>
 <div className="flex justify-between"><span>HORA:</span><span>{new Date().toLocaleTimeString()}</span></div>
 <div className="text-[8px] opacity-50">{formData.primary_address}</div>
 <div className="text-[8px] opacity-50">Tel: {formData.phone_number}</div>
 </div>
 <div className="space-y-2 mb-6">
 <div className="flex justify-between font-black border-b border-border pb-1.5 text-[9px] uppercase tracking-tighter">
 <span>DESCRIPCIÓN</span>
 <span>VALOR</span>
 </div>
 <div className="flex justify-between italic opacity-80">
 <span>Producto V5 Premium x 1</span>
 <span>$45.000</span>
 </div>
 </div>
 <div className="border-t border-double border-border pt-3 space-y-1.5">
 <div className="flex justify-between text-muted-foreground"><span>SUBTOTAL GRAVADO:</span><span>$37.815</span></div>
 <div className="flex justify-between text-muted-foreground"><span>IMPUESTO IVA ({formData.tax_percentage}%):</span><span>$7.185</span></div>
 <div className="flex justify-between font-black text-sm mt-3 border-t-2 border-black pt-2"><span>GRAN TOTAL:</span><span>$45.000</span></div>
 </div>
 <div className="mt-8 text-center text-[7px] space-y-1 leading-tight opacity-70 italic">
 <p className="font-bold">{formData.billing_resolution}</p>
 <p className="mt-6">{formData.footer_message}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'account' && (
 <div className="space-y-12 animate-fade-in relative z-10 pb-10">
 {/* CABECERA PERFIL */}
 <div className="text-center space-y-6">
 <div className="relative inline-block group">
 <div className="absolute inset-0 bg-brand-500 blur-[30px] opacity-10 dark:opacity-20 group-hover:opacity-40 transition-opacity"/>
 <div className="relative h-32 w-32 bg-muted/40 rounded-3xl flex items-center justify-center mx-auto text-brand-500 border border-border shadow-2xl overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent"/>
 <User size={60} strokeWidth={1.5} className="relative z-10 group-hover:scale-110 transition-transform duration-500"/>
 </div>
 </div>
 
 <div>
 <h3 className="text-3xl font-black text-foreground font-outfit uppercase tracking-tighter">{profile?.full_name}</h3>
 <p className="text-brand-500 uppercase text-[10px] font-black tracking-[0.4em] mt-2 opacity-80">{profile?.role}</p>
 </div>
 </div>

 {/* SECCIÓN DE APARIENCIA (NEW) */}
 <div className="pt-8 border-t border-border">
 <div className="flex items-center gap-3 mb-6">
 <Palette className="text-brand-500 h-5 w-5"/>
 <h3 className="font-black text-xl text-foreground font-outfit uppercase tracking-tight">Personalización de Tema</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-6">
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Color Principal (Base)</label>
 <div className="flex flex-wrap gap-4">
 {[
 { name: 'Azul', color: '#3b82f6' },
 { name: 'Rojo', color: '#ef4444' },
 { name: 'Esmeralda', color: '#10b981' },
 { name: 'Púrpura', color: '#8b5cf6' },
 { name: 'Naranja', color: '#f59e0b' }
 ].map((c) => (
 <button
 key={c.color}
  onClick={() => setFormData({ ...formData, theme_color: c.color })}
 className={`h-10 w-10 rounded-2xl border-4 transition-all hover:scale-110 active:scale-95 shadow-lg ${formData.theme_color === c.color ? 'border-border dark:border-white' : 'border-transparent'}`}
 style={{ backgroundColor: c.color }}
 title={c.name}
 />
 ))}
 <input 
 type="color"
 value={formData.theme_color || '#3b82f6'}
  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
 className="h-10 w-10 rounded-2xl cursor-pointer bg-transparent border-none appearance-none"
 aria-label="Selector de color primario personalizado"
 />
 </div>

 {/* SEGUNDO COLOR (Solo si es gradiente) */}
 {formData.theme_style === 'gradient' && (
 <div className="space-y-6 pt-4 animate-slide-up">
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Color de Contraste (Cierre)</label>
 <div className="flex flex-wrap gap-4">
 {[
 { name: 'Cian', color: '#06b6d4' },
 { name: 'Rosa', color: '#ec4899' },
 { name: 'Indigo', color: '#6366f1' },
 { name: 'Lima', color: '#84cc16' }
 ].map((c) => (
 <button
 key={c.color}
  onClick={() => setFormData({ ...formData, theme_secondary_color: c.color })}
 className={`h-10 w-10 rounded-2xl border-4 transition-all hover:scale-110 active:scale-95 shadow-lg ${formData.theme_secondary_color === c.color ? 'border-border dark:border-white' : 'border-transparent'}`}
 style={{ backgroundColor: c.color }}
 title={c.name}
 />
 ))}
 <input 
 type="color"
 value={formData.theme_secondary_color || '#2563eb'}
  onChange={(e) => setFormData({ ...formData, theme_secondary_color: e.target.value })}
 className="h-10 w-10 rounded-2xl cursor-pointer bg-transparent border-none appearance-none"
 aria-label="Selector de color secundario personalizado"
 />
 </div>
 
 {/* PRESETS DE GRADIENTES */}
 <div className="pt-4">
 <div className="flex items-center gap-2 mb-3">
 <Layers size={12} className="text-brand-500"/>
 <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Combinaciones V5 Sugeridas</span>
 </div>
 <div className="flex flex-wrap gap-2">
 {[
 { name: 'Océano', primary: '#0ea5e9', secondary: '#4338ca' },
 { name: 'Fuego', primary: '#f97316', secondary: '#be123c' },
 { name: 'Bosque', primary: '#22c55e', secondary: '#15803d' },
 { name: 'Cyber', primary: '#8b5cf6', secondary: '#db2777' }
 ].map((p) => (
 <button
 key={p.name}
  onClick={() => setFormData({ ...formData, theme_color: p.primary, theme_secondary_color: p.secondary })}
 className="px-3 py-1.5 rounded-lg border border-border hover:border-brand-500/50 transition-all group overflow-hidden relative"
 >
 <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-brand-500"/>
 <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-brand-500">{p.name}</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="space-y-6">
 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Estilo de Interactividad</label>
 <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted rounded-2xl border border-border">
 <button 
  onClick={() => setFormData({ ...formData, theme_style: 'solid' })}
 className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.theme_style !== 'gradient' ? 'bg-card text-brand-500 shadow-xl' : 'text-muted-foreground hover:text-foreground '}`}
 >
 Color Sólido
 </button>
 <button 
  onClick={() => setFormData({ ...formData, theme_style: 'gradient' })}
 className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.theme_style === 'gradient' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' : 'text-muted-foreground hover:text-foreground '}`}
 >
 Difuminado (V5)
 </button>
 </div>
 <p className="text-[9px] text-muted-foreground italic leading-relaxed px-1">
 {formData.theme_style === 'gradient' 
 ?"Modo Premium activado. Los controles utilizan una transición visual entre tus dos colores favoritos."
 :"Modo Minimalista activo. Colores planos para mayor claridad y foco."}
 </p>
 </div>
 </div>
 </div>

 {/* SEGURIDAD */}
 <div className="max-w-md grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
 <Button 
 variant="outline"
 className="w-full py-6 group hover:border-brand-500/30"
 onClick={() => setShowPasswordModal(true)}
 >
 <div className="flex items-center gap-3 text-left">
 <div className="p-2 bg-muted rounded-lg text-muted-foreground group-hover:text-brand-500 transition-colors"><Lock size={16} /></div>
 <span className="font-black uppercase tracking-widest text-[9px] text-muted-foreground group-hover:text-brand-500">Credenciales</span>
 </div>
 </Button>
 <Button 
 variant="outline"
 className="w-full py-6 group hover:border-red-500/30"
 onClick={() => setShowLogsModal(true)}
 >
 <div className="flex items-center gap-3 text-left">
 <div className="p-2 bg-red-500/5 rounded-lg text-red-500"><History size={16} /></div>
 <span className="font-black uppercase tracking-widest text-[9px] text-muted-foreground group-hover:text-red-500">Auditoría</span>
 </div>
 </Button>
 </div>
 </div>
 )}

 </Card>
 </div>

 {showPasswordModal && (
 <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
 )}
 
 {showLogsModal && (
 <UserLogsModal onClose={() => setShowLogsModal(false)} />
 )}

 </div>
 );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
 <button
 onClick={onClick}
 className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 group
 ${active 
 ? 'bg-brand-500 text-white shadow-2xl shadow-brand-500/40 relative z-10 border border-brand-500/20' 
 : 'text-muted-foreground hover:bg-card hover:text-foreground border border-transparent'
 }`}
 >
 <div className={`p-1.5 rounded-lg transition-all duration-500 ${active ? 'bg-card/20' : 'bg-muted/20 group-hover:scale-110'}`}>
 <Icon size={16} className={active ? 'text-foreground' : 'text-muted-foreground group-hover:text-brand-500'} />
 </div>
 <span className="flex-1 text-left">{label}</span>
 {active && <div className="h-1.5 w-1.5 bg-card rounded-full shadow-[0_0_8px_white]"/>}
 </button>
);

const ChangePasswordModal = ({ onClose }: { onClose: () => void }) => {
 const [loading, setLoading] = useState(false);
 const [password, setPassword] = useState('');

 const handleUpdate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (password.length < 6) return toast.error('Mínimo 6 caracteres');
 setLoading(true);
 try {
 await api.post('/auth/change-password', { newPassword: password });
 toast.success('Contraseña actualizada correctamente');
 onClose();
 } catch (error: any) {
 toast.error(error.message || 'Error al cambiar contraseña');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-card/60 backdrop-blur-xl animate-fade-in">
 <Card className="w-full max-w-sm glass-dark p-10 border-border shadow-2xl relative overflow-hidden">
 <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
 <div className="absolute top-0 right-0 p-6">
 <button onClick={onClose} className="p-3 bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground"><X size={20} /></button>
 </div>
 <div className="flex flex-col items-center text-center mb-8 relative z-10">
 <div className="h-14 w-14 bg-gradient-to-br from-brand-500 to-blue-700 rounded-2xl flex items-center justify-center text-foreground mb-4 shadow-lg shadow-brand-500/20 border border-white/20">
 <Lock size={28} />
 </div>
 <h3 className="text-xl font-black text-foreground font-outfit uppercase tracking-tight">Seguridad</h3>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Refuerza tu acceso perimetral</p>
 </div>
 <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
 <Input 
 label="Nueva Credencial"
 type="password"
 value={password} 
 onChange={e => setPassword(e.target.value)} 
 placeholder="Clave alfanumérica..."
 required 
 />
 <Button type="submit"loading={loading} className="w-full h-12 tracking-widest text-[10px] font-black uppercase">ACTUALIZAR SEGURIDAD</Button>
 </form>
 </Card>
 </div>
 );
};

const UserLogsModal = ({ onClose }: { onClose: () => void }) => {
 const [logs, setLogs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const fetchLogs = async () => {
 try {
 const data = await api.get('/auth/my-logs');
 setLogs(data || []);
 } catch (err) {
 toast.error('Error al cargar logs personales');
 } finally {
 setLoading(false);
 }
 };
 fetchLogs();
 }, []);

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-card/60 backdrop-blur-xl animate-fade-in">
 <Card className="w-full max-w-2xl p-0 glass-dark border-border shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
 <div className="p-8 border-b border-border flex items-center justify-between bg-muted">
 <div>
 <h3 className="font-black text-lg flex items-center gap-3 text-foreground font-outfit uppercase tracking-tight">
 <History className="h-5 w-5 text-brand-500"/>
 Auditoría de Acciones
 </h3>
 <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">Trazabilidad completa de tu sesión</p>
 </div>
 <button onClick={onClose} className="p-3 bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground"><X size={24} /></button>
 </div>
 <div className="flex-1 overflow-y-auto p-6 bg-card">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 italic">
 <Loader2 className="animate-spin text-brand-500 h-10 w-10 mb-4"/>
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consultando Base de Datos...</p>
 </div>
 ) : logs.length === 0 ? (
 <div className="text-center py-20 overflow-hidden">
 <History size={40} className="mx-auto text-foreground mb-4"/>
 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 italic">No se han registrado operaciones...</p>
 </div>
 ) : (
 <div className="space-y-4">
 {logs.map((log: any) => (
 <div key={log.id} className="p-5 bg-muted/40 border border-border rounded-2xl shadow-xl hover:border-brand-500/30 transition-all group">
 <div className="flex items-start gap-4">
 <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 animate-pulse ${log.level === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-black text-foreground group-hover:text-foreground dark:group-hover:text-foreground transition-colors">{log.message}</p>
 <div className="flex items-center gap-3 mt-3">
 <span className="text-[9px] uppercase font-black text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20">{log.module}</span>
 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 <div className="p-6 border-t border-border bg-muted text-center">
 <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em]">GKAD STOCK - SEGURIDAD NIVEL 5</p>
 </div>
 </Card>
 </div>
 );
};
