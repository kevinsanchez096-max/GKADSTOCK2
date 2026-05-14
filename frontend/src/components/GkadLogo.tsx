import React from 'react';

interface GkadLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  isCollapsed?: boolean;
}

export const GkadLogo: React.FC<GkadLogoProps> = ({ 
  className = '', 
  size = 56, 
  showText = true,
  isCollapsed = false
}) => {
  const actualShowText = showText && !isCollapsed;

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {/* 
        GKAD STOCK - IDENTIDAD CORPORATIVA DE ALTA GAMA
        - Isotipo: "The System Hub" (Solidez, Estructura y Gestión Enterprise)
        - Escala: Proporción 1:1 con el bloque de texto para máxima visibilidad
        - Estética: Profesional, Limpia y de Alto Impacto
      */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Isotipo: Un símbolo sólido y equilibrado que proyecta autoridad de software real */}
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradientes Premium Controlados (No saturados) */}
            <linearGradient id="hubGreen" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#059669" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="hubBlue" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e40af" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
            
            {/* Sombra de Estructura Corporativa */}
            <filter id="corpShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2"/>
            </filter>
          </defs>

          {/* SÍMBOLO: "The System Hub" */}
          {/* Base Estructural (Gestión de Inventario) */}
          <rect x="15" y="65" width="70" height="20" rx="6" fill="url(#hubBlue)" filter="url(#corpShadow)" />
          
          {/* Columnas de Analítica y Operaciones (Sólidas y Profesionales) */}
          <rect x="25" y="40" width="12" height="25" rx="4" fill="url(#hubGreen)" />
          <rect x="44" y="25" width="12" height="40" rx="4" fill="url(#hubGreen)" />
          <rect x="63" y="10" width="12" height="55" rx="4" fill="url(#hubGreen)" />

          {/* Detalle de Interfaz de Software (Limpio y sutil) */}
          <path 
            d="M20 75H80" 
            className="stroke-slate-900 dark:stroke-white" 
            strokeWidth="2" 
            strokeOpacity="0.3" 
            strokeLinecap="round" 
          />
        </svg>
      </div>

      {actualShowText && (
        <div className="flex flex-col items-start justify-center">
          {/* NOMBRE DE MARCA: GKAD STOCK (Tipografía Dominante Enterprise) */}
          <div className="flex items-center gap-2 leading-none">
            <span className="font-black text-slate-900 dark:text-white font-outfit tracking-[-0.03em] text-[28px] uppercase">
              GKAD
            </span>
            <span className="font-black text-blue-600 dark:text-blue-500 font-outfit tracking-[-0.03em] text-[28px] uppercase">
              STOCK
            </span>
          </div>
          
          {/* TAGLINE: SYSTEM POS (Alineación Minimalista de Confianza) */}
          <div className="flex items-center justify-center gap-2 mt-3 w-full opacity-80">
            <div className="h-[1px] flex-1 bg-slate-400/30 dark:bg-slate-600/30" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.6em] whitespace-nowrap">
              SYSTEM POS
            </span>
            <div className="h-[1px] flex-1 bg-slate-400/30 dark:bg-slate-600/30" />
          </div>
        </div>
      )}
    </div>
  );
};
