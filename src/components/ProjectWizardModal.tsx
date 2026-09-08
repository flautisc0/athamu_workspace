import React, { useState } from 'react';
import { 
  Project, 
  DisciplineType, 
  TerritoryType, 
  FundingType, 
  PublicFundCategory, 
  ArchetypeType, 
  Stage 
} from '../types/project';
import { INITIAL_TEMPLATES } from '../data/initialProjects';
import { 
  Wand2, 
  X, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  Coins, 
  Layers, 
  Workflow, 
  Target, 
  FileText,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

const DISCIPLINES: DisciplineType[] = [
  'Artes Escénicas (Teatro/Danza/Circo)',
  'Música en Vivo / Conciertos',
  'Gestión Cultural & Mediación',
  'Industrias Creativas & Audiovisual',
  'Multidisciplinar'
];

const TERRITORIES: TerritoryType[] = [
  'Interregional (Santiago ↔ Rancagua)',
  'Santiago (RM)',
  'Rancagua / Región de O\'Higgins',
  'Gira Nacional'
];

const OPERATOR_PRESETS = [
  { name: 'Valeria Mansilla', role: 'Productora Ejecutiva', territory: 'Santiago' },
  { name: 'Ignacio Silva', role: 'Productor General de Terreno', territory: 'Rancagua' },
  { name: 'Camila Garrido Pavez', role: 'Mediadora Cultural & Curadora', territory: 'Rancagua' }
];

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [title, setTitle] = useState('');
  const [generalObjective, setGeneralObjective] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [discipline, setDiscipline] = useState<DisciplineType>('Artes Escénicas (Teatro/Danza/Circo)');
  const [territory, setTerritory] = useState<TerritoryType>('Interregional (Santiago ↔ Rancagua)');

  // Step 2: Team & Duration
  const [leadProducer, setLeadProducer] = useState('Valeria Mansilla (ATHA Producciones)');
  const [artisticDirector, setArtisticDirector] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(16);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Step 3: Funding & Archetype
  const [fundingType, setFundingType] = useState<FundingType>('fondos_publicos');
  const [publicFundCategory, setPublicFundCategory] = useState<PublicFundCategory>('Fondart Nacional');
  const [targetBudgetCLP, setTargetBudgetCLP] = useState(25000000);
  const [archetype, setArchetype] = useState<ArchetypeType>('ciclo_circular');

  // Step 4: Template or Structure selection
  const [structureType, setStructureType] = useState<'template' | 'standard' | 'blank'>('standard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(INITIAL_TEMPLATES[0]?.id || '');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && (!title.trim() || !generalObjective.trim())) {
      alert('Por favor indica al menos el Nombre y el Objetivo General del proyecto.');
      return;
    }
    setStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreate = () => {
    const newId = `atha-prj-${Date.now()}`;
    const year = new Date().getFullYear();
    const randomCode = Math.floor(Math.random() * 900 + 100);
    const prefix = discipline.includes('Escénicas') ? 'ESC' : discipline.includes('Música') ? 'MUS' : 'CUL';
    const newCode = `ATHA-${prefix}-${year}-${randomCode}`;

    const calculatedEndDate = new Date(
      new Date(startDate).getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0];

    // Determine stages based on selection
    let stagesToUse: Stage[] = [];

    if (structureType === 'template') {
      const tmpl = INITIAL_TEMPLATES.find(t => t.id === selectedTemplateId);
      if (tmpl && tmpl.suggestedStages) {
        let currentWeek = 1;
        stagesToUse = tmpl.suggestedStages.map((st, idx) => {
          const sWeek = currentWeek;
          currentWeek += st.durationWeeks;
          return {
            id: `stage-${Date.now()}-${idx + 1}`,
            code: st.code,
            name: st.name,
            stageType: st.stageType,
            apartados: st.apartados,
            durationWeeks: st.durationWeeks,
            startWeek: sWeek,
            status: idx === 0 ? 'en_progreso' : 'pendiente',
            objective: `Objetivo estratégico de ${st.name}`,
            substages: st.apartados.map((ap, apIdx) => ({
              id: `sub-${Date.now()}-${idx}-${apIdx}`,
              name: ap,
              description: `Gestión y entregables correspondientes a ${ap}`,
              tasks: [
                {
                  id: `t-${Date.now()}-${idx}-${apIdx}-1`,
                  title: `Coordinación inicial y entregables de ${ap}`,
                  role: 'Equipo de Producción',
                  completed: false,
                  milestone: apIdx === 0
                }
              ],
              expenses: [
                {
                  id: `exp-${Date.now()}-${idx}-${apIdx}-1`,
                  name: `Gasto operativo ${ap}`,
                  category: apIdx === 0 ? 'honorarios' : 'produccion',
                  unitCostCLP: Math.round(targetBudgetCLP * 0.08),
                  quantity: 1,
                  totalCLP: Math.round(targetBudgetCLP * 0.08),
                  fundingSource: 'fondo_solicitado',
                  providerOrRole: 'Equipo de Proyecto'
                }
              ]
            }))
          };
        });
      }
    }

    // Default standard 4-stage structure if no template used
    if (stagesToUse.length === 0) {
      stagesToUse = [
        {
          id: `stage-${Date.now()}-1`,
          code: 'ET-01',
          name: 'Etapa 1: Preproducción, Investigación & Diseño',
          stageType: 'preproduccion',
          durationWeeks: Math.round(durationWeeks * 0.35),
          startWeek: 1,
          status: 'en_progreso',
          objective: 'Cierre de dramaturgia o partituras, convenios de salas y diseño escenotécnico.',
          substages: [
            {
              id: `sub-${Date.now()}-1-1`,
              name: 'Investigación Dramatúrgica & Archivo Territorial',
              description: 'Levantamiento de contenidos en Santiago y Rancagua',
              tasks: [
                { id: `t-${Date.now()}-1`, title: 'Entrega de libreto y partituras finales', role: 'Dramaturgo / Compositor', completed: false, milestone: true },
                { id: `t-${Date.now()}-2`, title: 'Firma de cartas de compromiso con salas regionales', role: 'Productor Líder', completed: false, milestone: true }
              ],
              expenses: [
                { id: `exp-${Date.now()}-1`, name: 'Honorarios Creación e Investigación', category: 'honorarios', unitCostCLP: Math.round(targetBudgetCLP * 0.15), quantity: 1, totalCLP: Math.round(targetBudgetCLP * 0.15), fundingSource: 'fondo_solicitado', providerOrRole: 'Creador' }
              ]
            }
          ]
        },
        {
          id: `stage-${Date.now()}-2`,
          code: 'ET-02',
          name: 'Etapa 2: Residencia, Ensayos & Realización Técnica',
          stageType: 'produccion',
          durationWeeks: Math.round(durationWeeks * 0.4),
          startWeek: Math.round(durationWeeks * 0.35) + 1,
          status: 'pendiente',
          objective: 'Período de ensayos intensivos, confección escenotécnica y sonido.',
          substages: [
            {
              id: `sub-${Date.now()}-2-1`,
              name: 'Ensayos y Montaje Escénico',
              description: 'Jornadas de sala técnica y puesta a punto',
              tasks: [
                { id: `t-${Date.now()}-3`, title: 'Montaje de escenografía modular sustentable', role: 'Jefe Técnico', completed: false, milestone: true },
                { id: `t-${Date.now()}-4`, title: 'Ciclo de ensayos generales con elenco', role: 'Director Artístico', completed: false, milestone: false }
              ],
              expenses: [
                { id: `exp-${Date.now()}-2`, name: 'Honorarios Elenco y Dirección', category: 'honorarios', unitCostCLP: Math.round(targetBudgetCLP * 0.35), quantity: 1, totalCLP: Math.round(targetBudgetCLP * 0.35), fundingSource: 'fondo_solicitado', providerOrRole: 'Elenco' },
                { id: `exp-${Date.now()}-3`, name: 'Materiales Escenográficos Recuperados', category: 'produccion', unitCostCLP: Math.round(targetBudgetCLP * 0.12), quantity: 1, totalCLP: Math.round(targetBudgetCLP * 0.12), fundingSource: 'fondo_solicitado', providerOrRole: 'Taller' }
              ]
            }
          ]
        },
        {
          id: `stage-${Date.now()}-3`,
          code: 'ET-03',
          name: 'Etapa 3: Temporada Oficial, Gira & Mediación',
          stageType: 'exhibicion_gira',
          durationWeeks: Math.round(durationWeeks * 0.15),
          startWeek: Math.round(durationWeeks * 0.75) + 1,
          status: 'pendiente',
          objective: 'Estreno en Santiago, itinerancia en Rancagua y talleres con comunidades locales.',
          substages: [
            {
              id: `sub-${Date.now()}-3-1`,
              name: 'Exhibición y Circulación Territorial',
              tasks: [
                { id: `t-${Date.now()}-5`, title: 'Función de estreno oficial', role: 'Equipo ATHA', completed: false, milestone: true },
                { id: `t-${Date.now()}-6`, title: 'Traslado y función en Centro Cultural Baquedano (Rancagua)', role: 'Logística', completed: false, milestone: true }
              ],
              expenses: [
                { id: `exp-${Date.now()}-4`, name: 'Flete Interregional Santiago-Rancagua y Viáticos', category: 'logistica_traslados', unitCostCLP: Math.round(targetBudgetCLP * 0.08), quantity: 1, totalCLP: Math.round(targetBudgetCLP * 0.08), fundingSource: 'fondo_solicitado', providerOrRole: 'Transportes' }
              ]
            }
          ]
        },
        {
          id: `stage-${Date.now()}-4`,
          code: 'ET-04',
          name: 'Etapa 4: Archivo Vivo, Cierre Contable & Rendición',
          stageType: 'postproduccion_cierre',
          durationWeeks: Math.max(1, durationWeeks - (Math.round(durationWeeks * 0.35) + Math.round(durationWeeks * 0.4) + Math.round(durationWeeks * 0.15))),
          startWeek: Math.round(durationWeeks * 0.9) + 1,
          status: 'pendiente',
          objective: 'Registro 4K para archivo digital, rendición contable y evaluación de impacto.',
          substages: [
            {
              id: `sub-${Date.now()}-4-1`,
              name: 'Cierre Financiero y Memoria',
              tasks: [
                { id: `t-${Date.now()}-7`, title: 'Cierre contable y rendición en plataforma de fondos', role: 'Contador ATHA', completed: false, milestone: true }
              ],
              expenses: [
                { id: `exp-${Date.now()}-5`, name: 'Honorarios Contabilidad y Registro Audiovisual', category: 'honorarios', unitCostCLP: Math.round(targetBudgetCLP * 0.07), quantity: 1, totalCLP: Math.round(targetBudgetCLP * 0.07), fundingSource: 'fondo_solicitado', providerOrRole: 'Administración' }
              ]
            }
          ]
        }
      ];
    }

    const createdProject: Project = {
      id: newId,
      code: newCode,
      title: title.trim(),
      subtitle: subtitle.trim() || 'Proyecto formulado con el Asistente ATHA',
      generalObjective: generalObjective.trim(),
      specificObjectives: [
        'Desarrollar la fase de investigación y preproducción con enfoque territorial.',
        'Construir y ensayar la obra con altos estándares técnicos y criterios de sustentabilidad.',
        'Realizar temporada de estreno e itinerancia regional entre Santiago y Rancagua.'
      ],
      description: generalObjective.trim(),
      discipline,
      territory,
      status: 'borrador',
      leadProducer: leadProducer.trim(),
      artisticDirector: artisticDirector.trim() || 'Por Confirmar',
      durationWeeks,
      startDate,
      endDate: calculatedEndDate,
      contingencyPct: 5,
      stages: stagesToUse,
      fundingRegime: {
        type: fundingType,
        publicFundCategory: fundingType === 'fondos_publicos' || fundingType === 'mixto' ? publicFundCategory : undefined,
        requestedAmountCLP: targetBudgetCLP,
        cofinancingRequiredPct: 15,
        targetAudienceCapacity: 1200,
        expectedTicketSalesCount: 800,
        averageTicketPriceCLP: 6000,
        confirmedSources: [
          {
            id: `src-${Date.now()}-1`,
            name: fundingType === 'fondos_publicos' 
              ? `${publicFundCategory} (Fondo Proyectado)` 
              : fundingType === 'autogestion' 
              ? 'Proyección de Taquilla en Temporada' 
              : 'Fondo Concursable & Aportes Privados',
            type: 'pecuniario',
            category: fundingType === 'fondos_publicos' ? 'fondos_publicos' : 'taquilla',
            amountCLP: targetBudgetCLP,
            verified: false,
            notes: 'Monto estimado en Asistente de Creación'
          }
        ]
      },
      valueArchetype: {
        type: archetype,
        description: archetype === 'ciclo_circular'
          ? 'Modelo de ciclo circular centrado en la reutilización de escenografías, archivo vivo y repertorio itinerante.'
          : archetype === 'red_ecosistema'
          ? 'Modelo de red ecosistémica que articula a comunidades locales, salas comunales y agentes independientes.'
          : 'Modelo secuencial de cadena lineal orientado al estreno de alta excelencia técnica.',
        strategicAxes: [
          'Excelencia de producción técnica',
          'Vinculación de audiencias entre Santiago y Rancagua',
          'Sustentabilidad y rendición rigurosa'
        ],
        circularElements: {
          sceneryReusePct: archetype === 'ciclo_circular' ? 70 : 25,
          digitalArchive: true,
          regionalTouring: territory.includes('Interregional') || territory.includes('Gira'),
          repertoryRevival: archetype === 'ciclo_circular'
        },
        ecosystemElements: {
          communityPartnersCount: 3,
          venuesInvolved: ['Matucana 100 (Santiago)', 'Centro Cultural Baquedano (Rancagua)'],
          territoryImpact: 'Articulación interregional e integración de audiencias.',
          audiencesTarget: 'Comunidades escolares, familias y amantes de las artes vivas.'
        }
      },
      canvas: {
        artisticProposal: generalObjective.trim(),
        valuePropositionATHA: 'Producción ejecutiva cultural rigurosa, estándares de sustentabilidad y descentralización territorial.',
        targetAudiences: 'Público general, jóvenes estudiantes y audiencias de artes vivas en Santiago y O\'Higgins.',
        mediationAndAudiences: 'Cuadernillos pedagógicos, conversatorios post-función y ensayos abiertos.',
        territorialAllies: 'Centros culturales de Rancagua, salas de Santiago y red escolar municipal.',
        territorialImpact: 'Descentralización cultural efectiva con diálogo entre creadores de ambas regiones.',
        criticalResources: 'Equipo profesional, sala de residencia técnica, diseño escenográfico y transporte interregional.',
        keyActivities: 'Investigación, residencia de ensayos, estreno oficial, gira regional y rendición de cuentas.',
        riskMitigation: 'Reserva de contingencia del 5%, protocolo de recintos de respaldo y preventa escalonada.'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateProject(createdProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 w-full max-w-3xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Asistente de Creación de Proyecto
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Guía metodológica paso a paso para formular tu proyecto en ATHA Producciones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {[
              { num: 1, label: 'Identidad & Objetivo' },
              { num: 2, label: 'Equipo & Plazos' },
              { num: 3, label: 'Financiamiento' },
              { num: 4, label: 'Etapas de Trabajo' },
              { num: 5, label: 'Confirmación' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-amber-600 text-white ring-4 ring-amber-600/20 shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-[10px] mt-1 font-medium text-stone-500 dark:text-stone-400 hidden sm:block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
          
          {/* STEP 1: NOMBRE Y OBJETIVO */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Paso 1 de 5 · Lo primordial
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  ¿Cómo se llama tu proyecto y cuál es su objetivo principal?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Todo proyecto cultural exitoso se fundamenta en un nombre claro y un objetivo central bien acotado.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Nombre del Proyecto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Montaje Escénico: La Canción del Agua Fría"
                    className="w-full text-base font-bold bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Objetivo General del Proyecto <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={generalObjective}
                    onChange={(e) => setGeneralObjective(e.target.value)}
                    placeholder="Ej: Producir y presentar una obra escénica de danza y música en vivo que reflexione sobre la ecología del río Cachapoal, realizando funciones en Rancagua y Santiago con talleres para estudiantes..."
                    className="w-full text-xs sm:text-sm bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                    <span>Tip: Especifica la acción principal, la temática, la disciplina y las comunidades involucradas.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Disciplina Artística
                    </label>
                    <select
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value as DisciplineType)}
                      className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {DISCIPLINES.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Territorio de Impacto
                    </label>
                    <select
                      value={territory}
                      onChange={(e) => setTerritory(e.target.value as TerritoryType)}
                      className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {TERRITORIES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Subtítulo o Lema Descriptivo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ej: Residencia de co-creación y gira interregional Santiago · Rancagua"
                    className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EQUIPO Y PLAZOS */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Paso 2 de 5 · Gestión y Liderazgo
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  ¿Quién liderará el proyecto y cuánto durará?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Asigna al operador responsable de ATHA Producciones y establece la ventana de semanas de trabajo.
                </p>
              </div>

              <div className="space-y-4">
                {/* Operador presets */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                    Seleccionar Productor(a) Líder / Operador ATHA
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {OPERATOR_PRESETS.map((op) => {
                      const isSelected = leadProducer.includes(op.name);
                      return (
                        <button
                          key={op.name}
                          type="button"
                          onClick={() => setLeadProducer(`${op.name} (ATHA Producciones)`)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20'
                              : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-300'
                          }`}
                        >
                          <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{op.name}</div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{op.role}</div>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1 inline-block">
                            Territorio: {op.territory}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Director(a) Artístico(a) del Proyecto
                  </label>
                  <input
                    type="text"
                    value={artisticDirector}
                    onChange={(e) => setArtisticDirector(e.target.value)}
                    placeholder="Ej: Rodrigo Canales / Camila Garrido / Artista Invitado"
                    className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                        Duración Total del Proyecto
                      </label>
                      <span className="text-xs font-bold text-amber-600">
                        {durationWeeks} semanas (~{Math.round(durationWeeks / 4.33)} meses)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      step={2}
                      value={durationWeeks}
                      onChange={(e) => setDurationWeeks(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Fecha Estimada de Inicio
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIAMIENTO & ARQUETIPO */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Paso 3 de 5 · Viabilidad & Estrategia
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  ¿Bajo qué modelo económico y arquetipo cultural operará?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Establece la principal fuente de financiamiento y la forma en que se crea valor patrimonial o comunitario.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                    Régimen de Financiamiento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'fondos_publicos', label: 'Fondos Públicos Concursables', desc: 'Fondart, Fondo Música, Artes Escénicas o FNDR' },
                      { id: 'autogestion', label: 'Autogestión & Taquilla', desc: 'Sustentado en venta de tickets y alianzas' },
                      { id: 'mixto', label: 'Régimen Mixto', desc: 'Fondos concursables combinados con taquilla y auspicios' },
                      { id: 'privado_auspicio', label: 'Auspicios Privados', desc: 'Empresas, donaciones y aportes directos' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFundingType(m.id as FundingType)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          fundingType === m.id
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20'
                            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{m.label}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {(fundingType === 'fondos_publicos' || fundingType === 'mixto') && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Línea Concursable Principal
                    </label>
                    <select
                      value={publicFundCategory}
                      onChange={(e) => setPublicFundCategory(e.target.value as PublicFundCategory)}
                      className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 cursor-pointer"
                    >
                      <option value="Fondart Nacional">Fondart Nacional (Creación / Producción / Trayectoria)</option>
                      <option value="Fondart Regional">Fondart Regional (RM u O'Higgins)</option>
                      <option value="Fondo de Artes Escénicas">Fondo de Artes Escénicas (Itinerancia / Salas)</option>
                      <option value="Fondo de la Música">Fondo de la Música (Producción de Registro / Festivales)</option>
                      <option value="FNDR 8% O'Higgins / RM">FNDR 8% Comunitario (Gobierno Regional)</option>
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                      Presupuesto Objetivo Proyectado
                    </label>
                    <span className="text-xs font-bold text-amber-600">
                      ${targetBudgetCLP.toLocaleString('es-CL')} CLP
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5000000}
                    max={50000000}
                    step={1000000}
                    value={targetBudgetCLP}
                    onChange={(e) => setTargetBudgetCLP(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                    Arquetipo de Valor Cultural
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'ciclo_circular', label: 'Ciclo Circular', desc: 'Ecodiseño, archivo vivo digital y repertorio itinerante' },
                      { id: 'cadena_lineal', label: 'Cadena Lineal', desc: 'Secuencia clásica orientada al estreno y entrega final' },
                      { id: 'red_ecosistema', label: 'Red Ecosistémica', desc: 'Articulación comunitaria, múltiples salas y co-creación' }
                    ].map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setArchetype(a.id as ArchetypeType)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          archetype === a.id
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20'
                            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{a.label}</div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ESTRUCTURA DE ETAPAS */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Paso 4 de 5 · Arquitectura Horizontal
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  ¿Cómo estructurar las etapas iniciales de trabajo?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Las etapas se dispondrán de forma horizontal con menús desplegables para apartados, tareas y presupuesto.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStructureType('standard')}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      structureType === 'standard'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-stone-100 mb-1">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>Estructura Estándar 4 Etapas (Recomendada)</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Preproducción & Investigación ➔ Residencia & Producción ➔ Exhibición & Gira ➔ Cierre & Rendición.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStructureType('template')}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      structureType === 'template'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-stone-100 mb-1">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Usar Plantilla ATHA Validada</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Cargar estructura preconfigurada por operadores de ATHA Producciones (Fondart, Festivales, Mediación).
                    </p>
                  </button>
                </div>

                {structureType === 'template' && (
                  <div className="p-4 rounded-2xl bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-3">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Selecciona una Plantilla ATHA:
                    </label>
                    <div className="space-y-2">
                      {INITIAL_TEMPLATES.map((tmpl) => (
                        <label
                          key={tmpl.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedTemplateId === tmpl.id
                              ? 'bg-white dark:bg-stone-900 border-amber-500'
                              : 'bg-white/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-700 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="template_select"
                            checked={selectedTemplateId === tmpl.id}
                            onChange={() => setSelectedTemplateId(tmpl.id)}
                            className="mt-0.5 accent-amber-600"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-stone-900 dark:text-stone-100 block">{tmpl.name}</span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">{tmpl.description}</span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                              <span>{tmpl.suggestedDurationWeeks} semanas</span>
                              <span>·</span>
                              <span>{tmpl.suggestedStages?.length || 4} etapas</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: RESUMEN Y CONFIRMACIÓN */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Paso 5 de 5 · Listo para construir
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  Confirmación de Aspectos Principales
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Revisa los parámetros definidos. Al confirmar, tu proyecto se creará y serás dirigido a los Datos Principales y Etapas de Trabajo.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200 dark:border-stone-700 space-y-4 text-xs">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-amber-200/60 dark:border-stone-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Proyecto a Crear</span>
                    <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      {title || 'Proyecto Sin Título'}
                    </h4>
                    {subtitle && <p className="text-stone-600 dark:text-stone-400 text-xs mt-0.5">{subtitle}</p>}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px] shrink-0">
                    {discipline}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1">Objetivo General:</span>
                  <p className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/40 dark:border-stone-700 text-stone-800 dark:text-stone-200 italic leading-relaxed">
                    "{generalObjective || 'Sin objetivo definido'}"
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Territorio</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{territory}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Productor Líder</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 truncate block">{leadProducer}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Temporalidad</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{durationWeeks} semanas</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Presupuesto Objetivo</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">${targetBudgetCLP.toLocaleString('es-CL')} CLP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between gap-4">
          <div>
            {step > 1 ? (
              <button
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <span className="text-xs text-stone-400">Paso inicial</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
            >
              Cancelar
            </button>

            {step < 5 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-create-project-final"
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Crear Proyecto & Ir a Datos Principales</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
