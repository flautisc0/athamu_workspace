import React from 'react';

export interface FaseLogoProps {
  variant?: 'horizontal' | 'symbol' | 'text' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light' | 'terracota' | 'azul';
  showTagline?: boolean;
  className?: string;
}

export const FaseLogo: React.FC<FaseLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'dark',
  showTagline = true,
  className = ''
}) => {
  // Dimension mapping
  const dimensions = {
    xs: { icon: 20, text: 'text-xs', height: 24, subtitle: 'text-[8px]' },
    sm: { icon: 28, text: 'text-sm', height: 32, subtitle: 'text-[9px]' },
    md: { icon: 36, text: 'text-base', height: 40, subtitle: 'text-[10px]' },
    lg: { icon: 48, text: 'text-xl', height: 52, subtitle: 'text-xs' },
    xl: { icon: 64, text: 'text-2xl', height: 68, subtitle: 'text-sm' },
  }[size];

  // Theme palettes
  // Terracota: var(--accent-terracota), Coral Vivo: var(--accent-glow), Azul FASE: #1E293B / #2563EB, Blanco: #FFFFFF
  const isTerracota = theme === 'terracota';
  const isAzul = theme === 'azul';
  const isLight = theme === 'light';

  // SVG Graphic Glyph (Símbolo F.A.S.E)
  const renderSymbol = (iconSize: number) => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
    >
      <defs>
        {/* Gradient Terracota F.A.S.E */}
        <linearGradient id="faseTerracotaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-glow)" />
          <stop offset="50%" stopColor="var(--accent-terracota)" />
          <stop offset="100%" stopColor="#C84B31" />
        </linearGradient>

        {/* Gradient Azul Escénico */}
        <linearGradient id="faseAzulGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Gradient Dorado Luz Escénica */}
        <linearGradient id="faseGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Background rounded squircle / base container */}
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="26"
        fill={
          isTerracota
            ? 'url(#faseTerracotaGrad)'
            : isAzul
            ? 'url(#faseAzulGrad)'
            : isLight
            ? '#F8FAFC'
            : '#12151C'
        }
        stroke={
          isTerracota
            ? 'rgba(255,255,255,0.25)'
            : isAzul
            ? 'rgba(255,255,255,0.2)'
            : isLight
            ? '#E2E8F0'
            : 'rgba(224, 90, 71, 0.35)'
        }
        strokeWidth="3"
      />

      {/* Phase Arcs (4 Fases de la producción escénica: Creación, Producción, Gira, Rendición) */}
      {/* Fase 1: Creación (Superior Derecha) */}
      <path
        d="M 50 18 A 32 32 0 0 1 82 50"
        stroke={isTerracota || isAzul ? '#FFFFFF' : 'url(#faseTerracotaGrad)'}
        strokeWidth="6.5"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* Fase 2: Producción (Inferior Derecha) */}
      <path
        d="M 82 58 A 32 32 0 0 1 58 82"
        stroke={isTerracota || isAzul ? '#FFFFFF' : '#38BDF8'}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Fase 3: Gira & Circulación (Inferior Izquierda) */}
      <path
        d="M 50 82 A 32 32 0 0 1 18 50"
        stroke={isTerracota || isAzul ? 'rgba(255,255,255,0.7)' : '#F59E0B'}
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Fase 4: Rendición & Síntesis (Superior Izquierda) */}
      <path
        d="M 22 42 A 32 32 0 0 1 42 20"
        stroke={isTerracota || isAzul ? 'rgba(255,255,255,0.5)' : '#10B981'}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Central Modern Glyph "F" (Estructura arquitectónica / escénica) */}
      {/* Tallo vertical del F */}
      <path
        d="M 36 28 L 36 72"
        stroke={isTerracota || isAzul ? '#FFFFFF' : '#F8FAFC'}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Barra superior del F con corte angular dinámico */}
      <path
        d="M 36 33 L 68 33"
        stroke={isTerracota || isAzul ? '#FFFFFF' : 'url(#faseTerracotaGrad)'}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Barra media del F */}
      <path
        d="M 36 49 L 58 49"
        stroke={isTerracota || isAzul ? '#FFFFFF' : '#38BDF8'}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Punto de foco / Luz de escenario (Punto superior que cierra la fase) */}
      <circle
        cx="72"
        cy="49"
        r="4"
        fill={isTerracota || isAzul ? '#FFFFFF' : 'var(--accent-glow)'}
      />
    </svg>
  );

  // If only symbol is requested
  if (variant === 'symbol') {
    return <div className={`inline-flex items-center ${className}`}>{renderSymbol(dimensions.icon)}</div>;
  }

  // If badge card variant
  if (variant === 'badge') {
    const bgClass = isTerracota
      ? 'bg-gradient-to-br from-[var(--accent-glow)] to-[#C84B31] text-white border-white/20'
      : isAzul
      ? 'bg-gradient-to-br from-[#1E3A8A] via-[#1E293B] to-[#0F172A] text-white border-blue-500/30'
      : isLight
      ? 'bg-white text-slate-900 border-slate-200'
      : 'bg-[#151921] text-white border-[var(--accent-terracota)]/30';

    return (
      <div
        className={`p-4 rounded-2xl border shadow-xl flex flex-col items-center justify-center gap-2.5 text-center ${bgClass} ${className}`}
      >
        {renderSymbol(dimensions.icon * 1.4)}
        <div className="flex items-center gap-1 font-display font-extrabold tracking-widest text-lg">
          <span>F</span>
          <span className="text-[var(--accent-glow)]">•</span>
          <span>A</span>
          <span className="text-[#38BDF8]">•</span>
          <span>S</span>
          <span className="text-[#F59E0B]">•</span>
          <span>E</span>
        </div>
        {showTagline && (
          <span className="text-[10px] tracking-wider uppercase font-mono text-slate-300 opacity-90">
            Plataforma de Gestión Escénica
          </span>
        )}
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {renderSymbol(dimensions.icon)}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-display font-black tracking-wider ${dimensions.text} ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            F<span className="text-[var(--accent-glow)]">•</span>A<span className="text-[#38BDF8]">•</span>S<span className="text-[#F59E0B]">•</span>E
          </span>
          <span className="text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--accent-terracota)]/20 text-[var(--accent-glow)] border border-[var(--accent-terracota)]/30 font-semibold">
            PRODUCCIÓN
          </span>
        </div>
        {showTagline && (
          <span
            className={`${dimensions.subtitle} font-medium mt-1 tracking-wide ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Plataforma de Gestión Escénica
          </span>
        )}
      </div>
    </div>
  );
};
