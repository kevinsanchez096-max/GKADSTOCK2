import { parseISO, format } from 'date-fns';
import Barcode from 'react-barcode';

interface PrintableTicketProps {
 sale: any;
 profile: any;
}

export const PrintableTicket = ({ sale, profile }: PrintableTicketProps) => {
 if (!sale) return null;

 // Helper de Seguridad: Parseo de Items (Soporta JSON string o Array)
 const getSafeItems = (itemsInput: any) => {
 try {
 if (!itemsInput) return [];
 if (Array.isArray(itemsInput)) return itemsInput;
 if (typeof itemsInput === 'string') {
 const parsed = JSON.parse(itemsInput);
 return Array.isArray(parsed) ? parsed : [];
 }
 return [];
 } catch (e) {
 console.error('[PrintableTicket] Error al parsear items:', e);
 return [];
 }
 };

 // Helper de Seguridad: Formateo de Fecha
 const getSafeDate = (dateInput: any) => {
 try {
 if (!dateInput) return format(new Date(), 'dd/MM/yyyy HH:mm');
 const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
 return format(date, 'dd/MM/yyyy HH:mm:ss a');
 } catch (e) {
 return dateInput?.toLocaleString() || new Date().toLocaleString();
 }
 };

 const items = getSafeItems(sale.items);
 const org = profile?.organizations || profile || {};
 const isReturned = sale.status === 'returned' || sale.status === 'partially_returned';
 
 return (
 <div 
 id="receipt-printer"
 className="receipt-screen-hidden font-mono text-[10px] text-black bg-card list-none"
 style={{ width: '80mm', padding: '4mm', boxSizing: 'border-box' }}
 >
 
 {/* 1. SECCIÓN IDENTIDAD DEL LOCAL (ESTILO IMAGEN 1) */}
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2mm' }}>
 {org.logo_url && (
 <img 
 src={org.logo_url} 
 alt="Logo"
 style={{ width: '30mm', height: '30mm', borderRadius: '50%', marginBottom: '4mm', objectFit: 'cover' }} 
 />
 )}
 
 <div style={{ fontWeight: '900', fontSize: '15px', textTransform: 'uppercase', width: '100%', marginBottom: '1mm' }}>
 {org.name || org.organization_name || 'GKAD STOCK'}
 </div>
 
 <div style={{ width: '100%', fontSize: '11px' }}>
 {org.address || 'Carrera 123 #45-67'}
 </div>
 
 <div style={{ width: '100%', fontSize: '11px' }}>
 NIT: {org.tax_id || '900.567.890-1'}
 </div>
 
 <div style={{ width: '100%', fontSize: '11px' }}>
 TEL: {org.phone || '300 000 0000'}
 </div>

 {/* LÍNEA SÓLIDA GRUESA (Regla 2) */}
 <div style={{ width: '100%', borderTop: '2.5px solid #000', margin: '3mm 0' }}></div>
 </div>

 {/* 2. INFORMACIÓN DE LA FACTURA */}
 <div style={{ width: '100%', marginBottom: '1mm' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', textTransform: 'uppercase' }}>
 <span>{isReturned ? 'FOLIO DEV:' : 'FACTURA:'}</span>
 <span>#{sale.id?.substring(0, 8).toUpperCase() || 'FBD7A015'}</span>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase' }}>
 <span>FECHA:</span>
 <span>{getSafeDate(sale.created_at || sale.date)}</span>
 </div>
 </div>

 {/* SEPARADOR DASHED DEBAJO DE FECHA (Regla 1) */}
 <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>

 {/* 3. TABLA DE PRODUCTOS (REGLA 3: UNIDADES FRUVER) */}
 <div style={{ width: '100%' }}>
 {/* ENCABEZADOS ARRIBA/ABAJO DASHED (Regla 1) */}
 <div style={{ 
 display: 'flex', 
 justifyContent: 'space-between', 
 fontWeight: '900', 
 fontSize: '9px', 
 borderTop: '1px dashed #000',
 borderBottom: '1px dashed #000',
 padding: '1.5mm 0',
 marginBottom: '2mm',
 textTransform: 'uppercase'
 }}>
 <span style={{ flex: '1.5' }}>DESCRIPCIÓN</span>
 <span style={{ flex: '0.6', textAlign: 'center' }}>CANT</span>
 <span style={{ flex: '0.7', textAlign: 'right' }}>P.UNIT</span>
 <span style={{ flex: '0.7', textAlign: 'right' }}>TOTAL</span>
 </div>

 {items.map((item: any, idx: number) => {
 const qty = Number(item.quantity) || 0;
 const price = Number(item.price) || 0;
 const subtotal = Number(item.subtotal) || (qty * price);
 // HÍBRIDO: CANT en lb. pero P.UNIT en /kg por requerimiento de usuario
 const unit = Number.isInteger(qty) ? 'unid.' : 'lb.';
 const displayQty = Number.isInteger(qty) ? qty : qty.toFixed(3);

 return (
 <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5mm', alignItems: 'flex-start', fontSize: '10px' }}>
 <div style={{ flex: '1.5', textTransform: 'uppercase', paddingRight: '1mm', wordBreak: 'break-word', fontWeight: 'bold' }}>
 {item.name || item.product_name || 'Producto'}
 </div>
 <div style={{ flex: '0.6', textAlign: 'center', fontStyle: 'italic' }}>
 {displayQty} {unit}
 </div>
 <div style={{ flex: '0.7', textAlign: 'right' }}>
 ${price.toLocaleString()}{unit === 'lb.' ? '/kg' : ''}
 </div>
 <div style={{ flex: '0.7', textAlign: 'right', fontWeight: '900' }}>
 ${subtotal.toLocaleString()}
 </div>
 </div>
 );
 })}
 </div>

 {/* SEPARADOR DASHED ARRIBA DE TOTALES (Regla 1) */}
 <div style={{ borderTop: '1px dashed #000', marginTop: '2mm', paddingTop: '3mm' }}></div>

 {/* 4. TOTALES (REGLA 4: TRADUCCIÓN EFECTIVO) */}
 <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1mm', textAlign: 'right' }}>
 
 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4mm' }}>
 <span style={{ fontWeight: 'bold' }}>SUBTOTAL:</span>
 <span>${(Number(sale.subtotal) || Number(sale.total) || 0).toLocaleString()}</span>
 </div>
 
 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4mm' }}>
 <span>IVA RECAUDADO (0%):</span>
 <span>$0</span>
 </div>

 {/* TOTAL (HIGHLIGHT CON LÍNEAS SÓLIDAS) */}
 <div style={{ 
 display: 'flex', 
 justifyContent: 'flex-end', 
 gap: '4mm',
 fontSize: '18px', 
 fontWeight: '900', 
 borderTop: '2px solid #000',
 borderBottom: '2px solid #000',
 padding: '2mm 0',
 marginTop: '2mm',
 textTransform: 'uppercase'
 }}>
 <span>TOTAL:</span>
 <span>${(Number(sale.total) || 0).toLocaleString()}</span>
 </div>

 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4mm', fontSize: '14px', fontWeight: 'bold', marginTop: '2mm' }}>
 <span>RECIBIDO:</span>
 <span>${(Number(sale.amount_received) || Number(sale.total) || 0).toLocaleString()}</span>
 </div>

 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4mm', fontSize: '15px', fontWeight: '900' }}>
 <span>SU CAMBIO:</span>
 <span>${(Number(sale.change_given) || 0).toLocaleString()}</span>
 </div>

 {/* DINAMISMO EN MODO DE PAGO (Regla de Tradución) */}
 <div style={{ 
 marginTop: '4mm', 
 fontSize: '11px', 
 fontWeight: '900', 
 textTransform: 'uppercase',
 borderTop: '1px dashed #000',
 paddingTop: '3mm'
 }}>
 MODO DE PAGO: <span style={{ textDecoration: 'underline' }}>
 {(() => {
 const method = (sale.payment_method || sale.paymentType || sale.canal || 'cash').toLowerCase();
 if (method.includes('cash') || method.includes('efectivo')) return 'EFECTIVO';
 if (method.includes('transfer') || method.includes('transferencia')) return 'TRANSFERENCIA';
 if (method.includes('card') || method.includes('tarjeta')) return 'TARJETA';
 return method.toUpperCase();
 })()}
 </span>
 </div>
 </div>

 {/* 5. FOOTER Y CÓDIGO DE BARRAS */}
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', marginTop: '6mm' }}>
 
 <div style={{ fontWeight: 'bold', marginBottom: '2mm', fontSize: '11px', borderTop: '1px dashed #000', width: '100%', paddingTop: '3mm' }}>
 {org.footer_message || '¡GRACIAS POR PREFERIRNOS!'}
 </div>

 {/* BARCODE CENTRADO (ID TRUNCADO) */}
 <div style={{ background: 'white', padding: '2mm', display: 'flex', justifyContent: 'center', marginBottom: '2mm' }}>
 <Barcode 
 value={sale.id?.substring(0, 8).toUpperCase() || 'FBD7A015'} 
 width={1.6}
 height={40}
 fontSize={10}
 margin={0}
 />
 </div>

 <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
 *** VUELVA PRONTO ***
 </div>

 <div style={{ fontSize: '8px', color: '#666', marginTop: '6mm', textTransform: 'uppercase', opacity: 0.7 }}>
 GKAD STOCK POS - Sistema de Control Fruver V5.7
 </div>
 </div>
 </div>
 );
};
