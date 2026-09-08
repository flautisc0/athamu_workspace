import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText,
  FolderKanban, 
  Coins, 
  Workflow, 
  Compass, 
  FlaskConical,
  Layers,
  ChevronDown,
  Share2,
  FolderPlus,
  BarChart3,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Send
} from 'lucide-react';

export type ActiveTabType = 
  | 'main_data'
  | 'work_structure'
  | 'economic_model'
  | 'value_archetype'
  | 'strategic_canvas'
  | 'consolidated_summary'
  | 'unit_tests';

interface NavigationTabsProps {
  activeTab: ActiveTabType;
  onTabChange: (tab: ActiveTabType) => void;
  stagesCount: number;
  tasksCount: number;
  expensesCount: number;
  onOpenCrmCatalog?: () => void;
  onOpenCrmSend?: () => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  stagesCount,
  tasksCount,
  expensesCount,
  onOpenCrmCatalog,
  onOpenCrmSend
}) => {
  const [isFormulacionOpen, setIsFormulacionOpen] = useState(false);
  const [isCrmMenuOpen, setIsCrmMenuOpen] = useState(false);

  const formulacionRef = useRef<HTMLDivElement>(null);
  const crmRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formulacionRef.current && !formulacionRef.current.contains(event.target as Node)) {
        setIsFormulacionOpen(false);
      }
      if (crmRef.current && !crmRef.current.contains(event.target as Node)) {
        setIsCrmMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formulationTabs = [
    {
      id: 'main_data' as ActiveTabType,
      label: 'Datos Principales',
      stepNum: '1',
      icon: FileText,
      badge: 'Nombre & Objetivo',
      description: 'Definición esencial del proyecto, objetivos y equipo'
    },
    {
      id: 'work_structure' as ActiveTabType,
      label: 'Etapas de Trabajo',
      stepNum: '2',
      icon: FolderKanban,
      badge: `${stagesCount} etapas · Tablero`,
      description: 'Línea de tiempo horizontal, tareas y menús desplegables'
    },
    {
      id: 'economic_model' as ActiveTabType,
      label: 'Modelo Económico & Viabilidad',
      stepNum: '3',
      icon: Coins,
      badge: `${expensesCount} ítems`,
      description: 'Presupuesto, fondos, punto de equilibrio y taquilla'
    },
    {
      id: 'value_archetype' as ActiveTabType,
      label: 'Arquetipo de Valor',
      stepNum: '4',
      icon: Workflow,
      badge: 'Cadena · Circular · Red',
      description: 'Estrategia de impacto cultural y reutilización'
    },
    {
      id: 'strategic_canvas' as ActiveTabType,
      label: 'Síntesis Estratégica & Canvas',
      stepNum: '5',
      icon: Compass,
      badge: 'Lienzo ATHA',
      description: 'Canvas cultural, aliados y resumen para fondos'
    }
  ];

  const isFormulationActive = formulationTabs.some(t => t.id === activeTab);
  const activeFormulationTab = formulationTabs.find(t => t.id === activeTab) || formulationTabs[0];

  return (
    <nav 
      aria-label="Barra de Navegación Principal"
      className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 sticky top-16 sm:top-20 z-20 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Desktop Web Navigation Bar (no horizontal scroll) */}
        <div className="flex items-center justify-between h-13 sm:h-14 gap-2 sm:gap-4">
          
          {/* Left section: Navigation Groups */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* 1. MENÚ DESPLEGABLE: Formulación del Proyecto */}
            <div className="relative" ref={formulacionRef}>
              <button
                type="button"
                id="btn-nav-formulacion-dropdown"
                onClick={() => {
                  setIsFormulacionOpen(!isFormulacionOpen);
                  setIsCrmMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  isFormulationActive
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-xs'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
                aria-expanded={isFormulacionOpen}
              >
                <activeFormulationTab.icon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-left hidden sm:block">
                  <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 block leading-none">
                    Formulación ({activeFormulationTab.stepNum}/5)
                  </span>
                  <span className="font-bold truncate max-w-[160px] block">
                    {activeFormulationTab.label}
                  </span>
                </div>
                <span className="sm:hidden font-bold">
                  {activeFormulationTab.label}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform text-stone-400 ${isFormulacionOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu for Formulación */}
              {isFormulacionOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Módulos de Formulación de Proyecto
                    </span>
                    <p className="text-xs text-stone-500">
                      Selecciona un área para editar los datos, etapas o modelo.
                    </p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    {formulationTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isItemActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onTabChange(tab.id);
                            setIsFormulacionOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-start gap-3 cursor-pointer ${
                            isItemActive
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${isItemActive ? 'bg-amber-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                {tab.stepNum}. {tab.label}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                                {tab.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 truncate mt-0.5">
                              {tab.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-pills for fast desktop switching within Formulación */}
            <div className="hidden lg:flex items-center gap-1 border-l border-stone-200 dark:border-stone-800 pl-2">
              {formulationTabs.map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900'
                    }`}
                    title={tab.description}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-stone-200 dark:border-stone-800 mx-1 hidden sm:block" />

            {/* 2. BOTÓN DESTACADO: Resumen Consolidado de Etapas */}
            <button
              type="button"
              id="btn-nav-consolidated-summary"
              onClick={() => onTabChange('consolidated_summary')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'consolidated_summary'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700'
              }`}
              title="Ver el consolidado ejecutivo y matriz completa de lo realizado en las etapas"
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === 'consolidated_summary' ? 'text-amber-400 dark:text-amber-600' : 'text-amber-600'}`} />
              <span>Consolidado de Etapas</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold hidden md:inline-block ${
                activeTab === 'consolidated_summary'
                  ? 'bg-stone-700 text-stone-200 dark:bg-stone-200 dark:text-stone-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                Ficha Ejecutiva
              </span>
            </button>

          </div>

          {/* Right section: CRM & Quality Menus */}
          <div className="flex items-center gap-2">
            
            {/* 3. MENÚ DESPLEGABLE: Catálogo & Carpetas CRM ATHAMU */}
            <div className="relative" ref={crmRef}>
              <button
                type="button"
                id="btn-nav-crm-dropdown"
                onClick={() => {
                  setIsCrmMenuOpen(!isCrmMenuOpen);
                  setIsFormulacionOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                aria-expanded={isCrmMenuOpen}
              >
                <FolderKanban className="w-4 h-4 text-amber-600" />
                <span className="hidden md:inline">Catálogo CRM</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform text-stone-400 ${isCrmMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu for CRM */}
              {isCrmMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Catálogo & Carpetas CRM ATHAMU
                    </span>
                    <p className="text-xs text-stone-500">
                      Intercambio con la base de proyectos central.
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    {onOpenCrmCatalog && (
                      <button
                        onClick={() => {
                          onOpenCrmCatalog();
                          setIsCrmMenuOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer"
                      >
                        <FolderKanban className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-stone-900 dark:text-stone-100 block">
                            Explorar Carpetas del CRM
                          </span>
                          <span className="text-[11px] text-stone-500">
                            Lee o carga proyectos existentes en las carpetas de Santiago, Rancagua o Fondos.
                          </span>
                        </div>
                      </button>
                    )}

                    {onOpenCrmSend && (
                      <button
                        onClick={() => {
                          onOpenCrmSend();
                          setIsCrmMenuOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Enviar Proyecto Actual al CRM
                          </span>
                          <span className="text-[11px] text-amber-700 dark:text-amber-300">
                            Sincroniza y guarda en la carpeta seleccionada del CRM.
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. BOTÓN: Pruebas Unitarias */}
            <button
              type="button"
              id="btn-nav-tests"
              onClick={() => onTabChange('unit_tests')}
              className={`p-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unit_tests'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title="Ver Suite de Pruebas Unitarias y Certificación de Cálculos"
            >
              <FlaskConical className="w-4 h-4 text-emerald-600" />
              <span className="hidden xl:inline text-xs">9 Tests OK</span>
            </button>

          </div>

        </div>

      </div>
    </nav>
  );
};
