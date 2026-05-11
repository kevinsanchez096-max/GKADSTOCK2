import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

// BOTÓN PREMIUM V5
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
 size?: 'sm' | 'md' | 'lg' | 'icon';
 loading?: boolean;
 icon?: LucideIcon;
}

export const Button = ({
 className,
 variant = 'primary',
 size = 'md',
 loading,
 icon: Icon,
 children,
 ...props
}: ButtonProps) => {
 const variants = {
 primary: 'bg-brand-600 text-white hover:bg-brand-500 shadow-xl shadow-brand-600/30 hover:shadow-2xl hover:shadow-brand-600/50 active:scale-95 border border-brand-400/20',
 secondary: 'bg-muted text-foreground hover:brightness-95 dark:hover:brightness-110 active:scale-95',
 outline: 'border border-border bg-transparent hover:bg-muted active:scale-95 text-foreground',
 ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
 danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm shadow-red-500/20',
 };

 const sizes = {
 sm: 'h-8 px-3 text-xs',
 md: 'h-10 px-4 text-sm',
 lg: 'h-12 px-6 text-base',
 icon: 'h-10 w-10 flex items-center justify-center',
 };

 return (
 <button
 className={cn(
 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none',
 variants[variant],
 sizes[size],
 className
 )}
 disabled={loading || props.disabled}
 {...props}
 >
 {loading ? (
 <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>
 ) : Icon ? (
 <Icon className={cn('h-4 w-4', children && 'mr-2')} />
 ) : null}
 {children}
 </button>
 );
};

// INPUT PREMIUM V5
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
 label?: string;
 error?: string;
 helperText?: string;
 icon?: LucideIcon;
}

export const Input = ({ label, error, helperText, icon: Icon, className, onChange, ...props }: InputProps) => {
 // Guard: si recibimos `value` sin `onChange` y sin `readOnly`, inyectamos readOnly
 // para silenciar el warning de React"controlled input without onChange handler".
 const isReadOnly =
 props.readOnly ||
 (props.value !== undefined && props.value !== null && !onChange);

 // Genera un id estable para vincular <label htmlFor> con el <input id>
 // Prioridad: id explícito del caller → derivado del label → derivado del name
 const inputId =
 props.id ||
 (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined) ||
 props.name;

 return (
 <div className="w-full space-y-2">
 {label && <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{label}</label>}
 <div className="relative group">
 {Icon && (
 <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors"/>
 )}
 <input
 id={inputId}
 className={cn(
 'flex h-11 w-full rounded-xl border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium transition-all duration-300 shadow-inner',
 'bg-background border-input text-foreground placeholder:text-muted-foreground',
 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
 'disabled:cursor-not-allowed disabled:opacity-50',
 Icon && 'pl-10',
 error && 'border-red-500 focus-visible:ring-red-500',
 isReadOnly && !onChange && 'cursor-default',
 className
 )}
 onChange={onChange}
 readOnly={isReadOnly}
 {...props}
 />
 </div>
 {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
 {!error && helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
 </div>
 );
};

// CARD PREMIUM V5
export const Card = ({ children, className, ...props }: any) => {
 return (
 <div 
 className={cn('backdrop-blur-xl border rounded-2xl shadow-sm transition-all duration-300 bg-card border-border text-card-foreground', className)}
 {...props}
 >
 {children}
 </div>
 );
};
