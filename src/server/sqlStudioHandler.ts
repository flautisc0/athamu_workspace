import { pool } from '../db/index.ts';

// Known schema table list
export const KNOWN_TABLES = [
  'obras',
  'leads',
  'rd_projects',
  'venues',
  'events',
  'inventory',
  'finances',
  'process_logs',
  'riders',
  'team',
  'users'
];

export interface ColumnMeta {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
}

export interface TableMeta {
  name: string;
  rowCount: number;
  columns: ColumnMeta[];
}

// Ensure table name is safe to prevent SQL injection
function sanitizeIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Identificador de tabla o columna inválido: ${name}`);
  }
  return name;
}

/**
 * Get metadata for all tables in the database
 */
export async function getTablesMetadata(): Promise<TableMeta[]> {
  try {
    // 1. Fetch tables from public schema
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    let tableNames = tablesRes.rows.map((r: any) => r.table_name);
    if (tableNames.length === 0) {
      tableNames = KNOWN_TABLES;
    }

    const result: TableMeta[] = [];

    for (const tableName of tableNames) {
      // Fetch columns
      const colsRes = await pool.query(
        `
        SELECT
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_pk
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1
          AND c.table_schema = 'public'
        ORDER BY c.ordinal_position;
      `,
        [tableName]
      );

      // Fetch row count
      let rowCount = 0;
      try {
        const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM "${sanitizeIdentifier(tableName)}"`);
        rowCount = countRes.rows[0]?.total || 0;
      } catch {
        rowCount = 0;
      }

      result.push({
        name: tableName,
        rowCount,
        columns: colsRes.rows.map((c: any) => ({
          name: c.column_name,
          dataType: c.data_type,
          isNullable: c.is_nullable === 'YES',
          columnDefault: c.column_default,
          isPrimaryKey: Boolean(c.is_pk) || c.column_name === 'id',
        })),
      });
    }

    return result;
  } catch (err: any) {
    console.error('Error fetching tables metadata:', err);
    // Fallback schema if information_schema query fails
    return KNOWN_TABLES.map(t => ({
      name: t,
      rowCount: 0,
      columns: [
        { name: 'id', dataType: 'text', isNullable: false, columnDefault: null, isPrimaryKey: true },
        { name: 'created_at', dataType: 'timestamp', isNullable: true, columnDefault: 'now()', isPrimaryKey: false }
      ]
    }));
  }
}

/**
 * Fetch rows from a table with pagination, search and sorting
 */
