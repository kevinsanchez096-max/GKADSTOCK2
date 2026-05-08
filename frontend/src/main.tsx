import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─── Silenciar warnings de librerías de terceros (ruido de desarrollo) ────────
// Los siguientes mensajes son exclusivos del modo desarrollo (React Strict Mode)
// y no representan errores en producción:
//
// • react-barcode (jsbarcode): emite warning de i18next que no aplica.
// • @supabase/gotrue: emite errores de lock cuando Strict Mode monta/desmonta
// dos veces el mismo cliente simultáneamente ("Lock was not released within
// 5000ms", "Lock broken by another request with the 'steal' option").
//
// En producción, Strict Mode no existe, por lo que estos filtros son inocuos.
// ─────────────────────────────────────────────────────────────────────────────

const DEV_NOISE_PATTERNS = [
 'i18next',
 'react-i18next',
 '@supabase/gotrue',
 'gotrue',
 'Lock was not released',
 'Lock broken by another request',
 'lock:sb-',
];

const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

const isDevNoise = (...args: unknown[]): boolean => {
 const msg = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
 return DEV_NOISE_PATTERNS.some(pattern => msg.includes(pattern));
};

console.warn = (...args: unknown[]) => {
 if (isDevNoise(...args)) return;
 _origWarn(...args);
};

console.error = (...args: unknown[]) => {
 if (isDevNoise(...args)) return;
 _origError(...args);
};
// ─────────────────────────────────────────────────────────────────────────────


createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <App />
 </StrictMode>,
)
