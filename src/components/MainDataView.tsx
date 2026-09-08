import React, { useState, useEffect } from 'react';
import { 
  Project, 
  DisciplineType, 
  TerritoryType, 
  ProjectStatus, 
  FundingType, 
  PublicFundCategory 
} from '../types/project';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Coins, 
  Target, 
  Plus, 
  Trash2, 
  Wand2, 
  Save, 
  Check, 
  Users, 
  Lightbulb, 
  Info,
  ChevronRight,
  Layers
} from 'lucide-react';

interface MainDataViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToWorkStructure: () => void;
  onOpenWizard: () => void;
}

const DISCIPLINES: DisciplineType[] = [
  'Artes Escénicas (Teatro/Danza/Circo)',
  'Música en Vivo / Conciertos',
  'Gestión Cultural & Mediación',
  'Industrias Creativas & Audiovisual',
  'Multidisciplinar'
];

const TERRITORIES: TerritoryType[] = [
  'Santiago (RM)',
  'Rancagua / Región de O\'Higgins',
  'Interregional (Santiago ↔ Rancagua)',
  'Gira Nacional',
  'Internacional'
];

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'borrador', label: 'Borrador en Formulación' },
  { value: 'en_evaluacion', label: 'En Evaluación Técnica' },
  { value: 'aprobado', label: 'Aprobado / Postulado' },
  { value: 'en_produccion', label: 'En Pre-producción / Producción' },
  { value: 'en_gira', label: 'En Gira / Temporada Activa' },
  { value: 'finalizado_por_rendir', label: 'Finalizado por Rendir' },
  { value: 'cerrado', label: 'Cerrado y Rendido' }
];

const FUNDING_TYPES: { value: FundingType; label: string; desc: string }[] = [
  { value: 'fondos_publicos', label: 'Fondos Públicos Concursables', desc: 'Fondart, Fondo de la Música, Artes Escénicas o FNDR' },
  { value: 'autogestion', label: 'Autogestión & Venta de Entradas', desc: 'Ingresos por taquilla, preventa y barras' },
  { value: 'mixto', label: 'Régimen Mixto (Fondos + Taquilla)', desc: 'Cofinanciamiento público con recuperación en sala' },
  { value: 'privado_auspicio', label: 'Privado & Auspicios', desc: 'Marcas colaboradoras, aportes directos de terceros' }
];

const PUBLIC_FUNDS: PublicFundCategory[] = [
  'Fondart Nacional',
  'Fondart Regional',
  'Fondo de la Música',
  'Fondo de Artes Escénicas',
  'CORFO Economía Creativa',
  'FNDR 8% O\'Higgins / RM',
  'Otro'
];