export async function getTableRows(
  tableName: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortCol?: string;
    sortDir?: 'ASC' | 'DESC';
  } = {}
) {
  const safeTable = sanitizeIdentifier(tableName);
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize || 50));
  const offset = (page - 1) * pageSize;

  let sortClause = '';
  if (options.sortCol) {
    const safeSortCol = sanitizeIdentifier(options.sortCol);
    const dir = options.sortDir === 'DESC' ? 'DESC' : 'ASC';
    sortClause = `ORDER BY "${safeSortCol}" ${dir}`;
  } else {
    sortClause = `ORDER BY 1 DESC`;
  }

  let whereClause = '';
  const params: any[] = [];

  if (options.search && options.search.trim()) {
    const searchTerm = `%${options.search.trim()}%`;
    params.push(searchTerm);
    // Cast entire row as text for broad search
    whereClause = `WHERE CAST("${safeTable}".* AS text) ILIKE $1`;
  }

  const countQuery = `SELECT COUNT(*)::int as total FROM "${safeTable}" ${whereClause}`;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;

  const dataQuery = `SELECT * FROM "${safeTable}" ${whereClause} ${sortClause} LIMIT ${pageSize} OFFSET ${offset}`;
  const dataRes = await pool.query(dataQuery, params);

  const columns = dataRes.fields.map(f => f.name);

  return {
    table: safeTable,
    rows: dataRes.rows,
    columns,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Insert or update a row in a table
 */
export async function upsertTableRow(tableName: string, row: Record<string, any>) {
  const safeTable = sanitizeIdentifier(tableName);
  const keys = Object.keys(row).filter(k => k !== undefined && k !== null);

  if (keys.length === 0) {
    throw new Error('No se enviaron datos para guardar.');
  }

  // Sanitize all column keys
  const safeKeys = keys.map(k => sanitizeIdentifier(k));
  const values = keys.map(k => {
    const val = row[k];
    if (val !== null && typeof val === 'object') {
      return JSON.stringify(val);
    }
    return val;
  });

  // Check if primary key 'id' exists
  const hasId = keys.includes('id') && row['id'] !== undefined && row['id'] !== '';

  if (!hasId) {
    // Standard INSERT
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const colList = safeKeys.map(k => `"${k}"`).join(', ');
    const query = `INSERT INTO "${safeTable}" (${colList}) VALUES (${placeholders}) RETURNING *;`;
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  // UPSERT: INSERT ... ON CONFLICT ("id") DO UPDATE SET ...
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const colList = safeKeys.map(k => `"${k}"`).join(', ');
  const updateList = safeKeys
    .filter(k => k !== 'id')
    .map(k => `"${k}" = EXCLUDED."${k}"`)
    .join(', ');

  const query = `
    INSERT INTO "${safeTable}" (${colList})
    VALUES (${placeholders})
    ON CONFLICT ("id") DO UPDATE
    SET ${updateList || '"id" = EXCLUDED."id"'}
    RETURNING *;
  `;

  const res = await pool.query(query, values);
  return res.rows[0];
}

/**
 * Delete a row from a table
 */
export async function deleteTableRow(tableName: string, id: string | number) {
  const safeTable = sanitizeIdentifier(tableName);
  const query = `DELETE FROM "${safeTable}" WHERE "id"::text = $1 RETURNING "id";`;
  const res = await pool.query(query, [String(id)]);
  if (res.rowCount === 0) {
    throw new Error(`No se encontró el registro con ID "${id}" en la tabla "${tableName}".`);
  }
  return { success: true, id, table: safeTable };
}

/**
 * Execute arbitrary SQL query
 */
export async function executeRawSql(sqlQuery: string) {
  const trimmed = sqlQuery.trim();
  if (!trimmed) {
    throw new Error('La consulta SQL no puede estar vacía.');
  }

  const startTime = Date.now();
  const res = await pool.query(trimmed);
  const durationMs = Date.now() - startTime;

  return {
    command: res.command,
    rowCount: res.rowCount ?? (Array.isArray(res.rows) ? res.rows.length : 0),
    columns: res.fields ? res.fields.map(f => f.name) : [],
    rows: res.rows || [],
    durationMs,
  };
}

/**
 * Generates the complete standalone HTML/JS/CSS Web SQL Manager
 * served when the user navigates to `/php` or `/php/index.php`.
 */
export function getStandalonePhpManagerHtml(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>F.A.S.E SQL Studio & Gestor de Base de Datos</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#fff1f0',
              500: '#e11d48',
              600: '#be123c',
              700: '#9f1239',
              900: '#4c0519',
              950: '#1b0d0c'
            }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
  </style>
</head>
<body class="bg-[#140e0c] text-stone-200 min-h-screen flex flex-col antialiased">
  
  <!-- Header -->
  <header class="bg-[#1c1412] border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-md">
        SQL
      </div>
      <div>
        <h1 class="text-sm font-bold text-white flex items-center gap-2">
          F.A.S.E SQL Manager & Archivos
          <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            PostgreSQL Online
          </span>
        </h1>
        <p class="text-xs text-stone-400 font-mono">Gestión directa de tablas, edición en vivo y consola SQL</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button onclick="openNewRecordModal()" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition">
        <span>+ Nuevo Registro</span>
      </button>
      <button onclick="switchView('console')" class="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-1.5 transition">
        <span>Consola SQL</span>
      </button>
      <a href="/" class="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs border border-stone-700 transition">
        &larr; Volver a la App
      </a>
    </div>
  </header>

  <!-- Main Container -->
  <div class="flex-1 flex overflow-hidden">
    
    <!-- Sidebar: Tables -->
    <aside class="w-64 bg-[#18110f] border-r border-stone-800/80 flex flex-col shrink-0 custom-scroll overflow-y-auto">
      <div class="p-3 border-b border-stone-800 flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">Tablas del Sistema</span>
        <button onclick="loadTables()" title="Recargar tablas" class="text-stone-400 hover:text-white text-xs p-1">
          &#x21bb;
        </button>
      </div>
      <div id="tableList" class="p-2 space-y-1">
        <div class="p-3 text-xs text-stone-500 italic">Cargando tablas...</div>
      </div>
    </aside>

    <!-- Content Workspace -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#120b0a]">
      
      <!-- Top Action Bar for current table -->
      <div id="tableHeaderBar" class="bg-[#1a1210] border-b border-stone-800/80 px-4 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span id="currentTableName" class="font-mono text-sm font-bold text-rose-400">obras</span>
          <span id="rowCountBadge" class="text-xs font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded">0 registros</span>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="searchInput"
            type="text"
            placeholder="Buscar en la tabla..."
            onkeydown="if(event.key==='Enter') applySearch()"
            class="bg-stone-900 border border-stone-700 text-xs px-2.5 py-1.5 rounded-lg w-48 focus:outline-none focus:border-rose-500 text-stone-200"
          />
          <button onclick="applySearch()" class="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs rounded-lg border border-stone-700 text-stone-200">
            Buscar
          </button>
          <button onclick="exportCurrentTable('csv')" class="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs rounded-lg border border-stone-700 text-stone-300">
            Exportar CSV
          </button>
          <button onclick="exportCurrentTable('json')" class="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs rounded-lg border border-stone-700 text-stone-300">
            Exportar JSON
          </button>
        </div>
      </div>

      <!-- View: Table Grid -->
      <div id="viewTable" class="flex-1 overflow-auto custom-scroll p-4">
        <div id="tableContainer" class="border border-stone-800 rounded-xl overflow-hidden bg-[#160f0e] shadow-sm">
          <div class="p-8 text-center text-stone-500 text-sm">Cargando registros...</div>
        </div>
      </div>

      <!-- View: SQL Console (Hidden by default) -->
      <div id="viewConsole" class="flex-1 flex-col p-4 space-y-3 overflow-auto custom-scroll hidden">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-stone-300 uppercase tracking-wider font-mono">Editor de Consultas SQL</span>
          <div class="flex items-center gap-2">
            <button onclick="setExampleQuery('SELECT * FROM obras LIMIT 10;')" class="text-[11px] bg-stone-800 hover:bg-stone-700 px-2 py-1 rounded text-stone-300">
              Ejemplo: Obras
            </button>
            <button onclick="setExampleQuery('SELECT status, count(*) FROM leads GROUP BY status;')" class="text-[11px] bg-stone-800 hover:bg-stone-700 px-2 py-1 rounded text-stone-300">
              Ejemplo: Agrupación CRM
            </button>
            <button onclick="setExampleQuery('SELECT * FROM finances ORDER BY date DESC LIMIT 10;')" class="text-[11px] bg-stone-800 hover:bg-stone-700 px-2 py-1 rounded text-stone-300">
              Ejemplo: Finanzas
            </button>
          </div>
        </div>

        <div class="relative">
          <textarea
            id="sqlInput"
            rows="5"
            placeholder="Escribe tu consulta SQL aquí (ej: SELECT * FROM obras;)"
            class="w-full bg-[#100908] border border-stone-700 rounded-xl p-3 font-mono text-xs text-rose-200 focus:outline-none focus:border-rose-500 custom-scroll"
          >SELECT * FROM obras LIMIT 20;</textarea>
          <button
            onclick="executeSql()"
            class="absolute bottom-3 right-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg shadow transition"
          >
            Ejecutar (Ctrl+Enter)
          </button>
        </div>

        <div id="consoleResult" class="border border-stone-800 rounded-xl overflow-hidden bg-[#160f0e] min-h-[160px] custom-scroll">
          <div class="p-6 text-center text-stone-500 text-xs">Ejecuta una consulta para ver los resultados aquí.</div>
        </div>
      </div>

    </main>
  </div>

  <!-- Modal for Row Edit / Insert -->
  <div id="rowModal" class="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-[#1c1412] border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-[#221614]">
        <h3 id="modalTitle" class="text-sm font-bold text-white font-mono">Editar Registro</h3>
        <button onclick="closeRowModal()" class="text-stone-400 hover:text-white text-lg font-bold">&times;</button>
      </div>
      <div id="modalFieldsContainer" class="p-5 overflow-y-auto custom-scroll space-y-3.5 flex-1">
        <!-- Dynamically rendered input fields -->
      </div>
      <div class="px-5 py-3 border-t border-stone-800 bg-[#19100e] flex items-center justify-end gap-2">
        <button onclick="closeRowModal()" class="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-400 hover:bg-stone-800">
          Cancelar
        </button>
        <button onclick="saveCurrentRow()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow">
          Guardar Cambios en SQL
        </button>
      </div>
    </div>
  </div>

  <!-- Scripts for Client SQL Management Logic -->
  <script>
    let currentTable = 'obras';
    let currentColumns = [];
    let currentRows = [];
    let editingRow = null;
    let tablesData = [];

    // Load tables metadata on startup
    async function loadTables() {
      try {
        const res = await fetch('/api/sql/tables');
        const data = await res.json();
        tablesData = data.tables || [];
        renderTableList();
        if (tablesData.length > 0) {
          selectTable(currentTable || tablesData[0].name);
        }
      } catch (err) {
        console.error('Error loading tables:', err);
        document.getElementById('tableList').innerHTML = '<div class="p-3 text-xs text-red-400">Error al conectar con SQL</div>';
      }
    }

    function renderTableList() {
      const container = document.getElementById('tableList');
      container.innerHTML = tablesData.map(t => {
        const isActive = t.name === currentTable;
        return \`
          <button
            onclick="selectTable('\${t.name}')"
            class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition \${
              isActive
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60 font-semibold'
                : 'text-stone-400 hover:bg-stone-800/60 hover:text-stone-200'
            }"
          >
            <span class="truncate">\${t.name}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">\${t.rowCount}</span>
          </button>
        \`;
      }).join('');
    }

    async function selectTable(name) {
      currentTable = name;
      document.getElementById('currentTableName').textContent = name;
      switchView('table');
      renderTableList();
      await fetchTableData();
    }

    async function fetchTableData(search = '') {
      const container = document.getElementById('tableContainer');
      container.innerHTML = '<div class="p-8 text-center text-stone-500 text-xs">Cargando registros de SQL...</div>';

      try {
        const url = \`/api/sql/rows?table=\${encodeURIComponent(currentTable)}&search=\${encodeURIComponent(search)}\`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Error al obtener datos');

        currentColumns = data.columns || [];
        currentRows = data.rows || [];
        document.getElementById('rowCountBadge').textContent = \`\${data.total} registros\`;

        renderGrid();
      } catch (err) {
        container.innerHTML = \`<div class="p-8 text-center text-red-400 text-xs">Error: \${err.message}</div>\`;
      }
    }

    function renderGrid() {
      const container = document.getElementById('tableContainer');
      if (currentRows.length === 0) {
        container.innerHTML = \`
          <div class="p-12 text-center">
            <p class="text-sm font-medium text-stone-400">La tabla \${currentTable} no tiene registros.</p>
            <button onclick="openNewRecordModal()" class="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold">
              + Agregar el primer registro
            </button>
          </div>
        \`;
        return;
      }

      let thHtml = currentColumns.map(col => \`
        <th class="px-3 py-2.5 text-left text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-800 whitespace-nowrap">
          \${col}
        </th>
      \`).join('');

      thHtml += '<th class="px-3 py-2.5 text-right text-[11px] font-mono font-semibold text-stone-400 border-b border-stone-800">Acciones</th>';

      let trHtml = currentRows.map((row, rowIdx) => {
        let cellsHtml = currentColumns.map(col => {
          let val = row[col];
          let displayVal = '';
          if (val === null || val === undefined) {
            displayVal = '<span class="text-stone-600 italic">null</span>';
          } else if (typeof val === 'object') {
            displayVal = \`<span class="text-emerald-400 font-mono text-[11px]">\${JSON.stringify(val).substring(0, 35)}...</span>\`;
          } else {
            displayVal = String(val);
            if (displayVal.length > 50) displayVal = displayVal.substring(0, 50) + '...';
          }
          return \`<td class="px-3 py-2 text-xs text-stone-300 font-mono whitespace-nowrap border-b border-stone-800/50 max-w-xs truncate">\${displayVal}</td>\`;
        }).join('');

        const rowId = row.id ?? rowIdx;

        return \`
          <tr class="hover:bg-stone-800/40 transition">
            \${cellsHtml}
            <td class="px-3 py-2 text-right border-b border-stone-800/50 whitespace-nowrap">
              <button onclick="openEditRecordModal(\${rowIdx})" class="px-2 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-rose-300 rounded mr-1.5 font-mono">
                Editar
              </button>
              <button onclick="deleteRecord('\${row.id}')" class="px-2 py-1 text-[11px] bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded font-mono">
                Borrar
              </button>
            </td>
          </tr>
        \`;
      }).join('');

      container.innerHTML = \`
        <div class="overflow-x-auto custom-scroll">
          <table class="w-full text-left border-collapse">
            <thead class="bg-[#1c1412] sticky top-0">
              <tr>\${thHtml}</tr>
            </thead>
            <tbody>\${trHtml}</tbody>
          </table>
        </div>
      \`;
    }

    function applySearch() {
      const q = document.getElementById('searchInput').value;
      fetchTableData(q);
    }

    function switchView(view) {
      if (view === 'table') {
        document.getElementById('viewTable').classList.remove('hidden');
        document.getElementById('viewConsole').classList.add('hidden');
        document.getElementById('tableHeaderBar').classList.remove('hidden');
      } else {
        document.getElementById('viewTable').classList.add('hidden');
        document.getElementById('viewConsole').classList.remove('hidden');
        document.getElementById('tableHeaderBar').classList.add('hidden');
      }
    }

    function openNewRecordModal() {
      editingRow = null;
      document.getElementById('modalTitle').textContent = \`Nuevo Registro en \${currentTable}\`;
      renderModalForm({});
      document.getElementById('rowModal').classList.remove('hidden');
    }

    function openEditRecordModal(rowIdx) {
      const row = currentRows[rowIdx];
      editingRow = row;
      document.getElementById('modalTitle').textContent = \`Editar Registro #\${row.id || rowIdx} (\${currentTable})\`;
      renderModalForm(row);
      document.getElementById('rowModal').classList.remove('hidden');
    }

    function closeRowModal() {
      document.getElementById('rowModal').classList.add('hidden');
    }

    function renderModalForm(row) {
      const container = document.getElementById('modalFieldsContainer');
      const cols = currentColumns.length > 0 ? currentColumns : ['id', 'title', 'name', 'status'];

      container.innerHTML = cols.map(col => {
        let val = row[col];
        let strVal = '';
        let isJson = false;

        if (val !== null && val !== undefined) {
          if (typeof val === 'object') {
            strVal = JSON.stringify(val, null, 2);
            isJson = true;
          } else {
            strVal = String(val);
          }
        } else if (col === 'id' && !row[col]) {
          strVal = currentTable.substring(0, 3) + '_' + Date.now().toString(36);
        }

        if (isJson || col.includes('notes') || col.includes('synopsis') || col.includes('description')) {
          return \`
            <div>
              <label class="block text-xs font-mono font-medium text-stone-300 mb-1">
                \${col} \${isJson ? '<span class="text-[10px] text-emerald-400">(JSON)</span>' : ''}
              </label>
              <textarea
                data-col="\${col}"
                data-json="\${isJson ? '1' : '0'}"
                rows="3"
                class="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 font-mono text-xs text-stone-200 focus:outline-none focus:border-rose-500 custom-scroll"
              >\${strVal}</textarea>
            </div>
          \`;
        }

        return \`
          <div>
            <label class="block text-xs font-mono font-medium text-stone-300 mb-1">\${col}</label>
            <input
              type="text"
              data-col="\${col}"
              value="\${strVal.replace(/"/g, '&quot;')}"
              class="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            />
          </div>
        \`;
      }).join('');
    }

    async function saveCurrentRow() {
      const inputs = document.querySelectorAll('#modalFieldsContainer [data-col]');
      const rowPayload = {};

      inputs.forEach(el => {
        const col = el.getAttribute('data-col');
        const isJson = el.getAttribute('data-json') === '1';
        let val = el.value;

        if (isJson) {
          try {
            rowPayload[col] = JSON.parse(val);
          } catch {
            rowPayload[col] = val;
          }
        } else {
          // Parse numbers if applicable
          if (val !== '' && !isNaN(Number(val)) && !['id', 'code', 'phone', 'date'].includes(col)) {
            rowPayload[col] = Number(val);
          } else {
            rowPayload[col] = val;
          }
        }
      });

      try {
        const res = await fetch('/api/sql/row', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: currentTable,
            row: rowPayload
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar');

        closeRowModal();
        await fetchTableData();
        loadTables();
      } catch (err) {
        alert('Error al guardar en SQL: ' + err.message);
      }
    }

    async function deleteRecord(id) {
      if (!id || id === 'undefined') {
        alert('Este registro no posee un identificador de clave primaria único.');
        return;
      }
      if (!confirm(\`¿Seguro que deseas eliminar el registro "\${id}" de la tabla "\${currentTable}"?\`)) {
        return;
      }

      try {
        const res = await fetch('/api/sql/row', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: currentTable,
            id: id
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al eliminar');

        await fetchTableData();
        loadTables();
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    }

    // SQL Console execution
    async function executeSql() {
      const query = document.getElementById('sqlInput').value.trim();
      const resultContainer = document.getElementById('consoleResult');
      if (!query) return;

      resultContainer.innerHTML = '<div class="p-6 text-center text-stone-500 text-xs">Ejecutando consulta en PostgreSQL...</div>';

      try {
        const res = await fetch('/api/sql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          resultContainer.innerHTML = \`
            <div class="p-4 bg-red-950/40 border-l-4 border-red-500 text-red-300 text-xs font-mono">
              <strong>Error de Sintaxis SQL:</strong><br/>
              \${data.error || 'Fallo desconocido en la ejecución'}
            </div>
          \`;
          return;
        }

        let headerHtml = (data.columns || []).map(c => \`
          <th class="px-3 py-2 text-left text-[11px] font-mono uppercase bg-[#1e1513] text-stone-400 border-b border-stone-800">\${c}</th>
        \`).join('');

        let rowsHtml = (data.rows || []).map(r => \`
          <tr class="hover:bg-stone-800/30">
            \${(data.columns || []).map(c => \`
              <td class="px-3 py-1.5 text-xs text-stone-300 font-mono border-b border-stone-800/50 max-w-sm truncate">
                \${r[c] !== null && typeof r[c] === 'object' ? JSON.stringify(r[c]) : (r[c] ?? '<span class="text-stone-600">null</span>')}
              </td>
            \`).join('')}
          </tr>
        \`).join('');

        resultContainer.innerHTML = \`
          <div class="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs font-mono">
            <span class="text-emerald-400 font-bold">\${data.command || 'QUERY OK'} - \${data.rowCount} filas afectadas</span>
            <span class="text-stone-500">\${data.durationMs} ms</span>
          </div>
          <div class="overflow-x-auto custom-scroll max-h-96">
            <table class="w-full text-left border-collapse">
              <thead><tr>\${headerHtml}</tr></thead>
              <tbody>\${rowsHtml}</tbody>
            </table>
          </div>
        \`;
      } catch (err) {
        resultContainer.innerHTML = \`<div class="p-4 text-red-400 text-xs font-mono">Error: \${err.message}</div>\`;
      }
    }

    function setExampleQuery(q) {
      document.getElementById('sqlInput').value = q;
      executeSql();
    }

    function exportCurrentTable(fmt) {
      window.open(\`/api/export?table=\${currentTable}&format=\${fmt}\`, '_blank');
    }

    document.addEventListener('DOMContentLoaded', () => {
      loadTables();
      document.getElementById('sqlInput').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          executeSql();
        }
      });
    });
  </script>
</body>
</html>`;
}
