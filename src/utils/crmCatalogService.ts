/**
 * crmCatalogService.ts — Capa de conexión Arquitecto ↔ backend CRM real.
 *
 * Lee/obra de datos REAL del backend CRM v1 (localhost:5052/api/v1/crm):
 *   GET  /portfolio/projects  → obras + integrantes
 *   GET  /portfolio/folders   → folders reales (derivados)
 *   GET  /portfolio/team      → integrantes
 *   POST /portfolio/projects  → CREATE obra
 *   PATCH .../portfolio/projects/:id → UPDATE obra
 *
 * Si el backend no responde (offline / intranet caída) → fallback a localStorage.
 *
 * Auth: usuarios autenticados vía Google Identity Services.
 *   El token JWT se persiste en localStorage bajo 'atha_auth_token'.
 */
import { Project } from '../types/project';
import { CrmFolder, CrmCatalogEntry } from '../types/crm';
import { INITIAL_PROJECTS } from '../data/initialProjects';
import { calculateProjectFinances } from './calculations';

// ---------------------------------------------------------------------------
// Configuración: backend real (env) + localStorage keys (fallback)
// ---------------------------------------------------------------------------
const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL ||
  'http://localhost:5052/api/v1/crm';

const CRM_FOLDERS_STORAGE_KEY = 'atha_crm_folders_v1';
const CRM_CATALOG_STORAGE_KEY = 'atha_crm_catalog_v1';
const AUTH_TOKEN_KEY = 'atha_auth_token';
const USER_SESSION_KEY = 'atha_user_session';

// ---------------------------------------------------------------------------
// Auth helpers — Google Identity Services (JWT persistido)
// ---------------------------------------------------------------------------
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  provider: 'google' | 'apple';
  avatar?: string;
}

export function saveUserSession(user: UserSession): void {
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
}