export const MainDataView: React.FC<MainDataViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToWorkStructure,
  onOpenWizard
}) => {
  // Local form state
  const [title, setTitle] = useState(project.title);
  const [subtitle, setSubtitle] = useState(project.subtitle || '');
  const [generalObjective, setGeneralObjective] = useState(
    project.generalObjective || project.canvas?.artisticProposal || project.description || ''
  );
  const [specificObjectives, setSpecificObjectives] = useState<string[]>(() => {
    if (project.specificObjectives && project.specificObjectives.length > 0) {
      return project.specificObjectives;
    }
    if (project.valueArchetype?.strategicAxes && project.valueArchetype.strategicAxes.length > 0) {
      return project.valueArchetype.strategicAxes;
    }
    return [
      'Desarrollar la fase de investigación dramatúrgica o musical vinculada a la memoria territorial.',
      'Construir o producir los implementos escénicos con criterios de sustentabilidad y economía circular.',
      'Realizar temporada de estreno en Santiago y funciones de itinerancia con mediación en Rancagua.'
    ];
  });
  const [newObjectiveInput, setNewObjectiveInput] = useState('');
  
  const [discipline, setDiscipline] = useState<DisciplineType>(project.discipline);
  const [territory, setTerritory] = useState<TerritoryType>(project.territory);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  
  const [leadProducer, setLeadProducer] = useState(project.leadProducer || '');
  const [artisticDirector, setArtisticDirector] = useState(project.artisticDirector || '');
  
  const [durationWeeks, setDurationWeeks] = useState(project.durationWeeks || 16);
  const [startDate, setStartDate] = useState(project.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(project.endDate || '');
  const [contingencyPct, setContingencyPct] = useState(project.contingencyPct || 5);
  const [code, setCode] = useState(project.code || '');
  const [description, setDescription] = useState(project.description || '');

  // Funding regime
  const [fundingType, setFundingType] = useState<FundingType>(project.fundingRegime?.type || 'fondos_publicos');
  const [publicFundCategory, setPublicFundCategory] = useState<PublicFundCategory>(
    project.fundingRegime?.publicFundCategory || 'Fondart Nacional'
  );
  const [requestedAmountCLP, setRequestedAmountCLP] = useState(project.fundingRegime?.requestedAmountCLP || 20000000);

  const [savedNotice, setSavedNotice] = useState(false);

  // Sync state if active project changes
  useEffect(() => {
    setTitle(project.title);
    setSubtitle(project.subtitle || '');
    setGeneralObjective(project.generalObjective || project.canvas?.artisticProposal || project.description || '');
    setSpecificObjectives(
      project.specificObjectives && project.specificObjectives.length > 0
        ? project.specificObjectives
        : project.valueArchetype?.strategicAxes || []
    );
    setDiscipline(project.discipline);
    setTerritory(project.territory);
    setStatus(project.status);
    setLeadProducer(project.leadProducer || '');
    setArtisticDirector(project.artisticDirector || '');
    setDurationWeeks(project.durationWeeks || 16);
    setStartDate(project.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(project.endDate || '');
    setContingencyPct(project.contingencyPct || 5);
    setCode(project.code || '');
    setDescription(project.description || '');
    setFundingType(project.fundingRegime?.type || 'fondos_publicos');
    setPublicFundCategory(project.fundingRegime?.publicFundCategory || 'Fondart Nacional');
    setRequestedAmountCLP(project.fundingRegime?.requestedAmountCLP || 20000000);
  }, [project.id]);

  // Auto-calculate end date when duration or start date changes
  const handleDurationChange = (weeks: number) => {
    setDurationWeeks(weeks);
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (dateStr: string) => {
    setStartDate(dateStr);
    if (dateStr && durationWeeks) {
      const start = new Date(dateStr);
      const end = new Date(start.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // Add specific objective
  const handleAddObjective = () => {
    if (!newObjectiveInput.trim()) return;
    setSpecificObjectives([...specificObjectives, newObjectiveInput.trim()]);
    setNewObjectiveInput('');
  };

  // Remove specific objective
  const handleRemoveObjective = (index: number) => {
    setSpecificObjectives(specificObjectives.filter((_, i) => i !== index));
  };

  // Save changes to project
  const handleSave = (silent = false) => {
    const updated: Project = {
      ...project,
      title: title.trim() || 'Proyecto Sin Título',
      subtitle: subtitle.trim(),
      generalObjective: generalObjective.trim(),
      specificObjectives: specificObjectives,
      description: description.trim() || generalObjective.trim(),
      discipline,
      territory,
      status,
      leadProducer: leadProducer.trim(),
      artisticDirector: artisticDirector.trim(),
      durationWeeks: Number(durationWeeks) || 16,
      startDate,
      endDate,
      contingencyPct: Number(contingencyPct) || 5,
      code: code.trim(),
      fundingRegime: {
        ...project.fundingRegime,
        type: fundingType,
        publicFundCategory: fundingType === 'fondos_publicos' || fundingType === 'mixto' ? publicFundCategory : undefined,
        requestedAmountCLP: Number(requestedAmountCLP) || 0
      },
      canvas: {
        ...project.canvas,
        artisticProposal: generalObjective.trim() || project.canvas?.artisticProposal || ''
      },
      updatedAt: new Date().toISOString()
    };

    onUpdateProject(updated);
    if (!silent) {
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    }
  };

  // Save and navigate to step 2 (Work Structure / Etapas de Trabajo)
  const handleSaveAndContinue = () => {
    handleSave(true);
    onNavigateToWorkStructure();
  };

  // Completeness score
  const completeness = React.useMemo(() => {
    let score = 0;
    if (title.trim().length > 3) score += 25;
    if (generalObjective.trim().length > 15) score += 25;
    if (leadProducer.trim().length > 2) score += 15;
    if (artisticDirector.trim().length > 2) score += 10;
    if (specificObjectives.length > 0) score += 15;
    if (startDate && endDate) score += 10;
    return score;
  }, [title, generalObjective, leadProducer, artisticDirector, specificObjectives, startDate, endDate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-stone-50 to-amber-50/50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 p-6 rounded-3xl border border-amber-200/80 dark:border-stone-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Paso 1 de 6 · Definición de Aspectos Principales</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-stone-900 dark:text-stone-100 tracking-tight">
              Identidad, Objetivos & Parámetros Iniciales
            </h1>
            
            <p className="text-sm text-stone-600 dark:text-stone-300 max-w-3xl leading-relaxed">
              Define la columna vertebral de tu producción cultural. Establece el nombre distintivo, el objetivo general y las metas que orientarán las etapas de trabajo, el presupuesto y los equilibrios territoriales entre Santiago y Rancagua.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onOpenWizard}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-xs transition-all cursor-pointer"
            >
              <Wand2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Asistente Guiado</span>
            </button>

            <button
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 shadow-xs transition-all cursor-pointer"
            >
              {savedNotice ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              <span>{savedNotice ? '¡Cambios Guardados!' : 'Guardar Datos'}</span>
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 pt-4 border-t border-amber-200/60 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Nivel de completitud:</span>
            <div className="w-36 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-stone-400'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="font-bold text-stone-900 dark:text-stone-100">{completeness}%</span>
          </div>

          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Al guardar, el botón inferior te llevará de inmediato a configurar las <strong>Etapas de Trabajo</strong>.</span>
          </div>
        </div>
      </div>

      {/* 2. Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER COLUMN (2 COLS): Primary inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card A: Nombre & Subtítulo */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  1. Título & Identidad del Proyecto
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Nombre oficial para convocatorias, carpetas de postulación y material de difusión.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Nombre del Proyecto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Obra Escénica: La Memoria de los Cuerpos"
                  className="w-full text-base sm:text-lg font-bold bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:font-normal placeholder:text-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Subtítulo / Lema Descriptivo
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ej: Estreno en Santiago (Matucana 100) e itinerancia en Centro Cultural Baquedano (Rancagua)"
                  className="w-full text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card B: Objetivo General & Objetivos Específicos */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  2. Objetivo General & Metas del Proyecto
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Describe con claridad qué busca lograr esta iniciativa y los objetivos específicos verificables.
                </p>
              </div>
            </div>

            {/* Objetivo General */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Objetivo General <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-stone-400">
                  {generalObjective.length} caracteres
                </span>
              </div>
              <textarea
                rows={4}
                value={generalObjective}
                onChange={(e) => setGeneralObjective(e.target.value)}
                placeholder="Ej: Desarrollar, producir y estrenar un montaje de teatro físico y memoria territorial que investigue las rutas obreras entre Rancagua y Santiago, articulando una temporada de 12 funciones y talleres de mediación comunitaria..."
                className="w-full text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all leading-relaxed"
              />
              <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Recomendación ATHA: Formular con un verbo en infinitivo, el objeto de acción, la comunidad destinataria y el territorio de impacto.</span>
              </p>
            </div>

            {/* Objetivos Específicos */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Objetivos Específicos (OE)
              </label>

              <div className="space-y-2">
                {specificObjectives.map((obj, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{obj}</span>
                    <button
                      onClick={() => handleRemoveObjective(idx)}
                      className="text-stone-400 hover:text-rose-600 transition-colors p-1 shrink-0 cursor-pointer"
                      title="Eliminar objetivo específico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Objective Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newObjectiveInput}
                  onChange={(e) => setNewObjectiveInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddObjective(); } }}
                  placeholder="Añadir nuevo objetivo específico..."
                  className="flex-1 text-xs bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleAddObjective}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-stone-800 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-200 border border-stone-300 dark:border-stone-700 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir OE</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card C: Resumen / Descripción Detallada */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                3. Fundamentación & Resumen Ejecutivo
              </h2>
              <span className="text-[11px] text-stone-400">Para ficha de catálogo y dossier</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción sinóptica del proyecto para difusión, socios institucionales o fichas de prensa..."
              className="w-full text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>
        </div>

        {/* RIGHT COLUMN (1 COL): Parametrización territorial, equipo y cronograma */}
        <div className="space-y-6">
          
          {/* Card D: Territorio & Disciplina */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <MapPin className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Territorio & Disciplina
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Disciplina Artística
                </label>
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as DisciplineType)}
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {DISCIPLINES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Alcance Territorial
                </label>
                <select
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value as TerritoryType)}
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {TERRITORIES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Estado del Proyecto
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card E: Equipo & Producción Líder */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <Users className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Equipo Responsable
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Productor(a) Líder / Operador ATHA
                </label>
                <input
                  type="text"
                  value={leadProducer}
                  onChange={(e) => setLeadProducer(e.target.value)}
                  placeholder="Ej: Valeria Mansilla / Ignacio Silva"
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Director(a) Artístico(a)
                </label>
                <input
                  type="text"
                  value={artisticDirector}
                  onChange={(e) => setArtisticDirector(e.target.value)}
                  placeholder="Ej: Rodrigo Canales Morales"
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Card F: Calendario & Semanas */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Duración & Fechas Estimadas
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                    Duración en Semanas
                  </label>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {durationWeeks} semanas (~{Math.round(durationWeeks / 4.33)} meses)
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={52}
                  value={durationWeeks}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                    Fecha Término
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Reserva Imprevistos (% Contingencia)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={contingencyPct}
                    onChange={(e) => setContingencyPct(Number(e.target.value))}
                    className="w-20 text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-stone-500">% (Estándar ATHA: 5%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card G: Financiamiento Previsto */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <Coins className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Régimen de Financiamiento
              </h2>
            </div>

            <div className="space-y-2.5">
              <select
                value={fundingType}
                onChange={(e) => setFundingType(e.target.value as FundingType)}
                className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {FUNDING_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {(fundingType === 'fondos_publicos' || fundingType === 'mixto') && (
                <select
                  value={publicFundCategory}
                  onChange={(e) => setPublicFundCategory(e.target.value as PublicFundCategory)}
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {PUBLIC_FUNDS.map((pf) => (
                    <option key={pf} value={pf}>{pf}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Action Banner: Transition to Step 2 (Etapas de Trabajo) */}
      <div className="bg-stone-900 dark:bg-stone-950 text-white p-6 rounded-3xl border border-stone-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-600/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
              Siguiente Paso de la Metodología ATHA
            </span>
            <h3 className="text-lg font-bold font-display text-white">
              Estructurar las Etapas de Trabajo Horizontales
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Pasa al desglose de fases operativas, subetapas, cronograma y menús desplegables de tareas y costos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={() => handleSave(false)}
            className="px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all cursor-pointer"
          >
            Guardar Borrador
          </button>
          
          <button
            id="btn-continue-to-stages"
            onClick={handleSaveAndContinue}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer group"
          >
            <span>Continuar a Etapas de Trabajo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

    </div>
  );
};
