import React, { useState } from 'react';
import { Obra, Lead, Venue, Discipline } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  Sparkles,
  Layers,
  DollarSign,
  Building2,
  Users,
  Compass,
  ArrowRight,
  Plus,
  FileCheck,
  Award,
  ChevronRight,
  Sliders,
  CheckCircle2,
  PieChart,
  Boxes,
  Workflow
} from 'lucide-react';

export interface ScenicProjectArchitecture {
  id: string;
  code: string;
  title: string;
  discipline: Discipline;
  format: string;
  stage: 'Idea / Investigación' | 'Formulación Fondart' | 'Coproducción Internacional' | 'Pre-producción Técnica' | 'Listo para Circulación';
  curatorialHypothesis: string;
  creativeLead: string;
  technicalLead: string;
  financialArchitecture: {
    fondartCLP: number;
    iberescenaUSD: number;
    coproductionsCLP: number;
    privateOrBoxOfficeCLP: number;
    totalBudgetCLP: number;
  };
  technicalSpecs: {
    minStageWidth: number;
    minStageDepth: number;
    crewSize: number;
    freightVolumeM3: number;
    powerKw: number;
  };
  targetVenues: string[];
  readinessScore: number; // 0 - 100
}

const INITIAL_PROJECTS_ARCH: ScenicProjectArchitecture[] = [
  {
    id: 'arq-01',
    code: 'ARQ-2025-01',
    title: 'Geografía del Espasmo',
    discipline: 'Danza',
    format: 'Caja Negra Inmersiva',
    stage: 'Formulación Fondart',
    curatorialHypothesis: 'Investigación biomecánica y de sensores corporales sobre la reacción muscular del estrés geológico y tectónico en comunidades costeras chilenas.',
    creativeLead: 'Jo Schultz',
    technicalLead: 'Antonia Fernández',
    financialArchitecture: {
      fondartCLP: 24500000,
      iberescenaUSD: 10000,
      coproductionsCLP: 8000000,
      privateOrBoxOfficeCLP: 4500000,
      totalBudgetCLP: 46500000
    },
    technicalSpecs: {
      minStageWidth: 10,
      minStageDepth: 9,
      crewSize: 6,
      freightVolumeM3: 12,
      powerKw: 18
    },
    targetVenues: ['Centro GAM (Santiago)', 'Teatro Biobío (Concepción)', 'Parque Cultural Valparaíso'],
    readinessScore: 78
  },
  {
    id: 'arq-02',
    code: 'ARQ-2025-02',
    title: 'Sinfonía Telúrica & Sintetizadores Análogos',
    discipline: 'Música',
    format: 'Concierto Escénico Espacializado',
    stage: 'Coproducción Internacional',
    curatorialHypothesis: 'Traducción de registros sísmicos en frecuencias graves subarmónicas generadas por sintetizadores modulares e instrumentos de viento prehispánicos.',
    creativeLead: 'Nicolás Ortiz',
    technicalLead: 'Tomás Verdugo',
    financialArchitecture: {
      fondartCLP: 18000000,
      iberescenaUSD: 15000,
      coproductionsCLP: 12000000,
      privateOrBoxOfficeCLP: 6000000,
      totalBudgetCLP: 50250000
    },
    technicalSpecs: {
      minStageWidth: 12,
      minStageDepth: 8,
      crewSize: 5,
      freightVolumeM3: 8,
      powerKw: 22
    },
    targetVenues: ['Teatro Municipal de Las Condes', 'Teatro del Lago (Frutillar)', 'Festival Santiago a Mil'],
    readinessScore: 65
  },
  {
    id: 'arq-03',
    code: 'ARQ-2025-03',
    title: 'Bitácora del Desierto Florido',
    discipline: 'Teatro',
    format: 'Espacio Público & Sitio Específico',
    stage: 'Idea / Investigación',
    curatorialHypothesis: 'Narrativa documental y lumínica sobre la resiliencia de la flora endémica de Atacama tras episodios de lluvias anómalas por el cambio climático.',
    creativeLead: 'Francisco Pérez',
    technicalLead: 'Antonia Fernández',
    financialArchitecture: {
      fondartCLP: 15000000,
      iberescenaUSD: 0,
      coproductionsCLP: 5000000,
      privateOrBoxOfficeCLP: 2000000,
      totalBudgetCLP: 22000000
    },
    technicalSpecs: {
      minStageWidth: 8,
      minStageDepth: 8,
      crewSize: 4,
      freightVolumeM3: 6,
      powerKw: 12
    },
    targetVenues: ['Festival Cielos del Infinito', 'Ruinas de Huanchaca (Antofagasta)', 'Centro Cultural La Moneda'],
    readinessScore: 40
  }
];

