export type Discipline = 'Teatro' | 'Danza' | 'Música' | 'Festival' | 'Interdisciplinar';

export type ObraStatus = 'En repertorio' | 'En gira' | 'En producción' | 'Estreno' | 'I+D';

export interface Obra {
  id: string;
  title: string;
  discipline: Discipline;
  format: string; // 'Sala Grande' | 'Caja Negra' | 'Espacio Público' | 'Íntimo / Concierto'
  duration: string;
  targetAudience: string;
  status: ObraStatus;
  synopsis: string;
  castTeam: {
    direction: string;
    cast: string[];
    music: string;
    technical: string;
  };
  technicalRider: {
    minStageWidthMeters: number;
    minStageDepthMeters: number;
    lighting: string;
    sound: string;
    loadInHours: number;
    crewRequired: number;
  };
  economics: {
    feeCLP: number; // Caché referencial
    ticketSplitEstimatedCLP: number;
    productionCostCLP: number;
  };
  premiereDate: string;
  image: string;
  dossierHighlights: string[];
  /** Ruta al dossier PDF completo alojado en el sitio (ej: /obras/kelu/dossier.pdf) */
  dossierPdf?: string;
  notes?: string;
}

export type LeadType = 'sala' | 'festival' | 'programador' | 'artista' | 'proveedor';
export type LeadStatus = 'contactado' | 'negociacion' | 'cerrado' | 'archivado';

export interface Lead {
  id: string;
  name: string;
  organization: string;
  type: LeadType;
  status: LeadStatus;
  city: string;
  email: string;
  phone: string;
  notes: string;
  lastContactDate: string;
  estimatedValueCLP: number;
  assignedTo: string;
}

export interface ProjectRD {
  id: string;
  code: string;
  title: string;
  progress: number; // 0-100
  phase: string;
  description: string;
  teamLead: string;
  budgetCLP: number;
  spentCLP: number;
  milestoneUpcoming: string;
  tags: string[];
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  title: string;
  bio: string;
  image: string;
  email: string;
  phone: string;
  location: string;
  activeProjects: string[];
  discipline: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  region: string;
  capacity: number;
  stageType: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'Activo / Convenio' | 'En prospección' | 'Histórico' | 'Bloqueado';
  specs: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Audio / Backline' | 'Iluminación' | 'Estructura / Escenario' | 'Video / Proyección' | 'Cables & DMX';
  condition: 'Excelente' | 'Operativo' | 'En mantención';
  status: 'Disponible' | 'Asignado en gira' | 'En bodega central';
  assignedToWork?: string;
  location: string;
  valueCLP: number;
}

export interface FinanceRecord {
  id: string;
  projectId: string;
  projectName: string;
  type: 'Ingreso' | 'Gasto';
  category: 'Honorarios' | 'Traslados/Viáticos' | 'Técnica & Arriendo' | 'Escenografía & Vestuario' | 'Difusión & Prensa';
  amountCLP: number;
  date: string;
  status: 'Rendido' | 'Pendiente' | 'Aprobado';
  invoiceRef: string;
  responsible: string;
}

export interface CreativeLog {
  id: string;
  obraId: string;
  obraTitle: string;
  date: string;
  author: string;
  phase?: 'Concepto' | 'Dramaturgia / Partitura' | 'Ensayo general' | 'Puesta técnica' | string;
  title: string;
  entry: string;
  tags: string[];
}

export type ProcessLog = CreativeLog;

export interface StandardRider {
  id: string;
  title: string;
  category: string;
  version: string;
  description: string;
  keySpecs: string[];
  pdfFileTitle: string;
  technicalDirector: string;
  specs?: {
    equipment: string[];
    powerRequirement: string;
    crewNeeded: string;
    setupNotes: string;
  };
  lastUpdated?: string;
}

export type TechnicalRider = StandardRider;

export interface ReminderNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  date: string;
  read: boolean;
}

export type UserProfile = UserSession;


