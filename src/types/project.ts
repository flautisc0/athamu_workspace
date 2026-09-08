/**
 * Ecosistema ATHA Producciones Ltda — Capa Intermedia / Intranet
 * Esquema de Datos del Arquitecto de Proyecto (Compatible con CRM ATHAMU)
 */

export type DisciplineType = 
  | 'Artes Escénicas (Teatro/Danza/Circo)'
  | 'Música en Vivo / Conciertos'
  | 'Gestión Cultural & Mediación'
  | 'Industrias Creativas & Audiovisual'
  | 'Multidisciplinar';

export type TerritoryType = 
  | 'Santiago (RM)'
  | 'Rancagua / Región de O\'Higgins'
  | 'Interregional (Santiago ↔ Rancagua)'
  | 'Gira Nacional'
  | 'Internacional';

export type ProjectStatus = 
  | 'borrador'
  | 'en_evaluacion'
  | 'aprobado'
  | 'en_produccion'
  | 'en_gira'
  | 'finalizado_por_rendir'
  | 'cerrado';

export type FundingType = 
  | 'fondos_publicos'
  | 'autogestion'
  | 'mixto'
  | 'privado_auspicio';

export type PublicFundCategory = 
  | 'Fondart Nacional'
  | 'Fondart Regional'
  | 'Fondo de la Música'
  | 'Fondo de Artes Escénicas'
  | 'CORFO Economía Creativa'
  | 'FNDR 8% O\'Higgins / RM'
  | 'Otro';

export type ExpenseCategory = 
  | 'honorarios'
  | 'produccion'
  | 'tecnica_equipos'
  | 'difusion_marketing'
  | 'logistica_traslados'
  | 'espacios_salas'
  | 'imprevistos';

export type ExpenseFundingSource = 
  | 'fondo_solicitado'
  | 'aporte_propio_pecuniario'
  | 'aporte_propio_valorizado'
  | 'aporte_terceros_pecuniario'
  | 'aporte_terceros_valorizado'
  | 'taquilla_esperada'
  | 'auspicio_privado';

export interface ExpenseItem {
  id: string;
  name: string;
  category: ExpenseCategory;
  unitCostCLP: number;
  quantity: number;
  totalCLP: number;
  fundingSource: ExpenseFundingSource;
  providerOrRole?: string;
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  role: string;
  completed: boolean;
  milestone: boolean;
  notes?: string;
}

export interface Substage {
  id: string;
  name: string;
  description?: string;
  tasks: TaskItem[];
  expenses: ExpenseItem[];
}

export interface Stage {
  id: string;
  code: string; // ej. 'ET-01'
  name: string; // ej. 'Etapa 1: Pre-producción y Creación'
  stageType?: 'preproduccion' | 'produccion' | 'exhibicion_gira' | 'postproduccion_cierre';
  apartados?: string[];
  durationWeeks: number;
  startWeek: number;
  status: 'pendiente' | 'en_progreso' | 'completada';
  objective: string;
  substages: Substage[];
}

export type ArchetypeType = 'cadena_lineal' | 'ciclo_circular' | 'red_ecosistema';

export interface ValueArchetype {
  type: ArchetypeType;
  description: string;
  strategicAxes: string[];
  circularElements: {
    sceneryReusePct: number;
    digitalArchive: boolean;
    regionalTouring: boolean;
    repertoryRevival: boolean;
  };
  ecosystemElements: {
    communityPartnersCount: number;
    venuesInvolved: string[];
    territoryImpact: string;
    audiencesTarget: string;
  };
}

export interface FundingSourceItem {
  id: string;
  name: string;
  type: 'pecuniario' | 'valorizado';
  category: 'fondos_publicos' | 'aporte_propio' | 'aporte_tercero' | 'taquilla' | 'auspicio';
  amountCLP: number;
  verified: boolean;
  notes?: string;
}

export interface FundingRegime {
  type: FundingType;
  publicFundCategory?: PublicFundCategory;
  requestedAmountCLP: number;
  cofinancingRequiredPct: number;
  targetAudienceCapacity: number;
  expectedTicketSalesCount: number;
  averageTicketPriceCLP: number;
  confirmedSources: FundingSourceItem[];
}

