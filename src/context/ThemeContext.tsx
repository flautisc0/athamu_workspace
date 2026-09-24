import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPreferencesPayload, AccentColorId, FontFamilyOption, SurfaceStyleOption, DensityOption, ProfileSectionKey } from '../types';

export const DEFAULT_PREFERENCES: UserPreferencesPayload = {
  theme_config: {
    accentColor: 'terracota-fase',
    fontFamily: 'Inter',
    surfaceStyle: 'clean-card',
    density: 'comfortable',
    bgColor: null
  },
  layout_config: {
    profile_view: {
      order: ['datos-personales', 'biografia', 'trayectoria', 'redes', 'archivos'],
      hidden: []
    },
    navbar: {
      position: 'arriba',
      estilo: 'solida',
      compacta: false,
      ocultos: [],
      orden: []
    }
  }
};

/* ---------- utilidades de color para el fondo elegido a mano ---------- */
function hexARgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const aHex = (rgb: number[]) => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** Mezcla un color con otro (factor 0..1) para derivar superficies. */
const mezclar = (rgb: number[], con: number[], f: number) => aHex(rgb.map((v, i) => v + (con[i] - v) * f));
/** Luminancia percibida: sirve para saber si el fondo es claro u oscuro. */
const esClaro = (rgb: number[]) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.6;