export interface EventSchedule {
  id: string;
  title: string;
  obraId: string;
  obraTitle: string;
  type: 'Ensayo' | 'Montaje técnico' | 'Función / Estreno' | 'Reunión de producción';
  date: string;
  timeStart: string;
  timeEnd: string;
  venue: string;
  castCount: number;
  status: 'Confirmado' | 'Pendiente' | 'Completado';
}

export interface ArtistAvailability {
  id: string;
  artistName: string;
  role: string;
  avatar: string;
  timeSlots: {
    lunes: string[];
    martes: string[];
    miercoles: string[];
    jueves: string[];
    viernes: string[];
    sabado: string[];
  };
  notes: string;
}

export interface ArtistPortfolioFile {
  id: string;
  name: string;
  sizeBytes: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface ArtistMilestone {
  id: string;
  year: string;
  title: string;
  category: 'Estreno' | 'Premio' | 'Residencia' | 'Gira' | 'Formación' | 'Publicación' | 'Otro';
  description: string;
  institution?: string;
}

export interface SocialLinks {
  instagram?: string;
  spotify?: string;
  youtube?: string;
  vimeo?: string;
  linkedin?: string;
  website?: string;
  facebook?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  provider: 'google' | 'apple' | 'atha_id';
  artisticName?: string;
  discipline?: string;
  phone?: string;
  location?: string;
  rut?: string;
  bioShort?: string;
  bioFull?: string;
  socialLinks?: SocialLinks;
  milestones?: ArtistMilestone[];
  files?: ArtistPortfolioFile[];
}

export interface CompanyGroup {
  id: string;
  name: string;
  discipline: string;
  description: string;
  members: string[]; // e.g. ['Anto', 'Jo', 'Tucu', 'Nico', 'Pancho']
  sqlTag: string; // e.g. 'atha_core_sql'
  materialCount: number;
  activeProjects: string[];
  avatar: string;
  contactEmail: string;
  createdDate: string;
  portfolioFiles: ArtistPortfolioFile[];
}

export interface AboutCompanyInfo {
  name: string;
  legalName: string;
  rut: string;
  founded: string;
  tagline: string;
  mission: string;
  vision: string;
  values: string[];
  stats: {
    totalObras: number;
    funcionesRealizadas: number;
    espectadoresHistoricos: number;
    regionesVisitadas: number;
    premiosNacionales: number;
  };
  contact: {
    address: string;
    email: string;
    phone: string;
    web: string;
  };
}



/* ==========================================================================
   MÓDULO DE GESTIÓN MODULAR DE LA INTERFAZ
   Preferencias por usuario: tema (acento, tipografía, densidad, superficie,
   color de fondo) y disposición (perfil y barra de navegación).
   ========================================================================== */

export type AccentColorId =
  | 'terracota-fase'
  | 'ambar-escenico'
  | 'naranja-corporativo'
  | 'gris-industrial'
  | 'esmeralda-creativa';

export type FontFamilyOption = 'Inter' | 'Playfair Display' | 'JetBrains Mono';
export type SurfaceStyleOption = 'clean-card' | 'minimal-border';
export type DensityOption = 'compact' | 'comfortable';
export type ProfileSectionKey = 'datos-personales' | 'biografia' | 'trayectoria' | 'redes' | 'archivos';

export interface NavbarConfig {
  position: 'arriba' | 'lateral' | 'abajo';
  estilo: 'solida' | 'translucida' | 'minimal';
  compacta: boolean;
  ocultos: string[];
  orden: string[];
}

export interface UserPreferencesPayload {
  theme_config: {
    accentColor: AccentColorId;
    fontFamily: FontFamilyOption;
    surfaceStyle: SurfaceStyleOption;
    density: DensityOption;
    /** Color de fondo elegido a mano. null/undefined = el de la paleta. */
    bgColor?: string | null;
  };
  layout_config: {
    profile_view: {
      order: ProfileSectionKey[];
      hidden: ProfileSectionKey[];
    };
    navbar?: NavbarConfig;
  };
}
