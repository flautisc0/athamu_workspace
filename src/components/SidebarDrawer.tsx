import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Drama,
  FlaskConical,
  Users2,
  CalendarDays,
  Calculator,
  Award,
  Building2,
  PackageCheck,
  ReceiptText,
  BookOpenText,
  FileSpreadsheet,
  Info,
  Workflow,
  X,
  ChevronRight,
  ExternalLink,
  User as UserIcon,
  Database,
  Compass,
  Shield
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  counts: {
    obras: number;
    leads: number;
    rd: number;
    events: number;
    inventory: number;
  };
  theme?: 'terracota' | 'dia';
}

interface NavGroup {
  name: string;
  items: {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    accentColor?: string;
  }[];
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  counts,
  theme = 'terracota'
}) => {
  // Session data retrieved from localStorage under key 'user_session'
  const [userName, setUserName] = useState<string>('ATHA');
  const [userPicture, setUserPicture] = useState<string>('');

  const isLight = theme === 'dia';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_session');
        if (stored) {
          const session = JSON.parse(stored);
          if (session?.display_name && session.display_name.trim() !== '') {
            setUserName(session.display_name);
          }
          if (session?.avatar_url && session.avatar_url.trim() !== '') {
            setUserPicture(session.avatar_url);
          }
        }
      } catch {
        // Fallback to default values
      }
    }
  }, []);

  const name = userName;
  const picture = userPicture;

  const navGroups: NavGroup[] = [
    {
      name: 'Dirección & Creación',
      items: [
        { id: 'obras', label: 'Catálogo de Obras', icon: Drama, badge: counts.obras, accentColor: 'var(--accent-terracota)' },
        { id: 'arquitecto', label: 'Arquitecto de Proyectos', icon: Compass, accentColor: '#38bdf8' }
      ]
    },
    {
      name: 'Operaciones & Ensayos',
      items: [
        { id: 'planner', label: 'Planner Escénico & Giras', icon: CalendarDays, badge: 'Giras', accentColor: 'var(--accent-terracota)' },
        { id: 'crm', label: 'CRM / Leads de Salas', icon: Users2, badge: counts.leads, accentColor: '#fbbf24' }
      ]
    },
    {
      name: 'Técnica & Recursos',
      items: [
        { id: 'venues', label: 'Salas / Venues', icon: Building2, accentColor: '#38bdf8' },
        { id: 'inventario', label: 'Inventario & Backline', icon: PackageCheck, badge: counts.inventory, accentColor: 'var(--accent-2)' },
        { id: 'finanzas', label: 'Rendiciones & Finanzas', icon: ReceiptText, accentColor: '#fbbf24' },
        { id: 'riders', label: 'Riders Estándar', icon: FileSpreadsheet, accentColor: '#a78bfa' }
      ]
    },
    {
      name: 'Administración del Sitio',
      items: [
        { id: 'admin', label: 'Consola de Administración', icon: Shield, badge: 'Admin', accentColor: 'var(--accent-terracota)' },
        { id: 'sql-hub', label: 'Base de Datos SQL & Archivos PHP', icon: Database, badge: 'PostgreSQL', accentColor: '#34d399' }
      ]
    },
    {
      name: 'Equipo & Ecosistema',
      items: [
        { id: 'equipo', label: 'Equipo Fundador', icon: Award, accentColor: '#fbbf24' },
        { id: 'ecosistema', label: 'Ecosistema ATHA Apps', icon: Workflow, accentColor: 'var(--accent-terracota)' }
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Drawer Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isLight
            ? 'bg-white border-r border-[var(--border-color)] text-stone-900'
            : 'bg-[#1C1210] border-r border-[var(--border-color)] text-slate-100'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'border-[var(--border-color)] bg-[var(--bg-base)]' : 'border-[var(--border-color)] bg-[#160E0D]'
        }`}>
          <div
            onClick={() => {
              onSelectSection('inicio');
              onClose();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              isLight
                ? 'bg-[var(--accent-terracota)]/10 border border-[var(--accent-terracota)]/30 text-[var(--accent-terracota)]'
                : 'bg-[var(--accent-terracota)]/20 border border-[var(--accent-terracota)]/40 text-[var(--accent-glow)]'
            }`}>
              F
            </div>
            <div>
              <h2 className={`text-sm font-bold tracking-wide font-display ${
                isLight ? 'text-stone-900 group-hover:text-[var(--accent-terracota)]' : 'text-white group-hover:text-[var(--accent-glow)]'
              } transition-colors`}>
                F.A.S.E / ATHA
              </h2>
              <span className={`text-[10px] font-mono ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                Plataforma de Gestión Escénica
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-stone-400 hover:text-stone-900 hover:bg-stone-100'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Link to Dashboard / Inicio */}
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => {
              onSelectSection('inicio');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'inicio'
                ? isLight
                  ? 'bg-[var(--accent-terracota)] text-white shadow-sm'
                  : 'bg-[var(--accent-terracota)]/25 text-[var(--accent-glow)] border border-[var(--accent-terracota)]/40 shadow-sm'
                : isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel de Control (Dashboard)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <div className={`px-3 text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
              }`}>
                {group.name}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                        isActive
                          ? isLight
                            ? 'bg-[var(--accent-terracota)]/10 text-[var(--accent-terracota)] border border-[var(--accent-terracota)]/30 font-semibold shadow-xs'
                            : 'bg-[var(--accent-terracota)]/20 text-[var(--accent-glow)] border border-[var(--accent-terracota)]/40 font-semibold shadow-sm'
                          : isLight
                            ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-transparent'
                            : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'
                              : isLight ? 'text-stone-400 group-hover:text-stone-700' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                              isActive
                                ? isLight
                                  ? 'bg-[var(--accent-terracota)] text-white font-bold'
                                  : 'bg-[var(--accent-terracota)] text-white font-bold'
                                : isLight
                                  ? 'bg-stone-200 text-stone-700'
                                  : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isActive
                              ? isLight ? 'text-[var(--accent-terracota)] translate-x-0.5' : 'text-[var(--accent-glow)] translate-x-0.5'
                              : 'text-stone-400 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer User Profile & Footer */}
        <div className={`p-4 border-t space-y-3 ${
          isLight ? 'border-[var(--border-color)] bg-[var(--bg-base)]' : 'border-[var(--border-color)] bg-[#140B0A]'
        }`}>
          <div className="flex items-center gap-3">
            {picture ? (
              <img
                src={picture}
                alt={name}
                className="w-8 h-8 rounded-full object-cover border border-[var(--accent-terracota)]/30 shrink-0"
              />
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                isLight
                  ? 'bg-[var(--accent-terracota)]/10 text-[var(--accent-terracota)] border border-[var(--accent-terracota)]/25'
                  : 'bg-[#2A1816] text-[var(--accent-glow)] border border-[var(--accent-terracota)]/40'
              }`}>
                {name ? name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold truncate ${isLight ? 'text-stone-900' : 'text-white'}`}>{name}</p>
              <p className={`text-[10px] font-mono truncate ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>Sesión activa</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Sesión activa" />
          </div>

          <div className={`pt-2 border-t text-[10px] flex items-center justify-between font-mono ${
            isLight ? 'border-stone-200 text-stone-500' : 'border-white/5 text-slate-400'
          }`}>
            <span>F.A.S.E Escénico</span>
            <span className="text-emerald-500 font-medium">Online</span>
          </div>
        </div>

      </aside>
    </>
  );
};
