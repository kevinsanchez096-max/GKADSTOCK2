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
import { GlobalPlatformSettings } from './GlobalPlatformSettings';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { X, Loader2, History, Lock, Layers, Upload, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRef } from 'react';

export const Settings = () => {
  const { user, profile, updateProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'business' | 'billing' | 'ticket' | 'account' | 'platform'>('business');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Determinar datos de organización de forma segura (objeto o array)
  const orgData = profile?.organizations 
    ? (Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations) 
    : null;

  const [formData, setFormData] = useState({
    organization_name: orgData?.name || profile?.organization_name || '',
    address: orgData?.address || 'Cll 123 #45-67, Bogotá',
    phone: orgData?.phone || '300 000 0000',
    email: orgData?.email || profile?.email || 'contacto@negocio.com',
    tax_percentage: orgData?.tax_percentage || 19,
    currency: orgData?.currency || 'COP',
    billing_resolution: orgData?.billing_resolution || 'Res. 187640321 del 2024',
    footer_message: orgData?.footer_message || '¡Gracias por su compra! Vuelva pronto.',
    logo_url: orgData?.logo_url || '',
  });

  const isSuperAdmin = profile?.role === 'super_admin';

  // Sincronizar con el perfil únicamente al cargar inicialmente o si hay un cambio real externo
  useEffect(() => {
    if (orgData && !isSaving && !isUploading) {
      setFormData(prev => ({
        ...prev,
        organization_name: orgData.name || prev.organization_name,
        address: orgData.address || prev.address,
        phone: orgData.phone || prev.phone,
        email: orgData.email || prev.email,
        tax_percentage: orgData.tax_percentage || prev.tax_percentage,
        currency: orgData.currency || prev.currency,
        billing_resolution: orgData.billing_resolution || prev.billing_resolution,
        footer_message: orgData.footer_message || prev.footer_message,
        logo_url: orgData.logo_url || prev.logo_url,
      }));
    }
  }, [profile, isSaving, isUploading]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (file.size > 2 * 1024 * 1024) return toast.error('El archivo excede los 2MB');
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
      return toast.error('Formato no soportado (Solo JPG, PNG o SVG)');
    }

    setIsUploading(true);
    const toastId = toast.loading('Sincronizando logo...');
    
    // Vista previa local inmediata
    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, logo_url: localUrl }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.organization_id || 'org'}_logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // 1. Subir vía Servidor (Bypass RLS)
      const uploadData = new FormData();
      uploadData.append('logo', file);

      const response = await api.post('/auth/upload-logo', uploadData);
      const publicUrl = response.logo_url;

      if (!publicUrl) throw new Error('No se recibió la URL del logo');

      // 2. Actualizar estado y perfil
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      await updateProfile({ logo_url: publicUrl });
      
      toast.success('Logo sincronizado con éxito', { id: toastId });
    } catch (error: any) {
      console.error('Error al subir logo:', error);
      let errorMsg = error.message || '';
      if (errorMsg.includes('row-level security policy')) {
        errorMsg = 'No tienes permiso para subir archivos. Ejecuta el script SQL de autorización en Supabase.';
      }
      toast.error('Error al subir imagen: ' + errorMsg, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 🔍 DIAGNÓSTICO: Verifica en consola que theme_color viaja correctamente
      console.log('[GKAD Settings] Guardando Tema directamente en Supabase (Tabla profiles):', {
        theme_color: formData.theme_color,
        theme_secondary_color: formData.theme_secondary_color,
      });

      // 1. OBLIGATORIO: Actualización estricta directa a la tabla profiles
      if (user?.id) {
         await supabase
            .from('profiles')
            .update({
               theme_color: formData.theme_color,
               theme_secondary_color: formData.theme_secondary_color,
               theme_style: formData.theme_style
            })
            .eq('id', user.id);
      }

      // 2. Mantenemos la actualización global de profile
      await updateProfile(formData);
      
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      toast.error('Error al guardar los ajustes corporativos');
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
           <img src="${formData.logo_url}" style="
             max-height: 28mm; 
             max-width: 50mm; 
             border-radius: 50%; 
             box-shadow: 0 0 10px rgba(0,0,0,0.1);
             filter: drop-shadow(0 0 3px rgba(0,0,0,0.05));
             object-fit: contain;
           " />
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
            <h1 style="font-size: 18px; margin: 0;">${formData.organization_name || 'GKAD STOCK'}</h1>
            <p style="margin: 2mm 0;">${formData.address || 'Calle 123 #45-67, Bogotá'}</p>
            <p>Nit: 900.567.890-1</p>
            <p>Tel: ${formData.phone || '300 000 0000'}</p>
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
          
          <div class="divider" style="margin-top: 4mm;"></div>
          <div class="row"><span>SUBTOTAL:</span><span>$${testData.subtotal.toLocaleString()}</span></div>
          <div class="row"><span>IVA:</span><span>$0</span></div>
          <div class="row total bold"><span>TOTAL:</span><span>$${testData.total.toLocaleString()}</span></div>
          
          <div class="divider"></div>
          <div class="row"><span>RECIBIDO:</span><span>$${testData.amountReceived.toLocaleString()}</span></div>
          <div class="row bold"><span>SU CAMBIO:</span><span>$${testData.change.toLocaleString()}</span></div>
          
          <div class="center footer">
            <p class="bold" style="font-size: 11px;">${formData.footer_message || '¡GRACIAS POR SU COMPRA! VUELVA PRONTO'}</p>
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

  // Renderizado de Plataforma para Super Admin
  if (isSuperAdmin && activeTab !== 'account') {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.05] translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Building2 size={300} className="text-zinc-400 dark:text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter font-outfit">Configuración Maestro</h2>
            <p className="text-zinc-500 mt-2 font-bold tracking-widest uppercase text-xs opacity-70">Infraestructura Global & Seguridad Enterprise</p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={() => setActiveTab('account')}
              className="px-6 py-3 bg-zinc-100 dark:bg-white/5 hover:bg-brand-500/10 rounded-2xl text-[10px] font-black text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-all border border-zinc-200 dark:border-white/5 hover:border-brand-500/20 tracking-widest uppercase"
            >
              MI CUENTA MAESTRA
            </button>
          </div>
        </div>
        <GlobalPlatformSettings />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-slide-up">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black dark:text-white font-outfit tracking-tighter">CONFIGURACIÓN</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Personalización de experiencia y datos comerciales</p>
          <div className="h-1 w-12 bg-brand-500 mt-4 rounded-full" />
        </div>
        <Button 
          icon={showSaved ? CheckCircle2 : Save} 
          onClick={handleSave} 
          loading={isSaving}
          size="lg"
          className={showSaved ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {showSaved ? 'Sincronizado' : 'Guardar Parámetros'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* TABS NAVIGATION */}
        <aside className="w-full lg:w-72 space-y-2">
          <TabButton active={activeTab === 'business'} onClick={() => setActiveTab('business')} icon={Building2} label="Empresa" />
          <TabButton active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={Receipt} label="Facturación" />
          <TabButton active={activeTab === 'ticket'} onClick={() => setActiveTab('ticket')} icon={FileText} label="Diseño Ticket" />
          <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={User} label="Mi Perfil" />
        </aside>

        {/* CONTENT AREA */}
        <Card className="flex-1 p-10 glass-dark border-zinc-200 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.01] dark:opacity-[0.02] -translate-y-1/4 translate-x-1/4 pointer-events-none">
             <Building2 size={200} className="text-zinc-900 dark:text-white" />
          </div>
          
          {activeTab === 'business' && (
            <div className="space-y-8 animate-fade-in relative z-10">
              <div className="flex items-center gap-3 mb-2">
                 <Building2 className="text-brand-500 h-5 w-5" />
                 <h3 className="font-black text-xl text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">Datos de Organización</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Razón Social" value={formData.organization_name} onChange={(e) => setFormData({...formData, organization_name: e.target.value})} icon={Building2} />
                <Input label="Email Corporativo" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} icon={Mail} />
                <Input label="Teléfono de Contacto" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} icon={Phone} />
                <Input label="Dominio Web" defaultValue="www.negocio.com" icon={Globe} />
                <div className="md:col-span-2">
                  <Input label="Sede Principal / Dirección" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} icon={MapPin} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-8 animate-fade-in relative z-10">
              <div className="flex items-center gap-3 mb-2">
                 <Receipt className="text-brand-500 h-5 w-5" />
                 <h3 className="font-black text-xl text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">Parámetros Fiscales</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Iva Actual (%)" type="number" value={formData.tax_percentage} onChange={(e) => setFormData({...formData, tax_percentage: Number(e.target.value)})} icon={Palette} helperText="Este valor se usará para el cálculo informativo en cada venta." />
                <Input label="Divisa del Sistema" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} icon={Globe} />
                <div className="md:col-span-2">
                  <Input label="Resolución de Facturación DIAN" value={formData.billing_resolution} onChange={(e) => setFormData({...formData, billing_resolution: e.target.value})} icon={FileText} />
                </div>
              </div>
            </div>
          )}


          {activeTab === 'ticket' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-fade-in relative z-10">
              <div className="space-y-8">
                 <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-brand-500 h-5 w-5" />
                    <h3 className="font-black text-xl text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">Interfaz de Recibo</h3>
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
                   className={`p-8 border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-2xl text-center space-y-3 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all cursor-pointer group relative overflow-hidden ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                 >
                    {formData.logo_url ? (
                      <div className="relative h-24 w-full flex items-center justify-center">
                        <img src={formData.logo_url} alt="Logo Prev" className="max-h-full max-w-[120px] object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                          <Upload size={20} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-14 w-14 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-zinc-400 group-hover:text-brand-500 group-hover:scale-110 transition-all">
                        {isUploading ? <Loader2 className="animate-spin" size={28} /> : <ImageIcon size={28} />}
                      </div>
                    )}
                    <p className="text-sm font-black dark:text-white uppercase tracking-tight font-outfit">
                      {isUploading ? 'Subiendo...' : formData.logo_url ? 'Cambiar Logo' : 'Sincronizar Logo'}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Formatos: SVG, PNG o JPG (Máx 2MB)</p>
                 </div>
                 <Input 
                   label="Mensaje Legal / Pie de Página" 
                   value={formData.footer_message} 
                   onChange={(e) => setFormData({...formData, footer_message: e.target.value})}
                   icon={FileText}
                 />
                 <div className="space-y-2">
                    <label htmlFor="ticket-formato-salida" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Formato de Salida</label>
                    <select id="ticket-formato-salida" className="w-full h-12 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-brand-500/50 transition-all outline-none dark:text-white appearance-none shadow-inner">
                      <option>Térmico 80mm (Recomendado)</option>
                      <option>Térmico 58mm</option>
                      <option>Ecológico / Digital Only</option>
                    </select>
                 </div>
              </div>

              {/* PREVIEW */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] text-center opacity-70">Monitor de Salida (Simulado)</p>
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
                <div className="bg-zinc-50 dark:bg-black/40 p-8 rounded-3xl shadow-inner border border-zinc-200 dark:border-white/5">
                   <div className="bg-white text-black p-8 shadow-2xl max-w-[280px] mx-auto min-h-[420px] font-mono text-[10px] rounded-sm transform hover:scale-[1.02] transition-transform duration-500 border border-zinc-100">
                      <div className="text-center mb-6">
                        <div className="h-20 w-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(0,0,0,0.2)] overflow-hidden border border-zinc-100 p-1">
                          {formData.logo_url ? (
                            <img src={formData.logo_url} alt="Logo" className="max-h-full max-w-full object-contain rounded-full" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.05))' }} />
                          ) : (
                            <ImageIcon size={28} className="text-zinc-300" />
                          )}
                        </div>
                        <h4 className="font-black uppercase text-sm tracking-tighter leading-tight">{formData.organization_name || 'GKAD STOCK'}</h4>
                        <p className="text-[9px] opacity-60">NIT: 900.567.890-1</p>
                      </div>
                      <div className="border-b border-dashed border-zinc-300 pb-3 mb-3 space-y-1">
                        <div className="flex justify-between font-bold"><span>FAC:</span><span>TKT-4492</span></div>
                        <div className="flex justify-between"><span>HORA:</span><span>{new Date().toLocaleTimeString()}</span></div>
                      </div>
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between font-black border-b border-zinc-800 pb-1.5 text-[9px] uppercase tracking-tighter">
                          <span>DESCRIPCIÓN</span>
                          <span>VALOR</span>
                        </div>
                        <div className="flex justify-between italic opacity-80">
                           <span>Producto V5 Premium x 1</span>
                           <span>$45.000</span>
                        </div>
                      </div>
                      <div className="border-t border-double border-zinc-800 pt-3 space-y-1.5">
                        <div className="flex justify-between text-zinc-500"><span>SUBTOTAL GRAVADO:</span><span>$37.815</span></div>
                        <div className="flex justify-between text-zinc-500"><span>IMPUESTO IVA ({formData.tax_percentage}%):</span><span>$7.185</span></div>
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
                   <div className="absolute inset-0 bg-brand-500 blur-[30px] opacity-10 dark:opacity-20 group-hover:opacity-40 transition-opacity" />
                   <div className="relative h-32 w-32 bg-zinc-50 dark:bg-black/40 rounded-3xl flex items-center justify-center mx-auto text-brand-500 border border-zinc-200 dark:border-white/5 shadow-2xl overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent" />
                      <User size={60} strokeWidth={1.5} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                   </div>
                 </div>
                 
                 <div>
                   <h3 className="text-3xl font-black text-zinc-900 dark:text-white font-outfit uppercase tracking-tighter">{profile?.full_name}</h3>
                   <p className="text-brand-500 uppercase text-[10px] font-black tracking-[0.4em] mt-2 opacity-80">{profile?.role}</p>
                 </div>
               </div>

               {/* SECCIÓN DE APARIENCIA (NEW) */}
               <div className="pt-8 border-t border-zinc-200 dark:border-white/5">
                 <div className="flex items-center gap-3 mb-6">
                   <Palette className="text-brand-500 h-5 w-5" />
                   <h3 className="font-black text-xl text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">Personalización de Tema</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Color Principal (Base)</label>
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
                            onClick={() => updateProfile({ theme_color: c.color })}
                            className={`h-10 w-10 rounded-2xl border-4 transition-all hover:scale-110 active:scale-95 shadow-lg ${profile?.theme_color === c.color ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                          />
                        ))}
                        <input 
                          type="color"
                          value={profile?.theme_color || '#3b82f6'}
                          onChange={(e) => updateProfile({ theme_color: e.target.value })}
                          className="h-10 w-10 rounded-2xl cursor-pointer bg-transparent border-none appearance-none"
                          aria-label="Selector de color primario personalizado"
                        />
                      </div>

                      {/* SEGUNDO COLOR (Solo si es gradiente) */}
                      {profile?.theme_style === 'gradient' && (
                        <div className="space-y-6 pt-4 animate-slide-up">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Color de Contraste (Cierre)</label>
                           <div className="flex flex-wrap gap-4">
                            {[
                              { name: 'Cian', color: '#06b6d4' },
                              { name: 'Rosa', color: '#ec4899' },
                              { name: 'Indigo', color: '#6366f1' },
                              { name: 'Lima', color: '#84cc16' }
                            ].map((c) => (
                              <button
                                key={c.color}
                                onClick={() => updateProfile({ theme_secondary_color: c.color })}
                                className={`h-10 w-10 rounded-2xl border-4 transition-all hover:scale-110 active:scale-95 shadow-lg ${profile?.theme_secondary_color === c.color ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: c.color }}
                                title={c.name}
                              />
                            ))}
                            <input 
                              type="color"
                              value={profile?.theme_secondary_color || '#2563eb'}
                              onChange={(e) => updateProfile({ theme_secondary_color: e.target.value })}
                              className="h-10 w-10 rounded-2xl cursor-pointer bg-transparent border-none appearance-none"
                              aria-label="Selector de color secundario personalizado"
                            />
                           </div>
                           
                           {/* PRESETS DE GRADIENTES */}
                           <div className="pt-4">
                             <div className="flex items-center gap-2 mb-3">
                               <Layers size={12} className="text-brand-500" />
                               <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Combinaciones V5 Sugeridas</span>
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
                                   onClick={() => updateProfile({ theme_color: p.primary, theme_secondary_color: p.secondary })}
                                   className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/5 hover:border-brand-500/50 transition-all group overflow-hidden relative"
                                 >
                                   <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-brand-500" />
                                   <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 group-hover:text-brand-500">{p.name}</span>
                                 </button>
                               ))}
                             </div>
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Estilo de Interactividad</label>
                      <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-white/5">
                        <button 
                          onClick={() => updateProfile({ theme_style: 'solid' })}
                          className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${profile?.theme_style !== 'gradient' ? 'bg-white dark:bg-zinc-800 text-brand-500 shadow-xl' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                          Color Sólido
                        </button>
                        <button 
                          onClick={() => updateProfile({ theme_style: 'gradient' })}
                          className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${profile?.theme_style === 'gradient' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                          Difuminado (V5)
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-400 italic leading-relaxed px-1">
                        {profile?.theme_style === 'gradient' 
                          ? "Modo Premium activado. Los controles utilizan una transición visual entre tus dos colores favoritos." 
                          : "Modo Minimalista activo. Colores planos para mayor claridad y foco."}
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
                     <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-lg text-zinc-500 group-hover:text-brand-500 transition-colors"><Lock size={16} /></div>
                     <span className="font-black uppercase tracking-widest text-[9px] text-zinc-600 dark:text-zinc-400 group-hover:text-brand-500">Credenciales</span>
                   </div>
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full py-6 group hover:border-red-500/30"
                   onClick={() => setShowLogsModal(true)}
                 >
                   <div className="flex items-center gap-3 text-left">
                     <div className="p-2 bg-red-500/5 rounded-lg text-red-500"><History size={16} /></div>
                     <span className="font-black uppercase tracking-widest text-[9px] text-zinc-600 group-hover:text-red-500">Auditoría</span>
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
        ? 'bg-brand-600 text-white shadow-2xl shadow-brand-500/40 relative z-10 border border-brand-400/20' 
        : 'text-zinc-500 dark:text-zinc-500 hover:bg-white dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'
    }`}
  >
    <div className={`p-1.5 rounded-lg transition-all duration-500 ${active ? 'bg-white/20' : 'bg-zinc-100 dark:bg-black/20 group-hover:scale-110'}`}>
       <Icon size={16} className={active ? 'text-white' : 'text-zinc-500 group-hover:text-brand-500'} />
    </div>
    <span className="flex-1 text-left">{label}</span>
    {active && <div className="h-1.5 w-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/60 dark:bg-zinc-950/80 backdrop-blur-xl animate-fade-in">
      <Card className="w-full max-w-sm glass-dark p-10 border-zinc-200 dark:border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 p-6">
          <button onClick={onClose} className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl transition-all text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="h-14 w-14 bg-gradient-to-br from-brand-500 to-blue-700 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-brand-500/20 border border-white/20">
            <Lock size={28} />
          </div>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">Seguridad</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Refuerza tu acceso perimetral</p>
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
          <Button type="submit" loading={loading} className="w-full h-12 tracking-widest text-[10px] font-black uppercase">ACTUALIZAR SEGURIDAD</Button>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/60 dark:bg-zinc-950/80 backdrop-blur-xl animate-fade-in">
      <Card className="w-full max-w-2xl p-0 glass-dark border-zinc-200 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-white/[0.02]">
          <div>
            <h3 className="font-black text-lg flex items-center gap-3 text-zinc-900 dark:text-white font-outfit uppercase tracking-tight">
               <History className="h-5 w-5 text-brand-500" />
               Auditoría de Acciones
            </h3>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Trazabilidad completa de tu sesión</p>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-100 dark:bg-white/5 rounded-xl transition-all text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-zinc-950/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 italic">
               <Loader2 className="animate-spin text-brand-500 h-10 w-10 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Consultando Base de Datos...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 overflow-hidden">
               <History size={40} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 opacity-50 italic">No se han registrado operaciones...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="p-5 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-2xl shadow-xl hover:border-brand-500/30 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 animate-pulse ${log.level === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{log.message}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[9px] uppercase font-black text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20">{log.module}</span>
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] text-center">
           <p className="text-[8px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em]">GKAD STOCK - SEGURIDAD NIVEL 5</p>
        </div>
      </Card>
    </div>
  );
};
