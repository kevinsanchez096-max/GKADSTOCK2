import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button } from './ui-components';
import {
 Contact,
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
 Hash,
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Customer {
 id: string;
 name: string;
 document_type: string;
 document_number: string;
 email: string;
 phone: string;
 address: string;
 notes: string;
 created_at: string;
}

type CustomerForm = Omit<Customer, 'id' | 'created_at'>;

const EMPTY_FORM: CustomerForm = {
 name: '',
 document_type: 'CC',
 document_number: '',
 email: '',
 phone: '',
 address: '',
 notes: '',
};

const DOC_TYPES = ['CC', 'NIT', 'CE', 'PAS', 'TI'];

// ─── Component ───────────────────────────────────────────────────────────────
export const Customers = () => {
 const { profile } = useAuthStore();
 const [customers, setCustomers] = useState<Customer[]>([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
 const [search, setSearch] = useState('');

 const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});

 const validateField = (field: keyof CustomerForm, value: string) => {
 let error = '';
 switch (field) {
 case 'name':
 if (!value) error = 'El nombre es obligatorio';
 else if (value.length < 3) error = 'Mínimo 3 caracteres';
 else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s&.\-]+$/.test(value)) error = 'Formato inválido. Solo letras, números y &, ., -';
 break;
 case 'document_number':
 if (value && !/^[\d-]+$/.test(value)) error = 'Solo números y guiones';
 break;
 case 'email':
 if (value && !/\S+@\S+\.\S+/.test(value)) error = 'Correo inválido';
 break;
 case 'phone':
 if (value && !/^\d{7,10}$/.test(value)) error = 'Debe tener entre 7 y 10 dígitos';
 break;
 }
 setErrors(prev => ({ ...prev, [field]: error }));
 return error;
 };

 // ── Data ──────────────────────────────────────────────────────────────────
 const fetchCustomers = async () => {
 setLoading(true);
 try {
 const data = await api.get('/customers');
 setCustomers(data || []);
 } catch {
 toast.error('Error al cargar clientes');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchCustomers(); }, []);

 // ── Filtered list ─────────────────────────────────────────────────────────
 const filtered = customers.filter(c =>
 [c.name, c.email, c.phone, c.document_number].some(v =>
 (v || '').toLowerCase().includes(search.toLowerCase())
 )
 );

 // ── Handlers ──────────────────────────────────────────────────────────────
 const openCreate = () => {
 setEditingId(null);
 setForm(EMPTY_FORM);
 setIsModalOpen(true);
 };

 const openEdit = (c: Customer) => {
 setEditingId(c.id);
 setForm({
 name: c.name,
 document_type: c.document_type,
 document_number: c.document_number,
 email: c.email,
 phone: c.phone,
 address: c.address,
 notes: c.notes,
 });
 setIsModalOpen(true);
 };

 const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 
 const eName = validateField('name', form.name);
 const eDoc = validateField('document_number', form.document_number);
 const eEmail = validateField('email', form.email);
 const ePhone = validateField('phone', form.phone);

 if (eName || eDoc || eEmail || ePhone) {
   return toast.error('Corrige los errores del formulario');
 }

 setIsSubmitting(true);
 
 // 1. Sanitización de Texto (Title Case)
 const sanitizedForm = {
 ...form,
 name: toTitleCase(form.name.trim())
 };

 try {
 if (editingId) {
 await api.patch(`/customers/${editingId}`, sanitizedForm);
 toast.success('Cliente actualizado');
 } else {
 await api.post('/customers', sanitizedForm);
 toast.success('Cliente registrado');
 }
 fetchCustomers();
 setIsModalOpen(false);
 } catch (err: any) {
 toast.error(err.message || 'Error al guardar cliente');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm('¿Eliminar este cliente permanentemente?')) return;
 try {
 await api.delete(`/customers/${id}`);
 toast.success('Cliente eliminado');
 fetchCustomers();
 } catch {
 toast.error('Error al eliminar cliente');
 }
 };

 const f = (key: keyof CustomerForm, val: string) =>
 setForm(prev => ({ ...prev, [key]: val }));

 // ── Render ────────────────────────────────────────────────────────────────
 return (
    <div className="space-y-8 animate-slide-up flex-1 min-h-full pb-20">
      
      {/* 1. MISSION CONTROL HEADER */}
      <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"/>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-10">
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"/>
              <Contact size={18} className="text-brand-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Gestión de Clientes</span>
            </div>
            <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
              Directorio de <span className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">Clientes</span>
            </h1>
            <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Base de datos de socios comerciales</p>
          </div>

          <div className="lg:col-span-4">
            <div className="relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors z-10"/>
              <input 
                type="text"
                placeholder="Buscar por nombre, documento..."
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
              Nuevo Cliente
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
  <th className="px-8 py-5">Cliente</th>
  <th className="px-8 py-5 hidden md:table-cell">Documento</th>
  <th className="px-8 py-5">Contacto</th>
  <th className="px-8 py-5 hidden md:table-cell">Dirección</th>
  <th className="px-8 py-5 text-right">Acciones</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-slate-200">
  {loading ? (
  <tr>
  <td colSpan={5} className="text-center py-32">
  <div className="flex flex-col items-center animate-pulse">
  <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4"/>
  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
  Cargando directorio...
  </p>
  </div>
  </td>
  </tr>
  ) : filtered.length === 0 ? (
  <tr>
  <td colSpan={5} className="text-center py-32 text-foreground">
  <div className="flex flex-col items-center opacity-30">
  <Contact className="h-16 w-16 mb-4"strokeWidth={1} />
  <p className="font-black uppercase tracking-[0.4em] text-[10px]">
  {search ? 'No hay resultados' : 'Aún no hay clientes registrados'}
  </p>
  </div>
  </td>
  </tr>
  ) : (
  filtered.map(c => (
  <tr key={c.id} className="hover:bg-muted transition-colors group">
  {/* Nombre + inicial */}
  <td className="px-8 py-5 whitespace-nowrap">
  <div className="flex items-center gap-4">
  <div className="h-11 w-11 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-black text-sm font-outfit shadow-lg shadow-brand-500/5 group-hover:scale-110 transition-transform">
  {(c.name || 'C').charAt(0).toUpperCase()}
  </div>
  <div>
  <p className="font-black text-foreground uppercase tracking-tight font-outfit group-hover:text-brand-500 dark:group-hover:text-foreground transition-colors">
  {c.name}
  </p>
  {c.notes && (
  <p className="text-[9px] text-muted-foreground font-bold italic truncate max-w-[180px]">
  {c.notes}
  </p>
  )}
  </div>
  </div>
  </td>

  {/* Documento */}
  <td className="px-8 py-5 hidden md:table-cell">
  {c.document_number ? (
  <div className="flex flex-col">
  <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">{c.document_type}</span>
  <span className="text-sm font-bold text-foreground font-mono">{c.document_number}</span>
  </div>
  ) : (
  <span className="text-muted-foreground text-xs">—</span>
  )}
  </td>

  {/* Contacto */}
  <td className="px-8 py-5">
  <div className="flex flex-col gap-1">
  {c.email && (
  <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
  <Mail className="h-3 w-3 text-brand-500 shrink-0"/>
  <span className="lowercase truncate max-w-[160px]">{c.email}</span>
  </div>
  )}
  {c.phone && (
  <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
  <Phone className="h-3 w-3 text-emerald-500 shrink-0"/>
  {c.phone}
  </div>
  )}
  {!c.email && !c.phone && (
  <span className="text-muted-foreground text-xs">Sin contacto</span>
  )}
  </div>
  </td>

  {/* Dirección */}
  <td className="px-8 py-5 hidden md:table-cell text-muted-foreground text-xs font-bold">
  {c.address || <span className="text-muted-foreground">—</span>}
  </td>

  {/* Acciones */}
  <td className="px-8 py-5 text-right">
  <div className="flex justify-end gap-2 opacity-20 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
  <button
  onClick={() => openEdit(c)}
  className="p-3 bg-muted text-muted-foreground hover:text-brand-500 hover:bg-brand-500/10 rounded-xl border border-transparent hover:border-brand-500/20 transition-all"
  title="Editar cliente"
  >
  <Pencil className="h-4 w-4"strokeWidth={2.5} />
  </button>
  <button
  onClick={() => handleDelete(c.id)}
  className="p-3 bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all"
  title="Eliminar cliente"
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
  {customers.length} CLIENTE(S) REGISTRADO(S) — GKAD STOCK CRM V1
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
        <UserPlus className="h-6 w-6"/>
      </div>
      <div>
        <h3 className="font-black text-2xl text-foreground font-outfit uppercase tracking-tight margin: 0">
          {editingId ? 'EDITAR' : 'NUEVO'} <span style={{ color: 'var(--brand-primary)' }}>CLIENTE</span>
        </h3>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--brand-primary)', margin: 0 }}>
          {editingId ? 'Actualizar datos del directorio' : 'Registro en el directorio comercial'}
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

  {/* Nombre completo */}
  <FieldGroup label="Nombre / Razón Social" required error={errors.name}>
  <input
  id="customer-name"
  type="text"
  placeholder="Ej. María García Ltda."
  value={form.name}
  onChange={e => { f('name', e.target.value); if (errors.name) validateField('name', e.target.value); }}
  onBlur={e => validateField('name', e.target.value)}
  required
  className={`w-full h-14 bg-card border ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-brand-500'} rounded-2xl px-6 text-sm font-bold focus:ring-2 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm`}
  />
  </FieldGroup>

  {/* Documento */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FieldGroup label="Tipo de Documento">
  <select
  id="customer-doc-type"
  value={form.document_type || ''}
  onChange={e => f('document_type', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none shadow-sm appearance-none"
  >
  {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
  </select>
  </FieldGroup>
  <FieldGroup label="Número de Documento" error={errors.document_number}>
  <div className="relative">
  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="customer-doc-number"
  type="text"
  placeholder="12345678"
  value={form.document_number}
  onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
  }}
  onChange={e => { f('document_number', e.target.value); if (errors.document_number) validateField('document_number', e.target.value); }}
  onBlur={e => validateField('document_number', e.target.value)}
  className={`w-full h-14 bg-card border ${errors.document_number ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-brand-500'} rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 transition-all text-foreground outline-none placeholder:text-muted-foreground font-mono shadow-sm`}
  />
  </div>
  </FieldGroup>
  </div>

  {/* Email y Teléfono */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FieldGroup label="Correo Electrónico" error={errors.email}>
  <div className="relative">
  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="customer-email"
  type="email"
  placeholder="cliente@empresa.com"
  value={form.email}
  onChange={e => { f('email', e.target.value); if (errors.email) validateField('email', e.target.value); }}
  onBlur={e => validateField('email', e.target.value)}
  className={`w-full h-14 bg-card border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-brand-500'} rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 transition-all text-foreground outline-none placeholder:text-muted-foreground font-mono shadow-sm`}
  />
  </div>
  </FieldGroup>
  <FieldGroup label="Teléfono / Celular" error={errors.phone}>
  <div className="relative">
  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="customer-phone"
  type="text"
  placeholder="300 000 0000"
  value={form.phone}
  onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
  }}
  onChange={e => { f('phone', e.target.value); if (errors.phone) validateField('phone', e.target.value); }}
  onBlur={e => validateField('phone', e.target.value)}
  className={`w-full h-14 bg-card border ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-brand-500'} rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm`}
  />
  </div>
  </FieldGroup>
  </div>

  {/* Dirección */}
  <FieldGroup label="Dirección">
  <div className="relative">
  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
  <input
  id="customer-address"
  type="text"
  placeholder="Cll 123 #45-67, Ciudad"
  value={form.address}
  onChange={e => f('address', e.target.value)}
  className="w-full h-14 bg-card border border-border rounded-2xl pl-11 pr-6 text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all text-foreground outline-none placeholder:text-muted-foreground shadow-sm"
  />
  </div>
  </FieldGroup>

  {/* Notas */}
  <FieldGroup label="Notas Internas">
  <div className="relative">
  <FileText className="absolute left-4 top-4 h-4 w-4 text-muted-foreground"/>
  <textarea
  id="customer-notes"
  placeholder="Cliente frecuente, preferencias, observaciones..."
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
  {editingId ? 'ACTUALIZAR CLIENTE' : 'REGISTRAR CLIENTE'}
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
 error,
 children,
}: {
 label: string;
 required?: boolean;
 error?: string;
 children: React.ReactNode;
}) => (
 <div className="space-y-2">
 <label
 htmlFor={`customer-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2"
 >
 {label}{required && <span className="text-brand-500 ml-1">*</span>}
 </label>
 {children}
 {error && <span className="text-xs text-red-500 ml-2 font-medium">{error}</span>}
 </div>
);
