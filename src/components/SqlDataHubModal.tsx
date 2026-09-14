import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  FileJson,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Server,
  Code2,
  ExternalLink,
  Table,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Terminal,
  Columns,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import {
  checkCloudSqlStatus,
  downloadExportFile,
  uploadImportFile,
  seedCloudSql,
  fetchSqlTables,
  fetchSqlTableRows,
  saveSqlTableRow,
  deleteSqlTableRow,
  executeSqlConsoleQuery,
  type CloudSqlStatus,
  type SqlTableMeta,
  type SqlTableRowsResponse,
  type SqlQueryResponse
} from '../services/apiClient';

interface SqlDataHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRefreshed?: () => void;
}

export const SqlDataHubModal: React.FC<SqlDataHubModalProps> = ({
  isOpen,
  onClose,
  onDataRefreshed
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'tables' | 'console' | 'schema' | 'files' | 'php'>('tables');

  // Tables & Rows State
  const [tables, setTables] = useState<SqlTableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('obras');
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [rowsData, setRowsData] = useState<SqlTableRowsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);

  // Row Edit / Create Modal State
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [rowFormData, setRowFormData] = useState<Record<string, any>>({});
  const [rowModalError, setRowModalError] = useState<string | null>(null);
  const [isSavingRow, setIsSavingRow] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM obras LIMIT 20;');
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResponse | null>(null);

  // Status & Seed State
  const [status, setStatus] = useState<CloudSqlStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // File Export/Import State
  const [exportTable, setExportTable] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>('json');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTable, setImportTable] = useState<string>('obras');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTables();
      loadStatus();
    }
  }, [isOpen]);

  // Reload rows when selected table, page, or search changes
  useEffect(() => {
    if (isOpen && selectedTable) {
      loadRows(selectedTable, currentPage, searchQuery);
    }
  }, [isOpen, selectedTable, currentPage]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const current = await checkCloudSqlStatus();
      setStatus(current);
    } catch {
      // Ignore
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const t = await fetchSqlTables();
      setTables(t);
      if (t.length > 0 && !t.some(tab => tab.name === selectedTable)) {
        setSelectedTable(t[0].name);
      }
    } catch (err: any) {
      console.warn('Error loading SQL tables:', err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadRows = async (table: string, page: number, search: string) => {
    setIsLoadingRows(true);
    try {
      const res = await fetchSqlTableRows(table, page, pageSize, search);
      setRowsData(res);
    } catch (err: any) {
      console.error('Error fetching table rows:', err);
    } finally {
      setIsLoadingRows(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadRows(selectedTable, 1, searchQuery);
  };

  const handleSelectTable = (tblName: string) => {
    setSelectedTable(tblName);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // Row Modal Handlers
  const handleOpenNewRowModal = () => {
    setEditingRow(null);
    setRowModalError(null);

    // Prepare default empty object
    const currentMeta = tables.find(t => t.name === selectedTable);
    const initialObj: Record<string, any> = {};
    if (currentMeta) {
      currentMeta.columns.forEach(col => {
        if (col.name === 'id') {
          initialObj.id = `${selectedTable.substring(0, 3)}_${Date.now().toString(36)}`;
        } else if (col.dataType === 'integer') {
          initialObj[col.name] = 0;
        } else if (col.dataType === 'jsonb') {
          initialObj[col.name] = '{}';
        } else {
          initialObj[col.name] = '';
        }
      });
    }
    setRowFormData(initialObj);
    setIsRowModalOpen(true);
  };

  const handleOpenEditRowModal = (row: Record<string, any>) => {
    setEditingRow(row);
    setRowModalError(null);

    // Format fields for editing
    const formatted: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      const val = row[k];
      if (val !== null && typeof val === 'object') {
        formatted[k] = JSON.stringify(val, null, 2);
      } else {
        formatted[k] = val ?? '';
      }
    });
    setRowFormData(formatted);
    setIsRowModalOpen(true);
  };

  const handleSaveRow = async () => {
    setIsSavingRow(true);
    setRowModalError(null);

    try {
      const payload: Record<string, any> = {};
      const currentMeta = tables.find(t => t.name === selectedTable);

      Object.keys(rowFormData).forEach(key => {
        const val = rowFormData[key];
        const colMeta = currentMeta?.columns.find(c => c.name === key);

        if (colMeta?.dataType === 'jsonb') {
          try {
            payload[key] = typeof val === 'string' ? JSON.parse(val) : val;
          } catch {
            throw new Error(`El campo "${key}" contiene un JSON inválido.`);
          }
        } else if (colMeta?.dataType === 'integer') {
          payload[key] = val === '' ? 0 : Number(val);
        } else {
          payload[key] = val;
        }
      });

      await saveSqlTableRow(selectedTable, payload);
      setIsRowModalOpen(false);
      await loadRows(selectedTable, currentPage, searchQuery);
      await loadTables();
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      setRowModalError(err.message || 'Error al guardar el registro');
    } finally {
      setIsSavingRow(false);
    }
  };

  const handleDeleteRow = async (id: string | number) => {
    try {
      await deleteSqlTableRow(selectedTable, id);
      setDeleteConfirmId(null);
      await loadRows(selectedTable, currentPage, searchQuery);
      await loadTables();
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      alert(`Error al eliminar registro: ${err.message}`);
    }
  };

  // SQL Console Execution
  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecutingQuery(true);
    try {
      const res = await executeSqlConsoleQuery(sqlQuery);
      setQueryResult(res);
      if (res.command && ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE'].includes(res.command)) {
        await loadTables();
        await loadRows(selectedTable, currentPage, searchQuery);
        if (onDataRefreshed) onDataRefreshed();
      }
    } catch (err: any) {
      setQueryResult({
        success: false,
        error: err.message || 'Error al ejecutar la consulta'
      });
    } finally {
      setIsExecutingQuery(false);
    }
  };

  // Files Tab Handlers
  const handleDownload = () => {
    downloadExportFile(exportTable, exportFormat);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportFile(e.dataTransfer.files[0]);
      setImportResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await uploadImportFile(importFile, importTable);
      setImportResult({ success: true, message: res.message });
      setImportFile(null);
      await loadStatus();
      await loadTables();
      await loadRows(selectedTable, currentPage, searchQuery);
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'Error al procesar el archivo.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReSeed = async () => {
    setIsLoadingStatus(true);
    try {
      await seedCloudSql();
      await loadStatus();
      await loadTables();
      await loadRows(selectedTable, currentPage, searchQuery);
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const activeTableMeta = useMemo(() => {
    return tables.find(t => t.name === selectedTable);
  }, [tables, selectedTable]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#160f0e] border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#201412] via-[#1a1110] to-[#201412] border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Plataforma de Gestión SQL & Archivos
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  PostgreSQL Online
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Administra, edita y consulta directamente la estructura relacional de Cloud SQL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/php"
              target="_blank"
              rel="noreferrer"
              title="Abrir plataforma web SQL en nueva pestaña"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs font-mono transition"
            >
              <span>/php Studio</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-[#120b0a] border-b border-stone-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Explorador & Edición de Tablas</span>
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'console'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Consola SQL Interactiva</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Estructura de Columnas (DDL)</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'files'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar & Exportar Archivos</span>
          </button>

          <button
            onClick={() => setActiveTab('php')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'php'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Servidor PHP & Estado</span>
          </button>
        </div>

        {/* Tab 1: Tables & Rows Management (Full CRUD) */}
        {activeTab === 'tables' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar with all 10+ tables */}
            <div className="w-56 bg-[#130b0a] border-r border-stone-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-stone-800 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Tablas ({tables.length})
                </span>
                <button
                  onClick={loadTables}
                  title="Recargar tablas"
                  className="p-1 text-stone-400 hover:text-white rounded"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTables ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {tables.map(tbl => {
                  const isSelected = tbl.name === selectedTable;
                  return (
                    <button
                      key={tbl.name}
                      onClick={() => handleSelectTable(tbl.name)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-bold'
                          : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                      }`}
                    >
                      <span className="truncate">{tbl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800/80 text-stone-300 font-sans">
                        {tbl.rowCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table Workspace */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#160f0e]">
              
              {/* Action Toolbar */}
              <div className="p-3 bg-[#18110f] border-b border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-rose-400 uppercase">
                    {selectedTable}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                    {rowsData?.total ?? 0} registros
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search Form */}
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar en la tabla..."
                      className="bg-stone-900 border border-stone-700 text-xs px-2.5 py-1.5 pl-8 rounded-xl text-stone-200 w-44 focus:outline-none focus:border-rose-500"
                    />
                    <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                  </form>

                  {/* Add Row Button */}
                  <button
                    onClick={handleOpenNewRowModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Registro</span>
                  </button>

                  <button
                    onClick={() => loadRows(selectedTable, currentPage, searchQuery)}
                    title="Actualizar tabla"
                    className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRows ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Table Rows Grid */}
              <div className="flex-1 overflow-auto p-4">
                {isLoadingRows ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 text-stone-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                    <span className="text-xs">Consultando registros en PostgreSQL...</span>
                  </div>
                ) : !rowsData || rowsData.rows.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 border border-dashed border-stone-800 rounded-2xl p-6 text-center">
                    <Table className="w-8 h-8 text-stone-600" />
                    <p className="text-sm font-medium text-stone-400">
                      No hay registros en la tabla <span className="font-mono text-rose-400 font-bold">{selectedTable}</span>
                    </p>
                    <button
                      onClick={handleOpenNewRowModal}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition"
                    >
                      + Insertar Primer Registro
                    </button>
                  </div>
                ) : (
                  <div className="border border-stone-800 rounded-2xl overflow-hidden bg-[#120a09] shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1c1311] sticky top-0 z-10 border-b border-stone-800">
                          <tr>
                            {rowsData.columns.map(col => (
                              <th
                                key={col}
                                className="px-3 py-2.5 text-left text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-400 whitespace-nowrap"
                              >
                                {col}
                              </th>
                            ))}
                            <th className="px-3 py-2.5 text-right text-[11px] font-mono font-semibold text-stone-400 sticky right-0 bg-[#1c1311]">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {rowsData.rows.map((row, idx) => {
                            const rowId = row.id ?? idx;
                            return (
                              <tr key={String(rowId)} className="hover:bg-stone-900/60 transition group">
                                {rowsData.columns.map(col => {
                                  const val = row[col];
                                  let display: React.ReactNode = '';
                                  if (val === null || val === undefined) {
                                    display = <span className="text-stone-600 italic">null</span>;
                                  } else if (typeof val === 'object') {
                                    display = (
                                      <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50">
                                        {JSON.stringify(val).substring(0, 30)}...
                                      </span>
                                    );
                                  } else {
                                    const str = String(val);
                                    display = str.length > 40 ? str.substring(0, 40) + '...' : str;
                                  }

                                  return (
                                    <td
                                      key={col}
                                      className="px-3 py-2 text-xs text-stone-300 font-mono whitespace-nowrap max-w-xs truncate"
                                    >
                                      {display}
                                    </td>
                                  );
                                })}

                                {/* Actions Cell */}
                                <td className="px-3 py-2 text-right whitespace-nowrap sticky right-0 bg-[#120a09] group-hover:bg-[#180f0e]">
                                  <button
                                    onClick={() => handleOpenEditRowModal(row)}
                                    title="Editar fila"
                                    className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg mr-1 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(String(row.id))}
                                    title="Eliminar fila"
                                    className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination Bar */}
              {rowsData && rowsData.totalPages > 1 && (
                <div className="px-4 py-2 bg-[#18110f] border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 font-mono">
                  <span>
                    Página {rowsData.page} de {rowsData.totalPages} ({rowsData.total} registros en total)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={rowsData.page <= 1}
                      className="p-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(rowsData.totalPages, p + 1))}
                      disabled={rowsData.page >= rowsData.totalPages}
                      className="p-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* Tab 2: Interactive SQL Console */}
        {activeTab === 'console' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4 bg-[#120b0a]">
            
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  Consola SQL para PostgreSQL (Cloud SQL)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-mono hidden sm:inline">Ejemplos:</span>
                <button
                  onClick={() => setSqlQuery('SELECT * FROM obras LIMIT 10;')}
                  className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300 transition"
                >
                  obras
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT status, count(*) as total FROM leads GROUP BY status;')}
                  className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300 transition"
                >
                  leads agrupados
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT sum(amount_clp) as gasto_total FROM finances WHERE type = \'gasto\';')}
                  className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-mono text-stone-300 transition"
                >
                  finanzas suma
                </button>
              </div>
            </div>

            {/* SQL Code Input */}
            <div className="relative">
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                rows={5}
                placeholder="Escribe tu consulta SQL aquí (ej: SELECT * FROM obras;)..."
                className="w-full bg-[#160e0d] border border-stone-700 rounded-2xl p-4 font-mono text-xs text-rose-300 focus:outline-none focus:border-rose-500 shadow-inner"
              />
              <button
                onClick={handleExecuteSql}
                disabled={isExecutingQuery || !sqlQuery.trim()}
                className="absolute bottom-3.5 right-3.5 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isExecutingQuery ? 'animate-spin' : ''}`} />
                <span>{isExecutingQuery ? 'Ejecutando...' : 'Ejecutar Consulta'}</span>
              </button>
            </div>

            {/* SQL Execution Results */}
            <div className="flex-1 overflow-auto border border-stone-800 rounded-2xl bg-[#170f0e] shadow-sm">
              {queryResult?.error ? (
                <div className="p-4 bg-red-950/40 border-l-4 border-red-500 text-red-300 text-xs font-mono">
                  <strong>Error de Ejecución SQL:</strong>
                  <p className="mt-1">{queryResult.error}</p>
                </div>
              ) : queryResult ? (
                <div className="flex flex-col h-full">
                  <div className="px-4 py-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold">
                      {queryResult.command || 'QUERY OK'} &bull; {queryResult.rowCount ?? queryResult.rows?.length ?? 0} filas afectadas
                    </span>
                    <span className="text-stone-500">{queryResult.durationMs ?? 0} ms</span>
                  </div>

                  {queryResult.rows && queryResult.rows.length > 0 ? (
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1f1513] sticky top-0 border-b border-stone-800">
                          <tr>
                            {queryResult.columns?.map(col => (
                              <th key={col} className="px-3 py-2 text-[11px] font-mono font-semibold uppercase text-stone-400">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {queryResult.rows.map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-stone-800/40">
                              {queryResult.columns?.map(col => (
                                <td key={col} className="px-3 py-1.5 text-xs text-stone-300 font-mono max-w-sm truncate">
                                  {r[col] !== null && typeof r[col] === 'object'
                                    ? JSON.stringify(r[col])
                                    : String(r[col] ?? 'null')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-stone-400 font-mono">
                      Consulta ejecutada exitosamente sin devolver filas de resultado.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs font-mono">
                  <Terminal className="w-6 h-6 text-stone-600" />
                  <span>Ingresa una consulta SQL arriba y presiona "Ejecutar Consulta"</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: Schema DDL Inspector */}
        {activeTab === 'schema' && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#120b0a] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Estructura del Esquema PostgreSQL</h3>
                <p className="text-xs text-stone-400">Columnas, tipos de datos y restricciones de clave primaria</p>
              </div>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="bg-stone-900 border border-stone-700 text-xs px-3 py-1.5 rounded-xl font-mono text-stone-200"
              >
                {tables.map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.rowCount} filas)</option>
                ))}
              </select>
            </div>

            {activeTableMeta ? (
              <div className="border border-stone-800 rounded-2xl overflow-hidden bg-[#160f0e]">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead className="bg-[#1c1311] border-b border-stone-800">
                    <tr>
                      <th className="px-4 py-3 text-stone-400 uppercase text-[11px]">Columna</th>
                      <th className="px-4 py-3 text-stone-400 uppercase text-[11px]">Tipo de Dato</th>
                      <th className="px-4 py-3 text-stone-400 uppercase text-[11px]">Clave Primaria</th>
                      <th className="px-4 py-3 text-stone-400 uppercase text-[11px]">Nullable</th>
                      <th className="px-4 py-3 text-stone-400 uppercase text-[11px]">Por Defecto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {activeTableMeta.columns.map(col => (
                      <tr key={col.name} className="hover:bg-stone-900/40">
                        <td className="px-4 py-2.5 font-bold text-rose-400">{col.name}</td>
                        <td className="px-4 py-2.5 text-stone-300">
                          <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                            {col.dataType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {col.isPrimaryKey ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/50 font-bold text-[10px]">
                              PRIMARY KEY
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-stone-400">
                          {col.isNullable ? 'SÍ' : 'NO'}
                        </td>
                        <td className="px-4 py-2.5 text-stone-500">
                          {col.columnDefault || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-stone-500 text-xs">Cargando esquema...</div>
            )}
          </div>
        )}

        {/* Tab 4: File Import / Export */}
        {activeTab === 'files' && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#120b0a] space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Export Panel */}
              <div className="p-5 rounded-2xl bg-[#160f0e] border border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 mb-2">
                    <Download className="w-4 h-4" />
                    <h3 className="text-sm font-bold text-white">Exportar Base de Datos</h3>
                  </div>
                  <p className="text-xs text-stone-400 mb-4">
                    Genera copias de seguridad completas en formato JSON, tablas individuales en CSV o volcados SQL con sentencias INSERT.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Tabla a Exportar</label>
                      <select
                        value={exportTable}
                        onChange={e => setExportTable(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-200"
                      >
                        <option value="all">Todas las Tablas (Copia de Seguridad)</option>
                        {tables.map(t => (
                          <option key={t.name} value={t.name}>{t.name} ({t.rowCount} registros)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Formato</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['json', 'csv', 'sql'] as const).map(fmt => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setExportFormat(fmt)}
                            className={`py-2 rounded-xl text-xs font-mono uppercase font-bold border transition ${
                              exportFormat === fmt
                                ? 'bg-rose-950/80 text-rose-300 border-rose-600 shadow-xs'
                                : 'bg-stone-900 text-stone-400 border-stone-800 hover:bg-stone-800'
                            }`}
                          >
                            .{fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo Exportado</span>
                </button>
              </div>

              {/* Import Panel */}
              <div className="p-5 rounded-2xl bg-[#160f0e] border border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 mb-2">
                    <Upload className="w-4 h-4" />
                    <h3 className="text-sm font-bold text-white">Importar Archivos a SQL</h3>
                  </div>
                  <p className="text-xs text-stone-400 mb-4">
                    Sube archivos .json o .csv para procesar e insertar automáticamente los registros en PostgreSQL.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Tabla Destino</label>
                      <select
                        value={importTable}
                        onChange={e => setImportTable(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-200"
                      >
                        {tables.map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Drag & Drop Area */}
                    <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleFileDrop}
                      className="border-2 border-dashed border-stone-700 hover:border-rose-500/80 rounded-2xl p-5 text-center transition cursor-pointer bg-stone-900/40"
                      onClick={() => document.getElementById('importFileInput')?.click()}
                    >
                      <input
                        id="importFileInput"
                        type="file"
                        accept=".json,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-stone-500 mx-auto mb-2" />
                      {importFile ? (
                        <span className="text-xs font-mono text-rose-400 font-bold">{importFile.name}</span>
                      ) : (
                        <p className="text-xs text-stone-400">
                          Arrastra tu archivo aquí o haz clic para seleccionarlo (.json, .csv)
                        </p>
                      )}
                    </div>

                    {importResult && (
                      <div className={`p-3 rounded-xl text-xs font-mono ${
                        importResult.success
                          ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                          : 'bg-red-950/60 border border-red-800/60 text-red-300'
                      }`}>
                        {importResult.message}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleExecuteImport}
                  disabled={!importFile || isImporting}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Procesando e Importando...' : 'Iniciar Importación'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 5: PHP Web Studio & Status */}
        {activeTab === 'php' && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#120b0a] space-y-6">
            
            <div className="p-5 rounded-2xl bg-[#160f0e] border border-stone-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Servidor Web SQL Standalone (/php)</span>
                </h3>
                <a
                  href="/php"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>Abrir /php en Nueva Ventana</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-stone-400 mb-4">
                El endpoint <code className="font-mono text-rose-400">/php</code> ahora sirve una plataforma web completa e interactiva con navegación de tablas, consola SQL en vivo, edición de filas y exportación para trabajar directamente sobre la estructura creada.
              </p>

              {/* Seed Button */}
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-200">Restaurar Datos Iniciales (Seed)</h4>
                  <p className="text-[11px] text-stone-400">
                    Repoblar la base de datos PostgreSQL con el catálogo teatral y CRM de ejemplo si está vacía.
                  </p>
                </div>
                <button
                  onClick={handleReSeed}
                  disabled={isLoadingStatus}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 transition"
                >
                  {isLoadingStatus ? 'Poblando...' : 'Ejecutar Seed SQL'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Sub-Modal: Row Form for Editing or Creating */}
        {isRowModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#1c1311] border border-stone-700 rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-4 bg-[#231715] border-b border-stone-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-rose-400" />
                  <span>
                    {editingRow ? `Editar Registro #${editingRow.id}` : `Nuevo Registro en ${selectedTable}`}
                  </span>
                </h3>
                <button
                  onClick={() => setIsRowModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {rowModalError && (
                <div className="px-6 py-2.5 bg-red-950/60 border-b border-red-800/60 text-red-300 text-xs font-mono">
                  {rowModalError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {Object.keys(rowFormData).map(col => {
                  const val = rowFormData[col];
                  const colMeta = activeTableMeta?.columns.find(c => c.name === col);
                  const isJson = colMeta?.dataType === 'jsonb' || typeof val === 'object';
                  const isLongText = ['synopsis', 'notes', 'description', 'entry', 'bio', 'specs'].includes(col);

                  return (
                    <div key={col}>
                      <label className="block text-xs font-mono font-medium text-stone-300 mb-1 flex items-center justify-between">
                        <span>{col}</span>
                        <span className="text-[10px] text-stone-500">{colMeta?.dataType || 'text'}</span>
                      </label>

                      {isJson || isLongText ? (
                        <textarea
                          value={val}
                          onChange={e => setRowFormData({ ...rowFormData, [col]: e.target.value })}
                          rows={isJson ? 4 : 2}
                          className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 font-mono text-xs text-stone-200 focus:outline-none focus:border-rose-500 shadow-inner"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e => setRowFormData({ ...rowFormData, [col]: e.target.value })}
                          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 font-mono text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-3.5 bg-[#170f0d] border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRowModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-400 hover:bg-stone-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveRow}
                  disabled={isSavingRow}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow transition disabled:opacity-50"
                >
                  {isSavingRow ? 'Guardando...' : 'Guardar en SQL'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Delete Confirmation Alert Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm bg-[#1c1311] border border-red-800/80 rounded-2xl p-5 shadow-2xl text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">¿Eliminar registro permanentemente?</h4>
              <p className="text-xs text-stone-400 mb-4 font-mono">
                Se eliminará el ID <span className="text-red-400 font-bold">"{deleteConfirmId}"</span> de la tabla <span className="text-rose-400 font-bold">{selectedTable}</span> en PostgreSQL.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteRow(deleteConfirmId)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
