import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind de forma segura, resolviendo conflictos.
 * Ideal para el motor de temas Luxury Adaptative.
 */
export function cnTheme(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}
