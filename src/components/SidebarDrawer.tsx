import React from 'react';
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
  ExternalLink
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
  counts
}) => {
  const navGroups: NavGroup[] = [
    {
      name: 'Dirección & Creación',
      items: [
        { id: 'inicio', label: '1. Diagrama / Inicio', icon: LayoutDashboard, accentColor: '#6ee7b7' },
        { id: 'obras', label: '2. Catálogo de Obras', icon: Drama, badge: counts.obras, accentColor: '#6ee7b7' },
        { id: 'id', label: '3. Proyectos I+D', icon: FlaskConical, badge: counts.rd, accentColor: '#38bdf8' }
      ]
    },
    {
      name: 'Operaciones & Ensayos',
      items: [
        { id: 'crm', label: '4. CRM / Leads', icon: Users2, badge: counts.leads, accentColor: '#fbbf24' },
        { id: 'calendario', label: '5. Planificación / Agenda', icon: CalendarDays, badge: counts.events, accentColor: '#38bdf8' },
        { id: 'calculadora', label: '6. Calculadora de Estrenos', icon: Calculator, badge: 'Herramienta', accentColor: '#a78bfa' },
        { id: 'diario', label: '11. Diario de Proceso', icon: BookOpenText, accentColor: '#fbbf24' }
      ]
    },
    {
      name: 'Técnica & Recursos',
      items: [
        { id: 'venues', label: '8. Salas / Venues', icon: Building2, accentColor: '#38bdf8' },
        { id: 'inventario', label: '9. Inventario & Backline', icon: PackageCheck, badge: counts.inventory, accentColor: '#6ee7b7' },
        { id: 'finanzas', label: '10. Rendiciones / Finanzas', icon: ReceiptText, accentColor: '#fbbf24' },
        { id: 'riders', label: '12. Riders Estándar', icon: FileSpreadsheet, accentColor: '#a78bfa' }
      ]
    },
    {
      name: 'Compañía & Equipo',
      items: [
        { id: 'equipo', label: '7. Equipo Fundador (4)', icon: Award, accentColor: '#fbbf24' },
        { id: 'acerca', label: '13. Contexto / Acerca ATHA', icon: Info, accentColor: '#6ee7b7' }
      ]
    },
    {
      name: 'Ecosistema',
      items: [
        { id: 'ecosistema', label: 'Herramientas del Ecosistema', icon: Workflow, accentColor: '#6ee7b7' }
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
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[#161920] border-r border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12141a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6ee7b7]/15 border border-[#6ee7b7]/30 flex items-center justify-center text-[#6ee7b7] font-bold text-sm">
              ☰
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide font-display">
                ATHA PRODUCCIONES
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Menú Central de Gestión
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-[#6ee7b7]/15 text-[#6ee7b7] border border-[#6ee7b7]/30 shadow-sm font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#6ee7b7]' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                              isActive
                                ? 'bg-[#6ee7b7] text-[#0f1115] font-bold'
                                : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isActive ? 'text-[#6ee7b7] translate-x-0.5' : 'text-slate-400 opacity-0 group-hover:opacity-100'
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

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 bg-[#12141a]/60 text-[11px] text-slate-400 flex items-center justify-between">
          <div>
            <span className="text-slate-300 font-medium block">ATHA Intranet v2.5</span>
            <span>Chile • Artes Vivas</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[#6ee7b7] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] animate-pulse" />
            Online
          </span>
        </div>

      </aside>
    </>
  );
};
