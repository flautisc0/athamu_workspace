import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { AccentColorId, FontFamilyOption, SurfaceStyleOption, DensityOption, ProfileSectionKey } from '../types';
import {
  X,
  Palette,
  Type,
  Layout,
  Sliders,
  Check,
  RefreshCw,
  Sparkles,
  Shield,
  GripVertical,
  Eye,
  EyeOff,
  CloudCheck,
  PaintBucket,
  Navigation
} from 'lucide-react';

interface DesignPanelProps {
  theme?: 'terracota' | 'dia';
}

const ACCENT_SCHEMES: { id: AccentColorId; name: string; colorClass: string; bgBadge: string; desc: string }[] = [
  {
    id: 'terracota-fase',
    name: 'Terracota F.A.S.E (Institucional)',
    colorClass: 'bg-[var(--accent-terracota)]',
    bgBadge: 'border-[var(--accent-terracota)]/40 text-[var(--accent-glow)]',
    desc: 'Tono insignia ATHA / F.A.S.E para salas y teatros'
  },
  {
    id: 'ambar-escenico',
    name: 'Ámbar Escénico',
    colorClass: 'bg-[#D97706]',
    bgBadge: 'border-amber-500/40 text-amber-500',
    desc: 'Inspirado en iluminación tungsteno de escena'
  },
  {
    id: 'naranja-corporativo',
    name: 'Naranja Corporativo VIVO',
    colorClass: 'bg-[#F97316]',
    bgBadge: 'border-orange-500/40 text-orange-500',
    desc: 'Alta visibilidad para gestión de giras y FONDART'
  },
  {
    id: 'gris-industrial',
    name: 'Gris Industrial R&D',
    colorClass: 'bg-[#64748B]',
    bgBadge: 'border-slate-500/40 text-slate-400',
    desc: 'Neutral técnico para directores y sonidistas'
  },
  {
    id: 'esmeralda-creativa',
    name: 'Esmeralda Creación',
    colorClass: 'bg-[#10B981]',
    bgBadge: 'border-emerald-500/40 text-emerald-400',
    desc: 'Enfocado en innovación escénica y laboratorios'
  }
];

/** Fondos sugeridos (el usuario también puede elegir cualquier color). */
const BACKGROUNDS: { color: string; nombre: string }[] = [
  { color: 'var(--bg-base)', nombre: 'Grafito' },
  { color: '#140D0C', nombre: 'Bodega' },
  { color: '#0B1310', nombre: 'Escénico' },
  { color: '#101820', nombre: 'Noche' },
  { color: '#1A1512', nombre: 'Tierra' },
  { color: '#F5F3F0', nombre: 'Humo (claro)' },
  { color: '#FAF8F5', nombre: 'Papel (claro)' },
];

/** Accesos de la barra de navegación (ids reales del Navbar). */
const NAVBAR_ITEMS: { id: string; label: string }[] = [
  { id: 'inicio', label: 'Dashboard' },
  { id: 'companias', label: 'Compañías / Agrupaciones' },
  { id: 'obras', label: 'Catálogo de Obras' },
  { id: 'crm', label: 'CRM Leads' },
  { id: 'ventas', label: 'Ventas & Pitching' },
  { id: 'venues', label: 'Salas & Venues' },
  { id: 'inventario', label: 'Inventario Backline' },
  { id: 'finanzas', label: 'Finanzas & Rendiciones' },
  { id: 'riders', label: 'Riders Técnicos' },
  { id: 'planner', label: 'Planner (app real)' },
  { id: 'arquitecto', label: 'Arquitecto (app real)' },
  { id: 'ecosistema', label: 'Ecosistema ATHA' },
  { id: 'admin', label: 'Administración' },
];