export interface StrategicCanvas {
  artisticProposal: string;
  targetAudiences: string;
  territorialAllies: string;
  criticalResources: string;
  keyActivities: string;
  valuePropositionATHA: string;
  mediationAndAudiences: string;
  territorialImpact: string;
  riskMitigation: string;
}

export interface OperatorProfile {
  id: string;
  name: string;
  role: string;
  email?: string;
  territory?: string;
}

export interface ProjectScenario {
  id: string;
  name: string;
  probability: 'alta' | 'media' | 'baja';
  ticketSalesRate: number;
  totalIncomeCLP: number;
  totalExpensesCLP: number;
  netMarginCLP: number;
  breakEvenTickets?: number;
  riskLevel: 'minimo' | 'bajo' | 'medio' | 'alto';
  contingencyPlan?: string;
}

export interface Project {
  id: string;
  code: string; // ej. 'ATHA-PRJ-2026-001'
  title: string;
  subtitle: string;
  discipline: DisciplineType;
  territory: TerritoryType;
  status: ProjectStatus;
  leadProducer: string;
  artisticDirector: string;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  description: string;
  generalObjective?: string;
  specificObjectives?: string[];
  contingencyPct: number; // Por defecto 5%
  
  // Extensiones v1.1.0-ATHAMU
  operator?: OperatorProfile;
  fundingRegimeStage?: 'en_formulacion' | 'postulacion_adjudicada' | 'ejecucion_concursable' | 'rendicion_cierre';
  scenarios?: ProjectScenario[];
  referenceAt?: string;
  referenceBaseline?: string;

  // 4 Dimensiones Conceptuales
  stages: Stage[];
  fundingRegime: FundingRegime;
  valueArchetype: ValueArchetype;
  canvas: StrategicCanvas;
  
  updatedAt: string;
  createdAt: string;
}

export interface TemplateStageSuggestion {
  code: string;
  name: string;
  stageType: 'preproduccion' | 'produccion' | 'exhibicion_gira' | 'postproduccion_cierre';
  durationWeeks: number;
  apartados: string[];
  typicalTasks: string[];
}

export interface ProjectTemplate {
  id: string;
  code: string;
  name: string;
  description: string;
  discipline: DisciplineType;
  scope: 'comun' | 'operador';
  operatorId?: string;
  operatorName?: string;
  archetype: ArchetypeType;
  suggestedDurationWeeks: number;
  suggestedStages: TemplateStageSuggestion[];
  baseCostRangeCLP: {
    min: number;
    max: number;
    typical: number;
    currency: 'CLP';
  };
  recommendedFundingType: FundingType;
  tags: string[];
  referenceAt: string;
}

export interface MetricFieldDefinition {
  key: string;
  name: string;
  category: 'financiero' | 'territorial' | 'arquetipo' | 'operacional';
  type: 'currency_clp' | 'percentage' | 'number' | 'weeks' | 'enum' | 'boolean';
  unit?: string;
  description: string;
  targetRange?: {
    min?: number;
    max?: number;
    optimal?: number | string;
  };
}

export interface MetricsSchema {
  version: string;
  title: string;
  description: string;
  currency: 'CLP';
  metrics: MetricFieldDefinition[];
}

export interface ATHAMUExportPayload {
  contractVersion: '1.1.0-ATHAMU';
  system: 'ATHA-INTRANET-CRM-ARQUITECTO';
  validUntil: string;
  connectorStatus: 'offline_standalone' | 'connected';
  exportedAt: string;
  totalProjectsCount?: number;
  projects: Project[];
  activeProjectId?: string;
  totalTemplatesCount?: number;
  templates: ProjectTemplate[];
  metricsSchema: MetricsSchema;
  metadata: {
    ecosystemLayer: string;
    agentMacContext: string;
    notes: string;
    totalProjectsCount?: number;
    totalTemplatesCount?: number;
  };
}