export function getUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearUserSession(): void {
  localStorage.removeItem(USER_SESSION_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Headers con Authorization Bearer (para identidad de usuario en backend). */
function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ---------------------------------------------------------------------------
// Network helper: fetch al backend real, fallback a localStorage
// ---------------------------------------------------------------------------
async function getJSON<T>(path: string, allowFallback: boolean = true): Promise<T | null> {
  const url = `${BACKEND_URL}${path}`;
  try {
    const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as T;
  } catch (e) {
    if (import.meta.env?.DEV) console.warn(`Backend no disponible (${url}):`, e);
    return allowFallback ? null : null;
  }
}

async function postJSON(path: string, body: any): Promise<any | null> {
  const url = `${BACKEND_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (import.meta.env?.DEV) console.warn(`Backend no disponible (${url}):`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Default folders (fallback cuando el backend no responde)
// ---------------------------------------------------------------------------
export const DEFAULT_CRM_FOLDERS: CrmFolder[] = [
  {
    id: 'folder-santiago-escenicas',
    name: 'Santiago · Artes Escénicas (Matucana 100 / Temporadas)',
    category: 'territorio',
    description: 'Montajes teatrales, danza y coproducciones para el circuito metropolitano de salas.',
    iconName: 'theater',
    projectIds: ['atha-prj-001'],
  },
  {
    id: 'folder-rancagua-musica',
    name: "Rancagua & O'Higgins · Música & Festivales",
    category: 'territorio',
    description: 'Festivales de música independiente, conciertos al aire libre y eventos autogestionados.',
    iconName: 'music',
    projectIds: ['atha-prj-002'],
  },
  {
    id: 'folder-cachapoal-mediacion',
    name: 'Valle del Cachapoal · Mediación & Residencias',
    category: 'disciplina',
    description: 'Proyectos de investigación territorial, residencias escolares y archivos patrimoniales.',
    iconName: 'school',
    projectIds: ['atha-prj-003'],
  },
  {
    id: 'folder-portafolio-fondos',
    name: 'Portafolio Fondart & FNDR 2026',
    category: 'portafolio',
    description: 'Iniciativas con expediente técnico listo para postulación y fondos públicos concursables.',
    iconName: 'file-badge',
    projectIds: ['atha-prj-001', 'atha-prj-003'],
  },
  {
    id: 'folder-nuevas-propuestas',
    name: 'Nuevas Propuestas en Formulación',
    category: 'estado',
    description: 'Borradores de proyectos en etapa de ideación y cálculo paramétrico inicial.',
    iconName: 'sparkles',
    projectIds: [],
  },
];

// ---------------------------------------------------------------------------
// Mappers: backend real (portfolio/projects) → tipo Project del Arquitecto
// ---------------------------------------------------------------------------
function mapBackendProjectToEntry(p: any): CrmCatalogEntry {
  const fin = calculateProjectFinances({
    stages: [], leadProducer: '', artisticDirector: '',
    contingencyPct: 0,
  } as any);
  const totalBudget = fin.totalBudgetCLP || 0;

  const folderMap: Record<string, { id: string; name: string }> = {
    musica: { id: 'folder-rancagua-musica', name: "Rancagua & O'Higgins · Música & Festivales" },
    teatro: { id: 'folder-santiago-escenicas', name: 'Santiago · Artes Escénicas' },
    danza: { id: 'folder-santiago-escenicas', name: 'Santiago · Artes Escénicas' },
    circus: { id: 'folder-santiago-escenicas', name: 'Santiago · Artes Escénicas' },
  };
  const cat = (p.category || p.discipline || '').toLowerCase();
  const folder = folderMap[cat] || { id: 'folder-nuevas-propuestas', name: 'Nuevas Propuestas en Formulación' };

  return {
    id: p.id,
    projectId: p.id,
    projectCode: `ATHA-PRJ-${p.year || new Date().getFullYear()}-${String(Math.abs((p.id || '').hashCode ? Math.abs(p.id.hashCode()) % 900 + 100 : 1).toString().padStart(3, '0'))}`,
    title: p.title || p.titulo || p.name,
    subtitle: p.description || p.descripcion || '',
    folderId: folder.id,
    folderName: folder.name,
    discipline: p.category || p.disciplina || 'Artes Escénicas (Teatro/Danza/Circo)',
    territory: p.location || 'Santiago (RM)',
    status: mapStatus(p.status || 'borrador'),
    totalBudgetCLP: totalBudget,
    stagesCount: p.stages?.length || 0,
    tasksCount: p.members?.length || 0,
    completedTasksCount: 0,
    progressPct: 0,
    lastSyncedAt: p.created_at || new Date().toISOString(),
    operatorName: p.members?.[0]?.name || 'Equipo ATHA',
    syncStatus: 'synced',
    notes: p.members ? `Conectado a CRM real — ${p.members.length} integrantes` : 'Desde backend CRM v1',
    projectData: mapFullProject(p),
  };
}

function mapFullProject(p: any): Project {
  return {
    id: p.id,
    code: `ATHA-PRJ-${p.year || new Date().getFullYear()}-001`,
    title: p.title || p.titulo,
    subtitle: p.description || p.descripcion || 'Proyecto sincronizado desde CRM real',
    discipline: (p.category || p.disciplina || 'Artes Escénicas (Teatro/Danza/Circo)') as any,
    territory: (p.location || 'Santiago (RM)') as any,
    status: mapStatus(p.status || 'draft') as any,
    leadProducer: 'ATHA Producciones',
    artisticDirector: p.members?.find((m: any) => m.role?.toLowerCase().includes('director'))?.name || 'Por confirmar',
    durationWeeks: 16,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: p.description || '',
    contingencyPct: 5,
    stages: [],
    fundingRegime: {
      type: 'fondos_publicos',
      publicFundCategory: 'Fondart Nacional',
      requestedAmountCLP: 0,
      cofinancingRequiredPct: 10,
      confirmedSources: [],
      targetAudienceCapacity: 0,
      averageTicketPriceCLP: 0,
      expectedTicketSalesCount: 0,
    },
    valueArchetype: {
      type: 'cadena_lineal',
      description: 'Proyecto sincronizado desde el CRM real vía backend.',
      strategicAxes: [],
      circularElements: { sceneryReusePct: 0, digitalArchive: false, regionalTouring: false, repertoryRevival: false },
      ecosystemElements: { communityPartnersCount: 0, venuesInvolved: [], territoryImpact: '', audiencesTarget: '' },
    },
    canvas: {
      artisticProposal: '', valuePropositionATHA: '', targetAudiences: '',
      mediationAndAudiences: '', territorialAllies: '', territorialImpact: '',
      criticalResources: '', keyActivities: '', riskMitigation: '',
    },
    updatedAt: p.created_at || new Date().toISOString(),
    createdAt: p.created_at || new Date().toISOString(),
  } as Project;
}

function mapStatus(s: string): Project['status'] {
  const m: Record<string, any> = {
    activo: 'en_produccion', open: 'en_produccion', draft: 'borrador',
    borrador: 'borrador', produccion: 'en_produccion',
  };
  return m[s?.toLowerCase()] || 'borrador';
}

// String.hashCode polyfill para generar projectCode
// eslint-disable-next-line no-extend-native
(String.prototype as any).hashCode = function (): number {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    hash = (Math.imul(31, hash) ^ this.charCodeAt(i)) & 0xffffffff;
  }
  return hash;
};

async function getHashCode(s: string): Promise<number> {
  return Promise.resolve(typeof (s as any).hashCode === 'function' ? (s as any).hashCode() : 0);
}

// ---------------------------------------------------------------------------
// loaders — intentan backend REAL, fallback localStorage
// ---------------------------------------------------------------------------
export async function loadCrmFoldersAsync(): Promise<CrmFolder[]> {
  const data = await getJSON<{ projects: any[] }>('/portfolio/projects');
  if (data) {
    // Derivar folders del backend → agrupar por category/territorio
    const folderMap: Record<string, { id: string; name: string; category: string; description: string; iconName: string; projectIds: string[] }> = {
      musica: { id: 'folder-rancagua-musica', name: "Rancagua & O'Higgins · Música & Festivales", category: 'territorio', description: 'Festivales de música independiente.', iconName: 'music', projectIds: [] },
      teatro: { id: 'folder-santiago-escenicas', name: 'Santiago · Artes Escénicas', category: 'territorio', description: 'Montajes teatrales y danza.', iconName: 'theater', projectIds: [] },
    };
    const folders = Object.values(folderMap);
    data.projects.forEach(p => {
      const key = (p.category || '').toLowerCase();
      const f = folderMap[key] || { ...folderMap.musica, id: `folder-${key}`, name: `${key} · ATHA`, category: 'disciplina', projectIds: [] as string[] };
      f.projectIds.push(p.id);
      if (!folders.find(ex => ex.id === f.id)) folders.push(f);
    });
    return folders;
  }
  // fallback localStorage
  try {
    const saved = localStorage.getItem(CRM_FOLDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { console.error('Error loading CRM folders from storage', e); }
  return DEFAULT_CRM_FOLDERS;
}

export function loadCrmFolders(): CrmFolder[] {
  // Sync version (para compat con components existentes) → usa localStorage si disponible
  try {
    const saved = localStorage.getItem(CRM_FOLDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { console.error('Error loading CRM folders from storage', e); }
  return DEFAULT_CRM_FOLDERS;
}

export function saveCrmFolders(folders: CrmFolder[]): void {
  try { localStorage.setItem(CRM_FOLDERS_STORAGE_KEY, JSON.stringify(folders)); }
  catch (e) { console.error('Error saving CRM folders to storage', e); }
}

export async function loadCrmCatalogAsync(): Promise<CrmCatalogEntry[]> {
  const data = await getJSON<{ projects: any[] }>('/portfolio/projects');
  if (data?.projects && Array.isArray(data.projects)) {
    const catalog = data.projects.map(mapBackendProjectToEntry);
    // cache de respaldo
    saveCrmCatalog(catalog.map(c => ({ ...c, projectData: c.projectData as any })));
    return catalog;
  }
  // fallback localStorage
  return loadCrmCatalog();
}

export function loadCrmCatalog(): CrmCatalogEntry[] {
  try {
    const saved = localStorage.getItem(CRM_CATALOG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { console.error('Error loading CRM catalog from storage', e); }
  const initial = getInitialCrmCatalog(INITIAL_PROJECTS);
  saveCrmCatalog(initial);
  return initial;
}

export function saveCrmCatalog(entries: CrmCatalogEntry[]): void {
  try { localStorage.setItem(CRM_CATALOG_STORAGE_KEY, JSON.stringify(entries)); }
  catch (e) { console.error('Error saving CRM catalog to storage', e); }
}

// ---------------------------------------------------------------------------
// getInitialCrmCatalog (fallback local-only)
// ---------------------------------------------------------------------------
export function getInitialCrmCatalog(projects: Project[] = INITIAL_PROJECTS): CrmCatalogEntry[] {
  return projects.map((proj, idx) => {
    const fin = calculateProjectFinances(proj);
    let targetFolderId = 'folder-nuevas-propuestas';
    let targetFolderName = 'Nuevas Propuestas en Formulación';
    if (proj.discipline.includes('Escénicas')) {
      targetFolderId = 'folder-santiago-escenicas'; targetFolderName = 'Santiago · Artes Escénicas';
    } else if (proj.discipline.includes('Música')) {
      targetFolderId = 'folder-rancagua-musica'; targetFolderName = "Rancagua & O'Higgins · Música & Festivales";
    } else {
      targetFolderId = 'folder-cachapoal-mediacion'; targetFolderName = 'Valle del Cachapoal · Mediación & Residencias';
    }
    let totalT = 0, compT = 0;
    proj.stages.forEach(s => s.substages.forEach(sub => { totalT += sub.tasks.length; compT += sub.tasks.filter(t => t.completed).length; }));
    const progressPct = totalT > 0 ? Math.round((compT / totalT) * 100) : 0;
    return {
      id: `crm-entry-${proj.id}`,
      projectId: proj.id,
      projectCode: proj.code,
      title: proj.title,
      subtitle: proj.subtitle,
      folderId: targetFolderId,
      folderName: targetFolderName,
      discipline: proj.discipline,
      territory: proj.territory,
      status: proj.status,
      totalBudgetCLP: fin.totalBudgetCLP,
      stagesCount: proj.stages.length,
      tasksCount: totalT,
      completedTasksCount: compT,
      progressPct,
      lastSyncedAt: proj.updatedAt || new Date().toISOString(),
      operatorName: proj.operator?.name || proj.leadProducer,
      syncStatus: 'synced',
      notes: `Sincronizado inicialmente con Intranet CRM ATHAMU (${proj.referenceBaseline || 'Tabulador Base'})`,
      projectData: JSON.parse(JSON.stringify(proj)),
    };
  });
}

// ---------------------------------------------------------------------------
// sendProjectToCrm — intenta POST/PATCH al backend, fallback localStorage
// ---------------------------------------------------------------------------
export async function sendProjectToCrmAsync(
  project: Project,
  folderId: string,
  notes?: string,
): Promise<{ success: boolean; entry: CrmCatalogEntry; updatedCatalog: CrmCatalogEntry[]; backend: boolean } | null> {
  // Intenta backend real vía POST /portfolio/projects
  const body = {
    id: project.id,
    title: project.title,
    disciplina: project.discipline,
    descripcion: project.description,
    estado: project.status,
    budget_range: '',
    location: project.territory,
    category: project.category || project.discipline?.toLowerCase().includes('música') ? 'musica' : 'teatro',
    year: parseInt(project.code.split('-')[2] || new Date().getFullYear().toString()),
    image_url: '',
  };
  const resp = await postJSON('/portfolio/projects', body);
  if (resp?.ok) {
    // éxito backend → rebuild catalog desde backend
    const fresh = await loadCrmCatalogAsync();
    const entry = fresh.find(e => e.projectId === project.id) || mapBackendProjectToEntry({ ...body, id: project.id, project_code: project.code });
    return { success: true, entry, updatedCatalog: fresh, backend: true };
  }
  // fallback localStorage
  const sync = sendProjectToCrm(project, folderId, notes);
  return { success: true, entry: sync.entry, updatedCatalog: sync.updatedCatalog, backend: false };
}

export function sendProjectToCrm(
  project: Project,
  folderId: string,
  notes?: string,
): { success: boolean; entry: CrmCatalogEntry; updatedCatalog: CrmCatalogEntry[] } {
  const catalog = loadCrmCatalog();
  const folders = loadCrmFolders();
  const targetFolder = folders.find(f => f.id === folderId) || folders[0];
  const fin = calculateProjectFinances(project);
  let totalTasks = 0, completedTasks = 0;
  project.stages.forEach(s => s.substages.forEach(sub => { totalTasks += sub.tasks.length; completedTasks += sub.tasks.filter(t => t.completed).length; }));
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const now = new Date().toISOString();
  const existingIdx = catalog.findIndex(e => e.projectId === project.id);
  const entry: CrmCatalogEntry = {
    id: existingIdx >= 0 ? catalog[existingIdx].id : `crm-entry-${project.id}`,
    projectId: project.id,
    projectCode: project.code,
    title: project.title,
    subtitle: project.subtitle,
    folderId: targetFolder.id,
    folderName: targetFolder.name,
    discipline: project.discipline,
    territory: project.territory,
    status: project.status,
    totalBudgetCLP: fin.totalBudgetCLP,
    stagesCount: project.stages.length,
    tasksCount: totalTasks,
    completedTasksCount: completedTasks,
    progressPct,
    lastSyncedAt: now,
    operatorName: project.operator?.name || project.leadProducer,
    syncStatus: 'synced',
    notes: notes || `Enviado desde el Arquitecto de Proyecto al CRM ATHAMU (${now.split('T')[0]})`,
    projectData: JSON.parse(JSON.stringify(project)),
  };
  let updatedCatalog: CrmCatalogEntry[];
  updatedCatalog = existingIdx >= 0
    ? catalog.map((item, idx) => idx === existingIdx ? entry : item)
    : [entry, ...catalog];
  saveCrmCatalog(updatedCatalog);
  const updatedFolders = folders.map(f => {
    if (f.id === targetFolder.id && !f.projectIds.includes(project.id)) return { ...f, projectIds: [...f.projectIds, project.id] };
    return f;
  });
  saveCrmFolders(updatedFolders);
  return { success: true, entry, updatedCatalog };
}

export function createNewCrmFolder(name: string, description: string): CrmFolder {
  const folders = loadCrmFolders();
  const newFolder: CrmFolder = { id: `folder-custom-${Date.now()}`, name, category: 'portafolio', description, iconName: 'folder', projectIds: [] };
  const updated = [...folders, newFolder];
  saveCrmFolders(updated);
  return newFolder;
}