const FONTS: { id: FontFamilyOption; label: string; sample: string }[] = [
  { id: 'Inter', label: 'Inter (Sans-serif moderno)', sample: 'Tipografía principal para UI y CRM' },
  { id: 'Playfair Display', label: 'Playfair Display (Editorial Clásica)', sample: 'Estilo teatral de alta elegancia' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono (Técnico Monospaced)', sample: 'Ideal para riders y código' }
];

const SECTION_LABELS: Record<ProfileSectionKey, string> = {
  'datos-personales': 'Datos Personales y Contacto',
  'biografia': 'Biografía Ejecutiva & Artística',
  'trayectoria': 'Trayectoria & Hitos FONDART / Giras',
  'redes': 'Redes Sociales & Enlaces',
  'archivos': 'Portafolio & Dossieres (PDF)'
};

export const DesignPanel: React.FC<DesignPanelProps> = ({ theme = 'terracota' }) => {
  const { preferences, updateThemeConfig, updateLayoutConfig, savePreferencesToCloud, saveStatus, isDesignPanelOpen, setDesignPanelOpen,
  updateNavbarConfig,
} = useTheme();
  const [activeTab, setActiveTab] = useState<'theme' | 'typography' | 'layout'>('theme');
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [panelDraggedKey, setPanelDraggedKey] = useState<ProfileSectionKey | null>(null);

  const isLight = theme === 'dia';

  const navbarCfg = preferences.layout_config.navbar || {
    position: 'arriba' as const, estilo: 'solida' as const, compacta: false, ocultos: [], orden: [],
  };

  if (!isDesignPanelOpen) return null;

  const handleSave = async () => {
    setIsSavingLocal(true);
    await savePreferencesToCloud();
    setIsSavingLocal(false);
  };

  const handlePanelDragStart = (e: React.DragEvent, key: ProfileSectionKey) => {
    setPanelDraggedKey(key);
    e.dataTransfer.setData('text/plain', key);
  };

  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePanelDrop = (e: React.DragEvent, targetKey: ProfileSectionKey) => {
    e.preventDefault();
    if (!panelDraggedKey || panelDraggedKey === targetKey) return;

    const order = [...preferences.layout_config.profile_view.order];
    const draggedIdx = order.indexOf(panelDraggedKey);
    const targetIdx = order.indexOf(targetKey);

    if (draggedIdx > -1 && targetIdx > -1) {
      order.splice(draggedIdx, 1);
      order.splice(targetIdx, 0, panelDraggedKey);
      updateLayoutConfig({ order });
    }
    setPanelDraggedKey(null);
  };

  const toggleSectionVisibility = (sectionKey: ProfileSectionKey) => {
    const hidden = [...preferences.layout_config.profile_view.hidden];
    const idx = hidden.indexOf(sectionKey);
    if (idx > -1) {
      hidden.splice(idx, 1);
    } else {
      hidden.push(sectionKey);
    }
    updateLayoutConfig({ hidden });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md h-full flex flex-col shadow-2xl border-l transition-all pointer-events-auto ${
          isLight
            ? 'bg-[#FAF8F6] border-stone-200 text-stone-900 shadow-stone-400/20'
            : 'bg-[#160E0D] border-[var(--border-color)] text-[#FDF5F4] shadow-black/80'
        }`}
      >
        {/* Panel Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight ? 'bg-white border-stone-200' : 'bg-[#1A100F] border-[var(--border-color)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isLight ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)]/20 text-[var(--accent-terracota)]' : 'bg-[var(--accent-terracota)]/15 border-[var(--accent-terracota)]/30 text-[var(--accent-glow)]'
              }`}
            >
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Sistema de Diseño F.A.S.E</h2>
              <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                Personalización controlada & SQL Payload Sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDesignPanelOpen(false)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-stone-400 hover:bg-stone-100 hover:text-stone-800' : 'text-stone-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div
          className={`px-6 py-2.5 border-b flex items-center justify-between text-xs font-mono ${
            isLight ? 'bg-stone-100/80 border-stone-200 text-stone-600' : 'bg-[#1C100F] border-[var(--border-color)] text-[var(--text-secondary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'Sincronizado Cloud'
                  ? 'bg-emerald-500'
                  : saveStatus === 'Modificado sin guardar'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-blue-500 animate-spin'
              }`}
            />
            <span>{saveStatus}</span>
          </div>
          <span className="text-[10px] opacity-75">Cloud SQL JSONB</span>
        </div>

        {/* Navigation Tabs */}
        <div className={`grid grid-cols-3 p-2 gap-1 border-b ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#140C0B] border-[var(--border-color)]'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'theme'
                ? isLight ? 'bg-white shadow-xs text-[var(--accent-terracota)]' : 'bg-[#251513] text-[var(--accent-glow)]'
                : isLight ? 'text-stone-600 hover:bg-stone-200/50' : 'text-stone-400 hover:bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Colores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'typography'
                ? isLight ? 'bg-white shadow-xs text-[var(--accent-terracota)]' : 'bg-[#251513] text-[var(--accent-glow)]'
                : isLight ? 'text-stone-600 hover:bg-stone-200/50' : 'text-stone-400 hover:bg-white/5'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Tipografía</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'layout'
                ? isLight ? 'bg-white shadow-xs text-[var(--accent-terracota)]' : 'bg-[#251513] text-[var(--accent-glow)]'
                : isLight ? 'text-stone-600 hover:bg-stone-200/50' : 'text-stone-400 hover:bg-white/5'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Layout</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
          {activeTab === 'theme' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--accent-terracota)]" />
                  <span>Brand-Safe Color Schemes</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  Paletas institucionales curadas con alto contraste certificado (WCAG AA).
                </p>
              </div>

              <div className="space-y-2.5">
                {ACCENT_SCHEMES.map(scheme => {
                  const isSelected = preferences.theme_config.accentColor === scheme.id;
                  return (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() => updateThemeConfig({ accentColor: scheme.id })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? isLight
                            ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] shadow-xs'
                            : 'bg-[var(--accent-terracota)]/20 border-[var(--accent-terracota)] shadow-xs'
                          : isLight
                          ? 'bg-white hover:bg-stone-50 border-stone-200'
                          : 'bg-[var(--bg-surface)] hover:bg-white/5 border-[var(--border-color)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full ${scheme.colorClass} shadow-sm shrink-0`} />
                        <div>
                          <h4 className={`text-xs font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>{scheme.name}</h4>
                          <p className={`text-[10px] ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>{scheme.desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check className={`w-4 h-4 shrink-0 ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`} />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-black/10 dark:border-white/5 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">Estilo de Superficies</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['clean-card', 'minimal-border'] as SurfaceStyleOption[]).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateThemeConfig({ surfaceStyle: style })}
                      className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                        preferences.theme_config.surfaceStyle === style
                          ? isLight ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] text-[var(--accent-terracota)]' : 'bg-[var(--accent-terracota)]/20 border-[var(--accent-terracota)] text-[var(--accent-glow)]'
                          : isLight ? 'bg-white border-stone-200 text-stone-700' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-stone-300'
                      }`}
                    >
                      {style.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-black/10 dark:border-white/5 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">Densidad de Interfaz</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['compact', 'comfortable'] as DensityOption[]).map(dens => (
                    <button
                      key={dens}
                      type="button"
                      onClick={() => updateThemeConfig({ density: dens })}
                      className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                        preferences.theme_config.density === dens
                          ? isLight ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] text-[var(--accent-terracota)]' : 'bg-[var(--accent-terracota)]/20 border-[var(--accent-terracota)] text-[var(--accent-glow)]'
                          : isLight ? 'bg-white border-stone-200 text-stone-700' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-stone-300'
                      }`}
                    >
                      {dens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color de fondo (elegido por el usuario) */}
              <div className="pt-2 border-t border-black/10 dark:border-white/5 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <PaintBucket className="w-3.5 h-3.5 text-[var(--accent-terracota)]" /> Color de Fondo
                </label>
                <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  Elegí un tono o definí uno propio: las superficies y tarjetas se calculan solas.
                </p>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => updateThemeConfig({ bgColor: null })}
                    className={`h-9 rounded-xl border text-[10px] font-semibold transition-all cursor-pointer ${
                      !preferences.theme_config.bgColor
                        ? 'border-[var(--accent-terracota)] bg-[var(--accent-terracota)]/10 text-[var(--accent-terracota)]'
                        : isLight ? 'border-stone-200 text-stone-600' : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Del tema
                  </button>
                  {BACKGROUNDS.map(bg => (
                    <button
                      key={bg.color}
                      type="button"
                      title={bg.nombre}
                      onClick={() => updateThemeConfig({ bgColor: bg.color })}
                      style={{ backgroundColor: bg.color }}
                      className={`h-9 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                        (preferences.theme_config.bgColor || '').toLowerCase() === bg.color.toLowerCase()
                          ? 'border-[var(--accent-terracota)] scale-105'
                          : 'border-transparent hover:border-[var(--border-color)]'
                      }`}
                    >
                      {(preferences.theme_config.bgColor || '').toLowerCase() === bg.color.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Color de fondo personalizado"
                    value={preferences.theme_config.bgColor || 'var(--bg-surface)'}
                    onChange={(e) => updateThemeConfig({ bgColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="var(--bg-surface)"
                    value={preferences.theme_config.bgColor || ''}
                    onChange={(e) => updateThemeConfig({ bgColor: e.target.value })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none ${
                      isLight ? 'bg-white border-stone-200 text-stone-800' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-white'
                    }`}
                  />
                  {preferences.theme_config.bgColor && (
                    <button
                      type="button"
                      onClick={() => updateThemeConfig({ bgColor: null })}
                      title="Volver al fondo del tema"
                      className={`p-2 rounded-lg border cursor-pointer ${
                        isLight ? 'border-stone-200 text-stone-600 hover:bg-stone-100' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-white/5'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[var(--accent-terracota)]" />
                  <span>Tipografía Institucional ATHA</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  Selecciona la familia tipográfica aplicada globalmente en la SPA mediante variables CSS.
                </p>
              </div>

              <div className="space-y-3">
                {FONTS.map(font => {
                  const isSelected = preferences.theme_config.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => updateThemeConfig({ fontFamily: font.id })}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? isLight ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] shadow-xs' : 'bg-[var(--accent-terracota)]/20 border-[var(--accent-terracota)] shadow-xs'
                          : isLight ? 'bg-white hover:bg-stone-50 border-stone-200' : 'bg-[var(--bg-surface)] hover:bg-white/5 border-[var(--border-color)]'
                      }`}
                    >
                      <div>
                        <h4 className={`text-xs font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>{font.label}</h4>
                        <p className={`text-[11px] mt-0.5 opacity-80`} style={{ fontFamily: font.id === 'Playfair Display' ? 'serif' : font.id === 'JetBrains Mono' ? 'monospace' : 'sans-serif' }}>
                          {font.sample}
                        </p>
                      </div>
                      {isSelected && <Check className={`w-4 h-4 shrink-0 ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-5 animate-in fade-in duration-150">

              {/* Barra de navegación editable */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[var(--accent-terracota)]" />
                  <span>Barra de Navegación</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  Ubicación, estilo y qué accesos se muestran. Se aplica al instante.
                </p>
              </div>

              <div className="space-y-2">
                <label className={`block text-[11px] font-mono ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>Ubicación</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['arriba', 'Superior'], ['lateral', 'Lateral'], ['abajo', 'Inferior']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateNavbarConfig({ position: id })}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        navbarCfg.position === id
                          ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] text-[var(--accent-terracota)]'
                          : isLight ? 'bg-white border-stone-200 text-stone-700' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={`block text-[11px] font-mono ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>Estilo</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['solida', 'Sólida'], ['translucida', 'Translúcida'], ['minimal', 'Minimal']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateNavbarConfig({ estilo: id })}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        navbarCfg.estilo === id
                          ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] text-[var(--accent-terracota)]'
                          : isLight ? 'bg-white border-stone-200 text-stone-700' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => updateNavbarConfig({ compacta: !navbarCfg.compacta })}
                  className={`w-full p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    navbarCfg.compacta
                      ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)] text-[var(--accent-terracota)]'
                      : isLight ? 'bg-white border-stone-200 text-stone-700' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {navbarCfg.compacta ? 'Compacta: activada' : 'Compacta: desactivada'}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[11px] font-mono ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  Accesos visibles ({NAVBAR_ITEMS.length - navbarCfg.ocultos.length} de {NAVBAR_ITEMS.length})
                </label>
                {NAVBAR_ITEMS.map((it) => {
                  const visible = !navbarCfg.ocultos.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => updateNavbarConfig({
                        ocultos: visible
                          ? [...navbarCfg.ocultos, it.id]
                          : navbarCfg.ocultos.filter((x) => x !== it.id),
                      })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                        visible
                          ? isLight ? 'bg-white border-stone-200 text-stone-800' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-white'
                          : isLight ? 'bg-stone-100 border-transparent text-stone-400' : 'bg-transparent border-transparent text-[var(--text-secondary)]/50'
                      }`}
                    >
                      <span>{it.label}</span>
                      {visible ? <Eye className="w-3.5 h-3.5 opacity-70" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-[var(--accent-terracota)]" />
                  <span>Estructura de Secciones de Perfil</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  Reordena las tarjetas del perfil y oculta secciones según tus necesidades de portafolio.
                </p>
              </div>

              <div className="space-y-2">
                <p className={`text-[11px] font-mono ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                  💡 Arrastra las filas verticalmente para reordenar o usa el ícono de agarre.
                </p>
                {preferences.layout_config.profile_view.order.map((sectionKey, index) => {
                  const isHidden = preferences.layout_config.profile_view.hidden.includes(sectionKey);
                  return (
                    <div
                      key={sectionKey}
                      draggable
                      onDragStart={(e) => handlePanelDragStart(e, sectionKey)}
                      onDragOver={handlePanelDragOver}
                      onDrop={(e) => handlePanelDrop(e, sectionKey)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                        panelDraggedKey === sectionKey ? 'opacity-40 border-dashed border-[var(--accent-terracota)]' : ''
                      } ${
                        isHidden
                          ? isLight ? 'bg-stone-100 border-stone-200 opacity-60' : 'bg-[#130B0A] border-[var(--border-color)]/60 opacity-60'
                          : isLight ? 'bg-white border-stone-200 shadow-2xs hover:border-[var(--accent-terracota)]/50' : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--accent-terracota)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="w-4 h-4 text-[var(--accent-terracota)] shrink-0" />
                        <span className="text-[11px] font-mono font-bold opacity-50 shrink-0">#{index + 1}</span>
                        <span className={`text-xs font-semibold truncate ${isLight ? 'text-stone-900' : 'text-white'}`}>
                          {SECTION_LABELS[sectionKey] || sectionKey}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(sectionKey)}
                          title={isHidden ? 'Mostrar sección' : 'Ocultar sección'}
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                        >
                          {isHidden ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer with Save Button */}
        <div className={`p-4 border-t flex items-center justify-between ${isLight ? 'bg-white border-stone-200' : 'bg-[#1A100F] border-[var(--border-color)]'}`}>
          <div className="text-[11px] font-mono opacity-75">
            JSON Payload Sincronizado
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSavingLocal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 shadow-sm ${
              isLight ? 'bg-[var(--accent-terracota)] hover:bg-[#A33827]' : 'bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)]'
            }`}
          >
            {isSavingLocal ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando Cloud SQL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
