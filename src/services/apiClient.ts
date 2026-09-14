/**
 * Servicio de Cliente API y Sincronización con CRM v1 (Cloud Run + Cloud SQL)
 * Rutea a: https://crm-v1-uc-897089213264.us-central1.run.app/api/v1/crm/*
 */

const CRM_BASE_URL = import.meta.env.VITE_CRM_BASE_URL || 'https://crm-v1-uc-897089213264.us-central1.run.app';

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
    // Usar endpoint de entities del CRM v1 Cloud Run
    const res = await fetch(`${CRM_BASE_URL}/api/v1/crm/entities`);
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Mapear entities → tables (formato CRM v1)
    const entities = data.entities || {};
    return {
      status: 'online' as const,
      databaseEngine: 'MySQL (Cloud SQL)',
      host: 'crm-v1-uc-897089213264.us-central1.run.app',
      database: 'admin_crm',
      tables: {
        obras: entities.projects || 0,
        leads: entities.leads || 0,
        rdProjects: entities.projects || 0,
        venues: entities.venues || 0,
        events: entities.events || 0,
        inventory: entities.inventory || 0,
        finances: entities.finance_records || 0,
        processLogs: entities.process_logs || 0,
        riders: entities.standard_riders || 0,
        team: entities.users || 0,
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
export async function fetchAllFromSql() {
  try {
    const res = await fetch(`${CRM_BASE_URL}/api/v1/crm/portfolio/projects`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      obras: data.projects || [],
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
  const res = await fetch(`${CRM_BASE_URL}/api/v1/crm/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Error al ejecutar el sembrador SQL');
  return await res.json();
}

export async function saveObraToSql(obra: any) {
  try {
    const res = await fetch('/api/obras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obra)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save obra to SQL:', err);
  }
}

export async function saveLeadToSql(lead: any) {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save lead to SQL:', err);
  }
}

export async function saveFinanceToSql(record: any) {
  try {
    const res = await fetch('/api/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not save finance to SQL:', err);
  }
}

export async function saveInventoryToSql(item: any) {
  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error('Error al ejecutar la consulta SQL');
  }
  return data;
}