interface ThemeContextType {
  preferences: UserPreferencesPayload;
  updateThemeConfig: (config: Partial<UserPreferencesPayload['theme_config']>) => void;
  updateLayoutConfig: (layout: Partial<UserPreferencesPayload['layout_config']['profile_view']>) => void;
  /** Cambia la configuración de la barra de navegación (parcial). */
  updateNavbarConfig: (config: Partial<NonNullable<UserPreferencesPayload['layout_config']['navbar']>>) => void;
  savePreferencesToCloud: () => Promise<void>;
  saveStatus: 'Sincronizado Cloud' | 'Guardando...' | 'Modificado sin guardar' | 'Error';
  isDesignPanelOpen: boolean;
  setDesignPanelOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hub del ecosistema (antes: atha-producciones-app, ya dado de baja).
const BACKEND_URL = ((import.meta.env as any)?.VITE_BACKEND_URL as string) || 'https://atha-crm-web-frontend-897089213264.us-central1.run.app';

export const ThemeProvider: React.FC<{ children: ReactNode; userId?: string }> = ({ children, userId = usuarioSesionId() || 'invitado' }) => {
  const [preferences, setPreferences] = useState<UserPreferencesPayload>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`fase_user_prefs_${userId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Error reading preferences from localStorage:', e);
      }
    }
    return DEFAULT_PREFERENCES;
  });

  const [saveStatus, setSaveStatus] = useState<'Sincronizado Cloud' | 'Guardando...' | 'Modificado sin guardar' | 'Error'>('Sincronizado Cloud');
  const [isDesignPanelOpen, setDesignPanelOpen] = useState(false);

  // Sync preferences to DOM root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const { accentColor, fontFamily, surfaceStyle, density } = preferences.theme_config;

    root.setAttribute('data-accent', accentColor);
    root.setAttribute('data-surface', surfaceStyle);
    root.setAttribute('data-density', density);
    root.style.setProperty('--font-primary', fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : fontFamily === 'JetBrains Mono' ? '"JetBrains Mono", monospace' : '"Inter", sans-serif');

    const isDia = root.getAttribute('data-theme') === 'dia';
    const accentColorMapDark: Record<string, { bgBase: string; bgSurface: string; bgCard: string; accent: string; glow: string; accent2: string; border: string; textSecondary: string }> = {
      'terracota-fase': { bgBase: '#140D0C', bgSurface: '#1E110F', bgCard: '#251513', accent: '#E05A47', glow: '#FF6B4A', accent2: '#6EE7B7', border: '#3E221E', textSecondary: '#D4B2AD' },
      'ambar-escenico': { bgBase: '#12100E', bgSurface: '#1C1814', bgCard: '#26211C', accent: '#D97706', glow: '#F59E0B', accent2: '#6EE7B7', border: '#3A2C1A', textSecondary: '#C9B79B' },
      'naranja-corporativo': { bgBase: '#140E0C', bgSurface: '#1F1410', bgCard: '#2B1C17', accent: '#F97316', glow: '#FB923C', accent2: '#6EE7B7', border: '#3B2417', textSecondary: '#CBB19E' },
      'gris-industrial': { bgBase: '#0F1115', bgSurface: '#171A21', bgCard: '#1E232D', accent: '#64748B', glow: '#94A3B8', accent2: '#7DD3FC', border: '#2A3242', textSecondary: '#AAB4C4' },
      'esmeralda-creativa': { bgBase: '#0B1310', bgSurface: '#111D18', bgCard: '#172821', accent: '#10B981', glow: '#34D399', accent2: '#6EE7B7', border: '#1E3A2F', textSecondary: '#A7C4B8' }
    };
    const accentColorMapLight: Record<string, { bgBase: string; bgSurface: string; bgCard: string; accent: string; glow: string; accent2: string; border: string; textSecondary: string }> = {
      'terracota-fase': { bgBase: '#F8F6F4', bgSurface: '#FFFFFF', bgCard: '#FFFFFF', accent: '#C84835', glow: '#E0684F', accent2: '#0F766E', border: '#E5DDD8', textSecondary: '#6B5B56' },
      'ambar-escenico': { bgBase: '#FAF8F5', bgSurface: '#FFFFFF', bgCard: '#FFFFFF', accent: '#B45309', glow: '#D97706', accent2: '#0F766E', border: '#EDE4D8', textSecondary: '#6B5F4D' },
      'naranja-corporativo': { bgBase: '#FFF9F5', bgSurface: '#FFFFFF', bgCard: '#FFFFFF', accent: '#EA580C', glow: '#F97316', accent2: '#0F766E', border: '#F0E1D6', textSecondary: '#6B5346' },
      'gris-industrial': { bgBase: '#F8FAFC', bgSurface: '#FFFFFF', bgCard: '#FFFFFF', accent: '#475569', glow: '#64748B', accent2: '#0369A1', border: '#E2E8F0', textSecondary: '#5A6675' },
      'esmeralda-creativa': { bgBase: '#F0FDF4', bgSurface: '#FFFFFF', bgCard: '#FFFFFF', accent: '#059669', glow: '#10B981', accent2: '#0F766E', border: '#D6EFDF', textSecondary: '#4F6B5E' }
    };
    const palette = isDia ? (accentColorMapLight[accentColor] || accentColorMapLight['terracota-fase']) : (accentColorMapDark[accentColor] || accentColorMapDark['terracota-fase']);
    if (palette) {
      root.style.setProperty('--bg-base', palette.bgBase);
      root.style.setProperty('--bg-surface', palette.bgSurface);
      root.style.setProperty('--bg-card', palette.bgCard);
      root.style.setProperty('--bg-elevated', palette.bgSurface);
      root.style.setProperty('--accent-terracota', palette.accent);
      root.style.setProperty('--accent-glow', palette.glow);
      root.style.setProperty('--accent-2', palette.accent2);
      root.style.setProperty('--border-color', palette.border);
      root.style.setProperty('--border-subtle', palette.border);
      root.style.setProperty('--text-secondary', palette.textSecondary);
    }

    // ---- COLOR DE FONDO ELEGIDO A MANO ----
    // Si el usuario eligió un fondo, manda ese; y las superficies/tarjetas se
    // derivan de él para que la interfaz quede coherente.
    const bgElegido = preferences.theme_config?.bgColor;
    if (bgElegido && /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(bgElegido.trim())) {
      const rgb = hexARgb(bgElegido);
      const claro = esClaro(rgb);
      root.style.setProperty('--bg-base', aHex(rgb));
      root.style.setProperty('--bg-surface', claro ? '#FFFFFF' : mezclar(rgb, [255, 255, 255], 0.06));
      root.style.setProperty('--bg-card', claro ? '#FFFFFF' : mezclar(rgb, [255, 255, 255], 0.11));
      root.style.setProperty('--bg-elevated', claro ? mezclar(rgb, [0, 0, 0], 0.04) : mezclar(rgb, [255, 255, 255], 0.16));
    }

    // ---- BARRA DE NAVEGACIÓN (la aplica el Navbar leyendo el contexto) ----
    const nav = preferences.layout_config?.navbar || { position: 'arriba', estilo: 'solida', compacta: false };
    root.setAttribute('data-nav-pos', nav.position || 'arriba');
    root.setAttribute('data-nav-estilo', nav.estilo || 'solida');
    root.setAttribute('data-nav-compacta', nav.compacta ? 'si' : 'no');

    try {
      localStorage.setItem(`fase_user_prefs_${userId}`, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Error saving preferences to localStorage:', e);
    }
  }, [preferences, userId]);

  // Initial GET from Cloud SQL / backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCloudPreferences = async () => {
      try {
        const res = await fetch(`${BACKEND_URL.replace(/\/+$/, '')}/api/users/${userId}/preferences`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.theme_config && data.layout_config) {
            setPreferences(data);
            setSaveStatus('Sincronizado Cloud');
          }
        }
      } catch (err) {
        // Fallback gracefully to localStorage or defaults if network is offline
        console.warn('Cloud SQL preferences fetch skipped or offline, using local/default state:', err);
      }
    };
    fetchCloudPreferences();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const updateNavbarConfig = (config: Partial<NonNullable<UserPreferencesPayload['layout_config']['navbar']>>) => {
    setPreferences(prev => ({
      ...prev,
      layout_config: {
        ...prev.layout_config,
        navbar: {
          ...(prev.layout_config?.navbar || { position: 'arriba', estilo: 'solida', compacta: false, ocultos: [], orden: [] }),
          ...config
        }
      }
    }));
    setSaveStatus('Modificado sin guardar');
  };

  const updateThemeConfig = (config: Partial<UserPreferencesPayload['theme_config']>) => {
    setPreferences(prev => ({
      ...prev,
      theme_config: { ...prev.theme_config, ...config }
    }));
    setSaveStatus('Modificado sin guardar');
  };

  const updateLayoutConfig = (layout: Partial<UserPreferencesPayload['layout_config']['profile_view']>) => {
    setPreferences(prev => ({
      ...prev,
      layout_config: {
        profile_view: {
          ...prev.layout_config.profile_view,
          ...layout
        }
      }
    }));
    setSaveStatus('Modificado sin guardar');
  };

  const savePreferencesToCloud = async () => {
    setSaveStatus('Guardando...');
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/+$/, '')}/api/users/${userId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (res.ok) {
        // Simulate successful cloud synchronization for SPA resilience
        await new Promise(r => setTimeout(r, 600));
        setSaveStatus('Sincronizado Cloud');
      } else {
        throw new Error('Error al sincronizar con Cloud SQL');
      }
    } catch (err) {
      console.warn('Cloud PUT error, saving locally:', err);
      await new Promise(r => setTimeout(r, 500));
      setSaveStatus('Guardado local (sin conexion)');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        updateThemeConfig,
        updateLayoutConfig,
        updateNavbarConfig,
        savePreferencesToCloud,
        saveStatus,
        isDesignPanelOpen,
        setDesignPanelOpen
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
