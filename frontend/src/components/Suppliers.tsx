import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button } from './ui-components';
import {
 Truck,
 UserPlus,
 Mail,
 Phone,
 MapPin,
 Trash2,
 Pencil,
 X,
 Loader2,
 Search,
 FileText,
 Briefcase,
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Supplier {
 id: string;
 company_name: string;
 contact_name: string;
 tax_id: string;
 email: string;
 phone: string;
 address: string;
 notes: string;
 created_at: string;
}

type SupplierForm = Omit<Supplier, 'id' | 'created_at'>;

const EMPTY_FORM: SupplierForm = {
 company_name: '',
 contact_name: '',
 tax_id: '',
 email: '',
 phone: '',
 address: '',
 notes: '',
};

// ─── Component ───────────────────────────────────────────────────────────────
export const Suppliers = () => {
 const { profile } = useAuthStore();
 const [suppliers, setSuppliers] = useState<Supplier[]>([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
 const [search, setSearch] = useState('');

 // ── Data ──────────────────────────────────────────────────────────────────
 const fetchSuppliers = async () => {
 setLoading(true);
 try {
 const data = await api.get('/suppliers');
 setSuppliers(data || []);
 } catch {
 toast.error('Error al cargar proveedores');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchSuppliers(); }, []);

 // ── Filtered list ─────────────────────────────────────────────────────────
 const filtered = suppliers.filter(s =>
 [s.company_name, s.contact_name, s.email, s.phone, s.tax_id].some(v =>
 (v || '').toLowerCase().includes(search.toLowerCase())
 )
 );

 // ── Handlers ──────────────────────────────────────────────────────────────
 const openCreate = () => {
 setEditingId(null);
 setForm(EMPTY_FORM);
 setIsModalOpen(true);
 };

 const openEdit = (s: Supplier) => {
 setEditingId(s.id);
 setForm({
 company_name: s.company_name,
 contact_name: s.contact_name,
 tax_id: s.tax_id,
 email: s.email,
 phone: s.phone,
 address: s.address,
 notes: s.notes,
 });
 setIsModalOpen(true);
 };

 const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.company_name.trim()) return toast.error('La razón social es obligatoria');
 setIsSubmitting(true);

 const sanitizedForm = {
 ...form,
 company_name: toTitleCase(form.company_name.trim()),
 contact_name: form.contact_name ? toTitleCase(form.contact_name.trim()) : '',
 };

 try {
 if (editingId) {
 await api.patch(`/suppliers/${editingId}`, sanitizedForm);
 toast.success('Proveedor actualizado');
 } else {
 await api.post('/suppliers', sanitizedForm);
 toast.success('Proveedor registrado');
 }
 fetchSuppliers();
 setIsModalOpen(false);
 } catch (err: any) {
 toast.error(err.message || 'Error al guardar proveedor');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm('¿Eliminar este proveedor permanentemente?')) return;
 try {
 await api.delete(`/suppliers/${id}`);
 toast.success('Proveedor eliminado');
 fetchSuppliers();
 } catch {
 toast.error('Error al eliminar proveedor');
 }
 };

 const f = (key: keyof SupplierForm, val: string) =>
 setForm(prev => ({ ...prev, [key]: val }));

 // ── Render ────────────────────────────────────────────────────────────────
 return (
    <div className="space-y-8 animate-slide-up flex-1 min-h-full pb-20">
      
      {/* 1. MISSION CONTROL HEADER */}
      <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-orange-500/5 blur-[60px] rounded-full pointer-events-none"/>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-10">
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"/>
              <Truck size={18} className="text-brand-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Gestión de Suministros</span>
            </div>
            <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
              Directorio de <span className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">Proveedores</span>
            </h1>
            <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Alianzas Estratégicas</p>
          </div>

          <div className="lg:col-span-4">
            <div className="relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors z-10"/>
              <input 
                type="text"
                placeholder="Buscar por empresa, NIT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 pl-12 pr-6 bg-muted/40 border border-border/50 rounded-2xl text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-muted-foreground shadow-inner"
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <Button 
              onClick={openCreate}
              icon={UserPlus}
              className="h-14 px-10 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl shadow-brand-500/20 border-none"
            >
              Nuevo Proveedor
            </Button>
          </div>
        </div>
      </Card>

  {/* TABLE */}
  <Card className="p-0 bg-card border border-border shadow-md overflow-hidden rounded-[2.5rem] flex-1 backdrop-blur-xl">
  <div className="overflow-x-auto min-h-[400px]">
  <table className="w-full text-left border-collapse">
  <thead>
  <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
  <th className="px-8 py-5">Proveedor (Empresa)</th>
  <th className="px-8 py-5">Representante</th>
  <th className="px-8 py-5 hidden md:table-cell">Contacto Comercial</th>
  <th className="px-8 py-5 hidden md:table-cell">Región / Sede</th>
  <th className="px-8 py-5 text-right">Acciones</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-border/40">
  {loading ? (
  <tr>
  <td colSpan={5} className="text-center py-32">
  <div className="flex flex-col items-center animate-pulse">
  <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4"/>
  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
  Sincronizando proveedores...
  </p>
  </div>
  </td>
  </tr>
  ) : filtered.length === 0 ? (
  <tr>
  <td colSpan={5} className="text-center py-32 text-foreground">
  <div className="flex flex-col items-center opacity-30">
  <Truck className="h-16 w-16 mb-4"strokeWidth={1} />
  <p className="font-black uppercase tracking-[0.4em] text-[10px]">
  {search ? 'Sin coincidencias' : 'Directorio de suministro vacío'}
  </p>
  </div>
  </td>
  </tr>
  ) : (
  filtered.map(s => (
  <tr key={s.id} className="hover:bg-muted/30 transition-colors text-xs font-bold group">
  {/* Nombre Empresa */}
  <td className="px-8 py-5 whitespace-nowrap">
  <div className="flex items-center gap-4">
  <div className="h-11 w-11 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-black text-sm font-outfit shadow-lg shadow-brand-500/5 group-hover:scale-110 transition-transform">
  {(s.company_name || 'P').charAt(0).toUpperCase()}
  </div>
  <div>
  <p className="font-black text-foreground uppercase tracking-tight font-outfit group-hover:text-brand-500 dark:group-hover:text-foreground transition-colors">
  {s.company_name}
  </p>
  {s.tax_id && (
  <p className="text-[9px] text-muted-foreground font-bold font-mono tracking-widest uppercase">
  NIT/RUT: {s.tax_id}
  </p>
  )}
  </div>
  </div>
  </td>

  {/* Contacto Humano */}
  <td className="px-8 py-5">
  {s.contact_name ? (
  <div className="flex items-center gap-2">
  <Briefcase className="h-3 w-3 text-muted-foreground"/>
  <span className="text-sm font-bold text-foreground capitalize">{s.contact_name}</span>
  </div>
  ) : (
  <span className="text-muted-foreground text-xs">—</span>
  )}
  </td>

  {/* ContactInfo */}
  <td className="px-8 py-5 hidden md:table-cell">
  <div className="flex flex-col gap-1">
  {s.email && (
  <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
  <Mail className="h-3 w-3 text-brand-500 shrink-0"/>
  <span className="lowercase truncate max-w-[160px]">{s.email}</span>
  </div>
  )}
  {s.phone && (
  <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
  <Phone className="h-3 w-3 text-emerald-500 shrink-0"/>
  {s.phone}
  </div>
  )}
  {!s.email && !s.phone && (
  <span className="text-muted-foreground text-xs">Sin dato comercial</span>
  )}
  </div>
  </td>

  {/* Address / Región */}
  <td className="px-8 py-5 hidden md:table-cell text-muted-foreground text-xs font-bold">
  {s.address ? (
  <div className="flex items-center gap-2">
  <MapPin className="h-3 w-3 text-red-400"/>
  <span className="truncate max-w-[200px]">{s.address}</span>
  </div>
  ) : (
  <span className="text-muted-foreground">—</span>
  )}
  </td>

  {/* Acciones */}
  <td className="px-8 py-5 text-right">
  <div className="flex justify-end gap-2 opacity-20 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
  <button
  onClick={() => openEdit(s)}
  className="p-3 bg-muted text-muted-foreground hover:text-brand-500 hover:bg-brand-500/10 rounded-xl border border-transparent hover:border-brand-500/20 transition-all"
  title="Editar perfil de proveedor"
  >
  <Pencil className="h-4 w-4"strokeWidth={2.5} />
  </button>
  <button
  onClick={() => handleDelete(s.id)}
  className="p-3 bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all"
  title="Eliminar del directorio"
  >
  <Trash2 className="h-4 w-4"strokeWidth={2.5} />
  </button>
  </div>
  </td>
  </tr>
  ))
  )}
  </tbody>
  </table>
  </div>
  <div className="p-6 border-t border-border bg-muted text-center">
  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.5em]">
  {suppliers.length} CORPORATIVOS ENLAZADOS — GKAD STOCK ERP V5
  </p>
  </div>
  </Card>

  {/* ── MODAL CREAR / EDITAR ─────────────────────────────────────────── */}
  {isModalOpen && createPortal(
  <div style={{
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)'
  }}>
  <Card className="relative w-full max-w-2xl p-0 glass-dark border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden rounded-[3rem] max-h-[90vh] flex flex-col">
  <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>

  {/* Modal Header */}
  <div 
    style={{
      padding: '40px',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 95%)'
    }}
    className="relative shrink-0"
  >
    <div className="flex items-center gap-4">
      <div 
        style={{ 
          padding: '12px',
          backgroundColor: 'var(--brand-primary)', 
          borderRadius: '16px', 
          color: 'white', 
          border: '2px solid var(--border)',
          boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--brand-primary), transparent 60%)'
        }}
        className="flex items-center justify-center animate-pulse"
      >
        <Truck className="h-6 w-6"/>
      </div>
      <div>
        <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight margin: 0">
          {editingId ? 'EDITAR' : 'ALTA DE'} <span style={{ color: 'var(--brand-primary)' }}>PROVEEDOR</span>
        </h3>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
          {editingId ? 'Ficha Maestra de Suministro' : 'Enlace corporativo B2B'}
        </p>
      </div>
    </div>
    <button
      onClick={() => setIsModalOpen(false)}
      className="absolute right-8 top-8 p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all"
    >
      <X className="h-5 w-5"/>
    </button>
  </div>

  {/* Modal Body */}
  <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto flex-1">

  {/* Razón Social */}
  <FieldGroup label="Razón Social / Entidad"required>
  <div className="relative">
  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="supplier-company"
  type="text"
  placeholder="Ej. Distribuidora Nacional S.A."
  value={form.company_name}
  onChange={e => f('company_name', e.target.value)}
  required
  className="w-full h-14 bg-card border border-border rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm"
  />
  </div>
  </FieldGroup>

  {/* NIT & Representante */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FieldGroup label="RUT / NIT">
  <input
  id="supplier-tax"
  type="text"
  placeholder="900.000.000-1"
  value={form.tax_id}
  onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
  }}
  onChange={e => f('tax_id', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground font-mono shadow-sm"
  />
  </FieldGroup>
  <FieldGroup label="Representante / Asesor">
  <input
  id="supplier-contact"
  type="text"
  placeholder="Nombre del asesor asignado"
  value={form.contact_name}
  onChange={e => f('contact_name', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm"
  />
  </FieldGroup>
  </div>

  {/* Email y Teléfono */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FieldGroup label="Correo de Pedidos">
  <div className="relative">
  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="supplier-email"
  type="email"
  placeholder="ventas@distribuidora.com"
  value={form.email}
  onChange={e => f('email', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground font-mono shadow-sm"
  />
  </div>
  </FieldGroup>
  <FieldGroup label="Línea de Atención">
  <div className="relative">
  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="supplier-phone"
  type="text"
  placeholder="Línea gratuita o PBX"
  value={form.phone}
  onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
  }}
  onChange={e => f('phone', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm"
  />
  </div>
  </FieldGroup>
  </div>

  {/* Dirección */}
  <FieldGroup label="Bodega Principal / Sede">
  <div className="relative">
  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="supplier-address"
  type="text"
  placeholder="Sede logística principal"
  value={form.address}
  onChange={e => f('address', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm"
  />
  </div>
  </FieldGroup>

  {/* Notas */}
  <FieldGroup label="Condiciones Comerciales (Notas)">
  <div className="relative">
  <FileText className="absolute left-4 top-4 h-4 w-4 text-muted-foreground"/>
  <textarea
  id="supplier-notes"
  placeholder="Tiempo de entrega, cupo de crédito, retenciones, etc..."
  value={form.notes}
  onChange={e => f('notes', e.target.value)}
  rows={2}
  className="w-full bg-card border border-border rounded-2xl pl-11 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm resize-none"
  />
  </div>
  </FieldGroup>

  <Button
  type="submit"
  style={{ background: 'var(--brand-primary)' }}
  className="w-full h-16 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]"
  disabled={isSubmitting}
  loading={isSubmitting}
  >
  {editingId ? 'ACTUALIZAR PROVEEDOR' : 'CONFIRMAR ALTA CORPORATIVA'}
  </Button>
  </form>
  </Card>
  </div>,
  document.body
  )}
  </div>
 );
};

// ─── Helper: label + slot wrapper ───────────────────────────────────────────
const FieldGroup = ({
 label,
 required,
 children,
}: {
 label: string;
 required?: boolean;
 children: React.ReactNode;
}) => (
 <div className="space-y-2">
 <label
 htmlFor={`supplier-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2"
 >
 {label}{required && <span className="text-brand-500 ml-1">*</span>}
 </label>
 {children}
 </div>
);
