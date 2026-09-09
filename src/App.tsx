import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project } from './types/project';
import { INITIAL_PROJECTS } from './data/initialProjects';
import { calculateProjectFinances } from './utils/calculations';

import { Header } from './components/Header';
import { ProjectSummaryBar } from './components/ProjectSummaryBar';
import { NavigationTabs, ActiveTabType } from './components/NavigationTabs';
import { MainDataView } from './components/MainDataView';
import { WorkStructureView } from './components/WorkStructureView';
import { EconomicModelView } from './components/EconomicModelView';
import { ValueArchetypeView } from './components/ValueArchetypeView';
import { StrategicCanvasView } from './components/StrategicCanvasView';
import { UnitTestsView } from './components/UnitTestsView';
import { ConsolidatedSummaryView } from './components/ConsolidatedSummaryView';
import { AthamuSyncModal } from './components/AthamuSyncModal';
import { ProjectWizardModal } from './components/ProjectWizardModal';
import { CrmCatalogExplorerModal } from './components/CrmCatalogExplorerModal';
import { loadCrmCatalogAsync, loadCrmFoldersAsync, UserSession, getUserSession, PRESET_USERS } from './utils/crmCatalogService';

const STORAGE_KEY = 'atha_projects_v1';
const THEME_STORAGE_KEY = 'atha_dark_mode';

