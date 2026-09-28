/**
 * Servicio de Cliente API y Sincronización con CRM v1 (Cloud Run + Cloud SQL)
 * Rutea al HUB del CRM (atha-crm-web-frontend) por rutas relativas:
 */

// El CRM lo sirve el HUB: las rutas relativas van al hub (misma base y misma sesión).
// Antes apuntaba a crm-v1-uc, un servicio aparte: los datos se duplicaban.
import { leerSesionCrm, cabeceraToken } from '../utils/sesionEcosistema';

const CRM_BASE_URL = '';

/**
 * Cabeceras de escritura.
 *
 * El `Authorization: Bearer <token del hub>` es lo que AUTORIZA. El `x-atha-email`
 * queda sólo como compatibilidad de transición (el hub lo ignora cuando
 * AUTH_MODO=estricto). Si no hay token, la llamada no lleva identidad y el hub
 * responde 401/403 — que es lo correcto.
 */
export function cabecerasSesion(): Record<string, string> {
  const sesion = leerSesionCrm() as any;
  const correo = String(sesion?.email || '').trim();
  return {
    'Content-Type': 'application/json',
    ...(correo ? { 'x-atha-email': correo } : {}),
    ...cabeceraToken(),
  };
}

export interface SqlDataPayload {
  success: boolean;
  count?: number;
  obras?: any[];
  leads?: any[];
  finances?: any[];
  inventory?: any[];
  venues?: any[];
  events?: any[];
  [key: string]: any;
}

export interface CloudSqlStatus {
  status: 'online' | 'offline' | 'checking';
  databaseEngine: string;
  host: string;
  database: string;
  tables: {
    obras: number;
    leads: number;
    rdProjects: number;
    venues: number;
    events: number;
    inventory: number;
    finances: number;
    processLogs: number;
    riders: number;
    team: number;
  };
  timestamp?: string;
  latencyMs?: number;
}

export async function checkCloudSqlStatus(): Promise<CloudSqlStatus> {
  const start = performance.now();
  try {
    // Lee los endpoints REALES del hub (misma base que todo el ecosistema)
    const [rp, rl, ri] = await Promise.all([
      fetch(`${CRM_BASE_URL}/api/v1/crm/portfolio/projects`),
      fetch(`${CRM_BASE_URL}/api/v1/crm/leads`),
      fetch(`${CRM_BASE_URL}/api/v1/crm/inventario`),
    ]);
    const latencyMs = Math.round(performance.now() - start);
    if (!rp.ok) throw new Error(`HTTP ${rp.status}`);
    const dp = await rp.json();
    const dl = rl.ok ? await rl.json() : {};
    const di = ri.ok ? await ri.json() : {};
    return {
      status: 'online' as const,
      databaseEngine: 'MySQL (Cloud SQL)',
      host: 'hub del CRM (atha-crm-web-frontend)',
      database: 'admin_crm',
      tables: {
        obras: dp.total || (dp.projects || []).length,
        leads: dl.total || (dl.leads || []).length,
        rdProjects: dp.total || 0,
        venues: 0,
        events: 0,
        inventory: di.total || 0,
        finances: 0,
        processLogs: 0,
        riders: 0,
        team: 0,
      },
      latencyMs,
    };
  } catch (error) {
    console.warn('Cloud SQL status check failed, using local cache:', error);
    return {
      status: 'offline' as const,
      databaseEngine: 'Cloud SQL (Desconectado/Modo Fallback)',
      host: CRM_BASE_URL,
      database: 'admin_crm',
      tables: { obras: 0, leads: 0, rdProjects: 0, venues: 0, events: 0, inventory: 0, finances: 0, processLogs: 0, riders: 0, team: 0 },
      latencyMs: 0,
    };
  }
}

/**
 * Fetch de proyectos desde el CRM v1 Cloud Run
 */
/**
 * La API v1 entrega columnas crudas (image_url, dossier_highlights, target_audience...)
 * mientras la UI trabaja con la forma de `Obra` (image, dossierHighlights, ...).
 * Este normalizador evita tarjetas sin imagen / sin dossier.
 */