interface ArquitectoProyectosSectionProps {
  obras: Obra[];
  leads: Lead[];
  venues: Venue[];
  onNavigateSection: (sectionId: string) => void;
  theme?: 'terracota' | 'dia';
}

export const ArquitectoProyectosSection: React.FC<ArquitectoProyectosSectionProps> = ({
  obras,
  leads,
  venues,
  onNavigateSection,
  theme = 'dia'
}) => {
  const isLight = theme === 'dia';

  const [projects, setProjects] = useState<ScenicProjectArchitecture[]>(INITIAL_PROJECTS_ARCH);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'arq-01');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // New project form state
  const [newTitle, setNewTitle] = useState('');
  const [newDiscipline, setNewDiscipline] = useState<Discipline>('Danza');
  const [newFormat, setNewFormat] = useState('Caja Negra / Sala');
  const [newHypothesis, setNewHypothesis] = useState('');
  const [newFondart, setNewFondart] = useState(20000000);
  const [newCoprod, setNewCoprod] = useState(5000000);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const total = Number(newFondart) + Number(newCoprod);
    const created: ScenicProjectArchitecture = {
      id: `arq-${Date.now()}`,
      code: `ARQ-2025-0${projects.length + 1}`,
      title: newTitle.trim(),
      discipline: newDiscipline,
      format: newFormat,
      stage: 'Idea / Investigación',
      curatorialHypothesis: newHypothesis.trim() || 'Proyecto escénico interdisciplinar en fase de conceptualización.',
      creativeLead: 'Jo Schultz',
      technicalLead: 'Antonia Fernández',
      financialArchitecture: {
        fondartCLP: Number(newFondart),
        iberescenaUSD: 0,
        coproductionsCLP: Number(newCoprod),
        privateOrBoxOfficeCLP: 0,
        totalBudgetCLP: total
      },
      technicalSpecs: {
        minStageWidth: 10,
        minStageDepth: 8,
        crewSize: 5,
        freightVolumeM3: 10,
        powerKw: 15
      },
      targetVenues: ['Teatro Biobío', 'Centro GAM'],
      readinessScore: 35
    };

    setProjects(prev => [created, ...prev]);
    setSelectedProjectId(created.id);
    setIsNewProjectModalOpen(false);
    setNewTitle('');
    setNewHypothesis('');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border transition-all ${
        isLight
          ? 'bg-white border-[var(--border-color)] text-stone-900 shadow-xs'
          : 'bg-[#1C110F] border-[var(--border-color)] text-white shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent-terracota)]">
              <span>Módulo de Creación & Pitch</span>
              <span>•</span>
              <span>Arquitectura Escénica & Financiamiento</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-display mt-1 ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              Arquitecto de Proyectos Escénicos
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
              isLight ? 'text-stone-600' : 'text-slate-300'
            }`}>
              Estructurador conceptual, financiero y técnico para carpetas de postulación (Fondart, Iberescena) y coproducciones estratégicas con salas de teatro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateSection('crm')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                isLight
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-amber-500" />
              <span>Vincular con CRM Leads</span>
            </button>

            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Diseñar Nuevo Proyecto</span>
            </button>
          </div>
        </div>

        {/* Project Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-6 border-t border-stone-100 dark:border-white/5">
          {projects.map(p => {
            const isSelected = p.id === selectedProjectId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[var(--accent-terracota)] text-white border-[var(--accent-terracota)] shadow-xs'
                    : isLight
                    ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    : 'bg-[var(--bg-base)] border-[var(--border-color)] text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">{p.code}</span>
                <span className="font-bold">{p.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-slate-300'
                }`}>
                  {p.readinessScore}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Project Architecture Canvas */}
      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (8 cols): Conceptual & Financial Blueprint */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Conceptual Dossier Card */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#1C110F] border-[var(--border-color)] shadow-md'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--accent-terracota)]">{selectedProject.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      isLight ? 'bg-stone-100 text-stone-700' : 'bg-white/10 text-slate-300'
                    }`}>
                      {selectedProject.discipline}
                    </span>
                    <span className="text-xs text-stone-500">• {selectedProject.format}</span>
                  </div>
                  <h2 className={`text-xl font-bold tracking-tight mt-1 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                    {selectedProject.title}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-stone-400 block uppercase">Estado Postulación</span>
                  <span className="text-xs font-bold text-[var(--accent-terracota)] block mt-0.5">
                    {selectedProject.stage}
                  </span>
                </div>
              </div>

              {/* Curatorial Hypothesis */}
              <div className={`p-4 rounded-xl border ${
                isLight ? 'bg-stone-50/70 border-stone-200 text-stone-800' : 'bg-[var(--bg-base)] border-[var(--border-color)] text-slate-200'
              }`}>
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block mb-1 font-semibold">
                  Hipótesis Curatorial & Dramatúrgica
                </span>
                <p className="text-xs leading-relaxed font-sans">
                  {selectedProject.curatorialHypothesis}
                </p>
              </div>

              {/* Leads / Directors */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-[var(--bg-base)] border-[var(--border-color)]'
                }`}>
                  <span className="text-[10px] text-stone-400 block uppercase font-mono">Dirección Artística</span>
                  <span className={`font-bold mt-0.5 block ${isLight ? 'text-stone-900' : 'text-white'}`}>
                    {selectedProject.creativeLead}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-[var(--bg-base)] border-[var(--border-color)]'
                }`}>
                  <span className="text-[10px] text-stone-400 block uppercase font-mono">Dirección Técnica & Escénica</span>
                  <span className={`font-bold mt-0.5 block ${isLight ? 'text-stone-900' : 'text-white'}`}>
                    {selectedProject.technicalLead}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Architecture Breakdown */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#1C110F] border-[var(--border-color)] shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Arquitectura Financiera & Fondos de Coproducción</span>
                </h3>
                <span className={`text-xs font-mono font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                  Total: {formatCLP(selectedProject.financialArchitecture.totalBudgetCLP)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
                }`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Fondart Nacional / Regional</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCLP(selectedProject.financialArchitecture.fondartCLP)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Línea de Creación y Producción Escénica 2025.
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-sky-50/50 border-sky-200' : 'bg-sky-950/20 border-sky-800/40'
                }`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-sky-600 dark:text-sky-400 font-semibold">Coproducción de Salas (CRM)</span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                      {formatCLP(selectedProject.financialArchitecture.coproductionsCLP)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Aportes pecuniarios y valorizados de teatros asociados.
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-purple-50/50 border-purple-200' : 'bg-purple-950/20 border-purple-800/40'
                }`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">Iberescena / Fondos Internacionales</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      ${selectedProject.financialArchitecture.iberescenaUSD.toLocaleString()} USD
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Circulación y residencias internacionales.
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40'
                }`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Venta Funciones / Taquilla Est.</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatCLP(selectedProject.financialArchitecture.privateOrBoxOfficeCLP)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Retorno proyectado por temporada de estreno.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (4 cols): Technical Footprint & CRM Targets */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Readiness Index Card */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#1C110F] border-[var(--border-color)] shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Índice de Madurez
                </span>
                <span className="text-xs font-mono font-bold text-[var(--accent-terracota)]">
                  {selectedProject.readinessScore}/100
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-terracota)] to-amber-500"
                  style={{ width: `${selectedProject.readinessScore}%` }}
                />
              </div>
              <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                Evaluación integral de texto, ficha técnica y viabilidad presupuestaria para presentación ante programadores.
              </p>
            </div>

            {/* Technical Specs Blueprint */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#1C110F] border-[var(--border-color)] shadow-md'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                <Boxes className="w-4 h-4 text-sky-500" />
                <span>Huella Técnica & Escenario</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-white/5">
                  <span className="text-stone-500">Escenario Mínimo</span>
                  <span className="font-mono font-semibold">
                    {selectedProject.technicalSpecs.minStageWidth}m boca × {selectedProject.technicalSpecs.minStageDepth}m fondo
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-white/5">
                  <span className="text-stone-500">Elenco & Técnicos</span>
                  <span className="font-mono font-semibold">{selectedProject.technicalSpecs.crewSize} personas</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-white/5">
                  <span className="text-stone-500">Volumen Carga Flete</span>
                  <span className="font-mono font-semibold">{selectedProject.technicalSpecs.freightVolumeM3} m³</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-500">Potencia Eléctrica</span>
                  <span className="font-mono font-semibold">{selectedProject.technicalSpecs.powerKw} kW</span>
                </div>
              </div>
            </div>

            {/* Target CRM Venues */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#1C110F] border-[var(--border-color)] shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>Teatros Objetivo (CRM)</span>
                </h3>
                <button
                  onClick={() => onNavigateSection('crm')}
                  className="text-xs text-[var(--accent-terracota)] hover:underline"
                >
                  Abrir CRM →
                </button>
              </div>

              <div className="space-y-2">
                {selectedProject.targetVenues.map((v, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-[var(--bg-base)] border-[var(--border-color)] text-slate-200'
                    }`}
                  >
                    <span className="font-medium truncate">{v}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* New Project Architecture Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#1C110F] border-[var(--border-color)] text-white'
          }`}>
            <h3 className="text-base font-bold">Diseñar Nueva Arquitectura de Proyecto</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1">Título del Proyecto</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: La Tempestad Silenciosa"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight ? 'bg-stone-50 border-stone-200 focus:border-[var(--accent-terracota)]' : 'bg-[var(--bg-base)] border-[var(--border-color)] focus:border-[var(--accent-terracota)]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Disciplina</label>
                  <select
                    value={newDiscipline}
                    onChange={(e) => setNewDiscipline(e.target.value as Discipline)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[var(--bg-base)] border-[var(--border-color)]'
                    }`}
                  >
                    <option value="Danza">Danza</option>
                    <option value="Teatro">Teatro</option>
                    <option value="Música">Música</option>
                    <option value="Interdisciplinar">Interdisciplinar</option>
                    <option value="Festival">Festival</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Formato Espacial</label>
                  <input
                    type="text"
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    placeholder="Caja Negra / Sala Principal"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[var(--bg-base)] border-[var(--border-color)]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Hipótesis Curatorial / Sinopsis de Creación</label>
                <textarea
                  rows={3}
                  value={newHypothesis}
                  onChange={(e) => setNewHypothesis(e.target.value)}
                  placeholder="Describe la tesis artística, cuerpo en escena, propuesta lumínica y sonora..."
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none resize-none ${
                    isLight ? 'bg-stone-50 border-stone-200 focus:border-[var(--accent-terracota)]' : 'bg-[var(--bg-base)] border-[var(--border-color)] focus:border-[var(--accent-terracota)]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Monto Fondart Estimado (CLP)</label>
                  <input
                    type="number"
                    value={newFondart}
                    onChange={(e) => setNewFondart(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[var(--bg-base)] border-[var(--border-color)]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Coproducción Salas (CLP)</label>
                  <input
                    type="number"
                    value={newCoprod}
                    onChange={(e) => setNewCoprod(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[var(--bg-base)] border-[var(--border-color)]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border cursor-pointer ${
                    isLight ? 'border-stone-200 text-stone-700 hover:bg-stone-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)] text-white font-semibold cursor-pointer"
                >
                  Crear Arquitectura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