export default function App() {
  // State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { console.error('Error loading projects from localStorage', e); }
    return INITIAL_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || INITIAL_PROJECTS[0].id;
  });

  // Default initial tab: main_data ("pantalla antes de todo para definir aspectos principales")
  const [activeTab, setActiveTab] = useState<ActiveTabType>('main_data');
  const [isAthamuModalOpen, setIsAthamuModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCrmCatalogOpen, setIsCrmCatalogOpen] = useState(false);
  const [crmModalInitialMode, setCrmModalInitialMode] = useState<'explore' | 'send'>('explore');
  const [lastSavedAt, setLastSavedAt] = useState<string>('Recién guardado');

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
  }, [darkMode]);

  // Persist projects to localStorage
  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
      const now = new Date();
      setLastSavedAt(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Error saving projects to localStorage', e);
    }
  };

  // Current active project with fallback
  const activeProject = useMemo(() => {
    const found = projects.find((p) => p.id === activeProjectId);
    return found || projects[0] || INITIAL_PROJECTS[0];
  }, [projects, activeProjectId]);

  // Financial calculations
  const finances = useMemo(() => {
    return calculateProjectFinances(activeProject);
  }, [activeProject]);

  // Counts for tabs
  const { stagesCount, tasksCount, expensesCount } = useMemo(() => {
    let sCount = activeProject.stages.length;
    let tCount = 0;
    let eCount = 0;

    activeProject.stages.forEach((stage) => {
      stage.substages.forEach((sub) => {
        tCount += sub.tasks.length;
        eCount += sub.expenses.length;
      });
    });

    return { stagesCount: sCount, tasksCount: tCount, expensesCount: eCount };
  }, [activeProject]);

  // Handlers
  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
  };

  const handleUpdateProject = (updated: Project) => {
    const updatedProjects = projects.map((p) => (p.id === updated.id ? updated : p));
    saveProjects(updatedProjects);
  };

  const handleNewProject = () => {
    const newId = `atha-prj-${Date.now()}`;
    const newCode = `ATHA-PRJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;
    const newProject: Project = {
      id: newId,
      code: newCode,
      title: 'Nuevo Proyecto Cultural',
      subtitle: 'Creación y montaje territorial (Santiago · Rancagua)',
      discipline: 'Artes Escénicas (Teatro/Danza/Circo)',
      territory: 'Interregional (Santiago ↔ Rancagua)',
      status: 'borrador',
      leadProducer: 'Equipo de Producción ATHA',
      artisticDirector: 'Dirección Artística por Confirmar',
      durationWeeks: 16,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Nuevo proyecto registrado en la Intranet de ATHA Producciones para diseño y viabilidad.',
      contingencyPct: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages: [
        {
          id: `stage-${Date.now()}-1`,
          code: 'ET-01',
          name: 'Etapa 1: Preproducción y Diseño',
          durationWeeks: 6,
          startWeek: 1,
          status: 'en_progreso',
          objective: 'Formulación de propuesta artística, definición de elenco y equipo técnico.',
          substages: [
            {
              id: `sub-${Date.now()}-1-1`,
              name: 'Conceptualización y Dramaturgia',
              description: 'Elaboración del libreto y carpetas para fondos.',
              tasks: [
                { id: `t-${Date.now()}-1`, title: 'Cierre de texto dramático y partituras', role: 'Dramaturgo / Compositor', completed: false, milestone: true },
                { id: `t-${Date.now()}-2`, title: 'Cierre de cartas de compromiso de elenco', role: 'Producción', completed: false, milestone: false }
              ],
              expenses: [
                { id: `exp-${Date.now()}-1`, name: 'Honorarios Dramaturgia / Composición', category: 'honorarios', unitCostCLP: 1800000, quantity: 1, totalCLP: 1800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Creador' }
              ]
            }
          ]
        },
        {
          id: `stage-${Date.now()}-2`,
          code: 'ET-02',
          name: 'Etapa 2: Temporada y Exhibición',
          durationWeeks: 10,
          startWeek: 7,
          status: 'pendiente',
          objective: 'Ensayos generales, estreno y funciones en Santiago y Rancagua.',
          substages: [
            {
              id: `sub-${Date.now()}-2-1`,
              name: 'Ensayos y Montaje Escénico',
              description: 'Período intensivo en sala técnica.',
              tasks: [
                { id: `t-${Date.now()}-3`, title: 'Montaje de escenografía y puesta de luces', role: 'Jefe Técnico', completed: false, milestone: true }
              ],
              expenses: [
                { id: `exp-${Date.now()}-2`, name: 'Arriendo Sala de Ensayo y Equipos', category: 'espacios_salas', unitCostCLP: 600000, quantity: 1, totalCLP: 600000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'Sala Teatral' }
              ]
            }
          ]
        }
      ],
      fundingRegime: {
        type: 'fondos_publicos',
        publicFundCategory: 'Fondart Nacional',
        requestedAmountCLP: 15000000,
        cofinancingRequiredPct: 10,
        confirmedSources: [
          {
            id: `src-${Date.now()}-1`,
            name: 'Fondart Nacional 2026 (Proyectado)',
            category: 'fondos_publicos',
            type: 'pecuniario',
            amountCLP: 15000000,
            verified: false,
            notes: 'Postulación en preparación'
          }
        ],
        targetAudienceCapacity: 1200,
        averageTicketPriceCLP: 5000,
        expectedTicketSalesCount: 800
      },
      valueArchetype: {
        type: 'cadena_lineal',
        description: 'Modelo secuencial centrado en la excelencia del producto escénico o musical final.',
        strategicAxes: [
          'Calidad de producción técnica',
          'Vínculo con audiencias territoriales',
          'Rigor de rendición financiera'
        ],
        circularElements: {
          sceneryReusePct: 20,
          digitalArchive: true,
          regionalTouring: true,
          repertoryRevival: false
        },
        ecosystemElements: {
          communityPartnersCount: 2,
          venuesInvolved: ['Matucana 100', 'Centro Cultural Baquedano (Rancagua)'],
          territoryImpact: 'Articulación cultural entre Región Metropolitana y Región de O\'Higgins.',
          audiencesTarget: 'Público general, jóvenes estudiantes y amantes de las artes vivas.'
        }
      },
      canvas: {
        artisticProposal: 'Propuesta escénica multidisciplinar con foco en dramaturgia viva contemporánea.',
        valuePropositionATHA: 'Producción ejecutiva integral con estándar técnico de sala y vinculación comunitaria.',
        targetAudiences: 'Público interesado en artes vivas, comunidades vecinales y escolares.',
        mediationAndAudiences: 'Coloquios post-función y cuadernillo pedagógico digital.',
        territorialAllies: 'Salas de Santiago y centros culturales de la Región de O\'Higgins.',
        territorialImpact: 'Descentralización de temporadas y fortalecimiento de corredores culturales.',
        criticalResources: 'Elenco profesional, diseño escenotécnico y fletes interregionales.',
        keyActivities: 'Ensayos en sala, estreno, itinerancia y rendición a fondo concursable.',
        riskMitigation: 'Reserva de contingencia del 5%, protocolo de salas de reemplazo y preventa temprana.'
      }
    };

    const newProjects = [newProject, ...projects];
    saveProjects(newProjects);
    setActiveProjectId(newId);
    setActiveTab('work_structure');
  };

  const handleDuplicateProject = () => {
    const dupId = `atha-prj-${Date.now()}`;
    const dupCode = `${activeProject.code}-CPY`;
    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(activeProject)),
      id: dupId,
      code: dupCode,
      title: `${activeProject.title} (Copia)`,
      status: 'borrador',
      updatedAt: new Date().toISOString()
    };

    const newProjects = [duplicated, ...projects];
    saveProjects(newProjects);
    setActiveProjectId(dupId);
  };

  const handleImportProject = (imported: Project) => {
    // If project id already exists, update it; otherwise prepend
    const exists = projects.some((p) => p.id === imported.id);
    let updatedProjects: Project[];
    if (exists) {
      updatedProjects = projects.map((p) => (p.id === imported.id ? imported : p));
    } else {
      updatedProjects = [imported, ...projects];
    }
    saveProjects(updatedProjects);
    setActiveProjectId(imported.id);
  };

  const handleLoadProjectFromCrm = (loadedProject: Project) => {
    const exists = projects.some((p) => p.id === loadedProject.id);
    let updatedProjects: Project[];
    if (exists) {
      updatedProjects = projects.map((p) => (p.id === loadedProject.id ? loadedProject : p));
    } else {
      updatedProjects = [loadedProject, ...projects];
    }
    saveProjects(updatedProjects);
    setActiveProjectId(loadedProject.id);
    setActiveTab('consolidated_summary');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('¿Restablecer proyectos a los valores de demostración iniciales de ATHA Producciones?')) {
      saveProjects(INITIAL_PROJECTS);
      setActiveProjectId(INITIAL_PROJECTS[0].id);
    }
  };

  // Auth + sync cloud
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = getUserSession();
    return saved || PRESET_USERS[0];
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      await loadCrmCatalogAsync();
      await loadCrmFoldersAsync();
    } catch (e) {
    } finally { setIsSyncing(false); }
  }, []);
  const [crmReady, setCrmReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [folders] = await Promise.all([
          loadCrmFoldersAsync(),
        ]);
        // guardar folders reales en localStorage (fallback)
        try { localStorage.setItem('atha_crm_folders_v1', JSON.stringify(folders)); } catch {}

        // Si localStorage está vacío, bootstrapear con datos reales del backend
        const saved = localStorage.getItem('atha_crm_catalog_v1');
        if (!saved || JSON.parse(saved).length === 0) {
          const realProjects = await loadCrmCatalogAsync();
          const mapped = realProjects.map(e => e.projectData).filter(Boolean);
          if (mapped.length && !cancelled) {
            saveProjects(mapped);
          }
        }
        if (!cancelled) setCrmReady(true);
      } catch (e) {
        console.warn('CRM real no disponible en bootstrap:', e);
        if (!cancelled) setCrmReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors">
      {/* 1. Top Header */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onNewProject={() => setIsWizardOpen(true)}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenCrmCatalog={() => {
          setCrmModalInitialMode('explore');
          setIsCrmCatalogOpen(true);
        }}
        onOpenCrmSend={() => {
          setCrmModalInitialMode('send');
          setIsCrmCatalogOpen(true);
        }}
        onDuplicateProject={handleDuplicateProject}
        onOpenAthamuModal={() => setIsAthamuModalOpen(true)}
        onOpenTestsTab={() => setActiveTab('unit_tests')}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        lastSavedAt={lastSavedAt}
        onResetToDefaults={handleResetToDefaults}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onSyncCloud={handleSyncCloud}
        isSyncing={isSyncing}
      />

      {/* 2. Project Summary Bar */}
      <ProjectSummaryBar project={activeProject} finances={finances} />

      {/* 3. Navigation Tabs Web Desktop */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stagesCount={stagesCount}
        tasksCount={tasksCount}
        expensesCount={expensesCount}
        onOpenCrmCatalog={() => {
          setCrmModalInitialMode('explore');
          setIsCrmCatalogOpen(true);
        }}
        onOpenCrmSend={() => {
          setCrmModalInitialMode('send');
          setIsCrmCatalogOpen(true);
        }}
      />

      {/* 4. Active Tab Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'main_data' && (
          <MainDataView 
            project={activeProject} 
            onUpdateProject={handleUpdateProject}
            onNavigateToWorkStructure={() => setActiveTab('work_structure')}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        )}

        {activeTab === 'work_structure' && (
          <WorkStructureView 
            project={activeProject} 
            onUpdateProject={handleUpdateProject}
            onNavigateToMainData={() => setActiveTab('main_data')}
            onNavigateToEconomicModel={() => setActiveTab('economic_model')}
            onNavigateToSummary={() => setActiveTab('consolidated_summary')}
          />
        )}

        {activeTab === 'economic_model' && (
          <EconomicModelView project={activeProject} finances={finances} onUpdateProject={handleUpdateProject} />
        )}

        {activeTab === 'value_archetype' && (
          <ValueArchetypeView project={activeProject} onUpdateProject={handleUpdateProject} />
        )}

        {activeTab === 'strategic_canvas' && (
          <StrategicCanvasView project={activeProject} finances={finances} onUpdateProject={handleUpdateProject} />
        )}

        {activeTab === 'consolidated_summary' && (
          <ConsolidatedSummaryView
            project={activeProject}
            finances={finances}
            onNavigateToWorkStructure={() => setActiveTab('work_structure')}
            onOpenCrmSync={() => {
              setCrmModalInitialMode('send');
              setIsCrmCatalogOpen(true);
            }}
          />
        )}

        {activeTab === 'unit_tests' && (
          <UnitTestsView projects={projects} />
        )}
      </main>

      {/* 5. Project Wizard Modal */}
      <ProjectWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateProject={(created) => {
          const updated = [created, ...projects];
          saveProjects(updated);
          setActiveProjectId(created.id);
          setActiveTab('main_data');
        }}
      />

      {/* 6. CRM Catalog Explorer & Send Modal */}
      <CrmCatalogExplorerModal
        isOpen={isCrmCatalogOpen}
        onClose={() => setIsCrmCatalogOpen(false)}
        activeProject={activeProject}
        onLoadProjectFromCrm={handleLoadProjectFromCrm}
        initialMode={crmModalInitialMode}
      />

      {/* 7. Athamu Sync JSON Modal */}
      <AthamuSyncModal
        isOpen={isAthamuModalOpen}
        onClose={() => setIsAthamuModalOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onImportProject={handleImportProject}
      />

      {/* 6. Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 py-4 px-4 sm:px-6 lg:px-8 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-700 dark:text-stone-300">ATHA Producciones Ltda.</span>
            <span>·</span>
            <span>Arquitecto de Proyecto (Capa Intermedia Intranet / CRM)</span>
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 text-center sm:text-right">
            "Datos de referencia con fecha de vigencia; conector a ATHAMU pendiente." · Territorios: Santiago · Rancagua
          </div>
        </div>
      </footer>
    </div>
  );
}