function safeJson<T>(raw: any, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizeObra(p: any): any {
  const highlightsRaw = p.dossierHighlights ?? p.dossier_highlights;
  const highlights: string[] = Array.isArray(highlightsRaw)
    ? highlightsRaw
    : safeJson<string[]>(highlightsRaw, []);

  // El dossier REAL sale de la tabla de archivos de la obra (`dossier_url`), no de adivinar
  // dentro de dossier_highlights: esa regla (`empieza con /obras/`) no coincidía con las URLs
  // guardadas, así que el botón "Dossier PDF" nunca mostró nada aunque el archivo existía.
  const dossierPdf = p.dossier_url || p.dossierUrl || (typeof p.dossierPdf === 'string' ? p.dossierPdf : '');

  return {
    ...p,
    image: p.image || p.image_url || '',
    dossierHighlights: highlights,
    dossierPdf,
    dossierUrl: dossierPdf,
    companyId: p.company_id || p.companyId || '',
    companyName: p.company_name || p.companyName || '',
    logoUrl: p.logo_url || p.logoUrl || '',
    files: Array.isArray(p.files) ? p.files : [],
    ficha: p.ficha && typeof p.ficha === 'object' ? p.ficha : {},
    targetAudience: p.targetAudience || p.target_audience || 'Todo espectador',
    premiereDate: p.premiereDate || p.premiere_date || '',
    castTeam: p.castTeam && typeof p.castTeam === 'object'
      ? { direction: '', cast: [], music: '', technical: '', ...p.castTeam }
      : { direction: '', cast: [], music: '', technical: '' },
    technicalRider: p.technicalRider && typeof p.technicalRider === 'object'
      ? p.technicalRider
      : { minStageWidthMeters: 0, minStageDepthMeters: 0, lighting: '', sound: '', loadInHours: 0, crewRequired: 0 },
    economics: p.economics && typeof p.economics === 'object'
      ? { feeCLP: 0, ticketSplitEstimatedCLP: 0, productionCostCLP: 0, ...p.economics }
      : { feeCLP: 0, ticketSplitEstimatedCLP: 0, productionCostCLP: 0 },
  };
}

export async function fetchAllFromSql(): Promise<SqlDataPayload | null> {
  try {
    const [projRes, leadsRes] = await Promise.all([
      fetch(`${CRM_BASE_URL}/api/v1/crm/portfolio/projects`),
      fetch('/api/v1/crm/leads').catch(() => null),
    ]);
    if (!projRes.ok) throw new Error(`HTTP ${projRes.status}`);
    const data = await projRes.json();

    // Los leads reales vienen de nuestro propio backend (server.js + MySQL)
    let leads: any[] | undefined;
    if (leadsRes && leadsRes.ok) {
      try {
        const lj = await leadsRes.json();
        if (lj && Array.isArray(lj.leads) && lj.leads.length > 0) leads = lj.leads;
      } catch {
        /* se mantiene el estado actual */
      }
    }

    return {
      obras: (data.projects || []).map(normalizeObra),
      leads,
      finances: data.finances,
      inventory: data.inventory,
      venues: data.venues,
      events: data.events,
      success: true,
      count: data.total || data.projects?.length || 0,
    };
  } catch (error) {
    console.warn('Error fetching projects from CRM v1:', error);
    return null;
  }
}

/**
 * Seed a Cloud SQL — ahora usa safe-seed-loader (nunca borra datos)
 */
export async function seedCloudSql() {
  // El sembrador automático se retiró: los datos ahora se cargan desde el CRM
  // (importación CSV/JSON en el propio hub) para no volver a meter datos inventados.
  throw new Error('El sembrador se retiró: usá la importación del CRM o cargá los datos a mano.');
}

export async function saveObraToSql(obra: any) {
  try {
    const res = await fetch('/api/v1/crm/portfolio/projects', {
      method: 'POST',
      headers: cabecerasSesion(),
      body: JSON.stringify(obra)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save obra to SQL:', err);
  }
}

export async function saveLeadToSql(lead: any) {
  try {
    const res = await fetch('/api/v1/crm/leads', {
      method: 'POST',
      headers: cabecerasSesion(),
      body: JSON.stringify(lead)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save lead to SQL:', err);
  }
}

/** Borra una obra del CRM (persistente) */
export async function deleteObraFromSql(obraId: string) {
  try {
    const res = await fetch(`/api/v1/crm/portfolio/projects/${encodeURIComponent(obraId)}`, { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    console.warn('Could not delete obra from SQL:', err);
  }
}

/** Borra un lead del CRM (persistente) */
export async function deleteLeadFromSql(leadId: string) {
  try {
    const res = await fetch(`/api/v1/crm/leads/${encodeURIComponent(leadId)}`, { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    console.warn('Could not delete lead from SQL:', err);
  }
}

export async function saveFinanceToSql(record: any) {
  try {
    const res = await fetch('/api/v1/crm/finances', {
      method: 'POST',
      headers: cabecerasSesion(),
      body: JSON.stringify(record)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save finance to SQL:', err);
  }
}

export async function saveInventoryToSql(item: any) {
  try {
    const res = await fetch('/api/v1/crm/inventario/items', {
      method: 'POST',
      headers: cabecerasSesion(),
      body: JSON.stringify(item)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save inventory to SQL:', err);
  }
}

/**
 * Descargar archivos de datos (Exportación)
 */
export function downloadExportFile(table: string = 'all', format: 'json' | 'csv' | 'sql' = 'json') {
  if (format === 'sql') {
    window.location.href = `/php/export.php?table=${encodeURIComponent(table)}&format=sql`;
    return;
  }
  window.location.href = `/api/export?table=${encodeURIComponent(table)}&format=${encodeURIComponent(format)}`;
}

/**
 * Subir archivos de datos (Importación)
 */
export async function uploadImportFile(file: File, targetTable: string = 'obras'): Promise<{ success: boolean; message: string; count?: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isJson = file.name.endsWith('.json');
    const isCsv = file.name.endsWith('.csv');

    if (!isJson && !isCsv) {
      return reject(new Error('Formato no soportado. Por favor sube un archivo .json o .csv'));
    }

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;

        if (isJson) {
          const parsed = JSON.parse(text);
          const res = await fetch(`/api/import?table=${encodeURIComponent(targetTable)}`, {
            method: 'POST',
            headers: cabecerasSesion(),
            body: JSON.stringify(parsed)
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Error al importar JSON');
          resolve({ success: true, message: result.message, count: result.importedCount });
        } else {
          // Parse CSV to objects
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length < 2) throw new Error('El archivo CSV debe contener una cabecera y al menos una fila de datos.');
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const items: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            const rowValues = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: any = {};
            headers.forEach((header, idx) => {
              obj[header] = rowValues[idx] ?? '';
            });
            items.push(obj);
          }

          const res = await fetch(`/api/import?table=${encodeURIComponent(targetTable)}`, {
            method: 'POST',
            headers: cabecerasSesion(),
            body: JSON.stringify({ targetTable, items })
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Error al importar CSV');
          resolve({ success: true, message: result.message, count: result.importedCount });
        }
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo en el navegador.'));
    reader.readAsText(file);
  });
}

// -------------------------------------------------------------
// SQL Management Studio (Cloud SQL Table Editor & Console)
// -------------------------------------------------------------

export interface SqlColumnMeta {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
}

export interface SqlTableMeta {
  name: string;
  rowCount: number;
  columns: SqlColumnMeta[];
}

export interface SqlTableRowsResponse {
  success: boolean;
  table: string;
  rows: any[];
  columns: string[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SqlQueryResponse {
  success: boolean;
  command?: string;
  rowCount?: number;
  columns?: string[];
  rows?: any[];
  durationMs?: number;
  error?: string;
}

/**
 * Fetch all table metadata from PostgreSQL
 */
export async function fetchSqlTables(): Promise<SqlTableMeta[]> {
  const res = await fetch('/api/sql/tables');
  if (!res.ok) throw new Error('Error al obtener la lista de tablas SQL');
  const data = await res.json();
  return data.tables || [];
}

/**
 * Fetch rows from a specific SQL table
 */
export async function fetchSqlTableRows(
  table: string,
  page: number = 1,
  pageSize: number = 50,
  search: string = '',
  sortCol?: string,
  sortDir?: 'ASC' | 'DESC'
): Promise<SqlTableRowsResponse> {
  const params = new URLSearchParams({
    table,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.set('search', search);
  if (sortCol) params.set('sortCol', sortCol);
  if (sortDir) params.set('sortDir', sortDir);

  const res = await fetch(`/api/sql/rows?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Error al obtener filas de la tabla');
  }
  return data;
}

/**
 * Insert or update a row in a table directly in PostgreSQL
 */
export async function saveSqlTableRow(table: string, row: Record<string, any>): Promise<any> {
  const res = await fetch('/api/sql/row', {
    method: 'POST',
    headers: cabecerasSesion(),
    body: JSON.stringify({ table, row }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Error al guardar el registro en SQL');
  }
  return data.row;
}

/**
 * Delete a row from a table directly in PostgreSQL
 */
export async function deleteSqlTableRow(table: string, id: string | number): Promise<boolean> {
  const res = await fetch('/api/sql/row', {
    method: 'DELETE',
    headers: cabecerasSesion(),
    body: JSON.stringify({ table, id }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Error al eliminar el registro en SQL');
  }
  return true;
}

/**
 * Execute raw SQL query from the interactive console
 */
export async function executeSqlConsoleQuery(query: string): Promise<SqlQueryResponse> {
  const res = await fetch('/api/sql/query', {
    method: 'POST',
    headers: cabecerasSesion(),
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error('Error al ejecutar la consulta SQL');
  }
  return data;
}

