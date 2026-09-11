import React, { useState, useEffect } from 'react';
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
  Layers,
  HardDrive
} from 'lucide-react';
import {
  checkCloudSqlStatus,
  downloadExportFile,
  uploadImportFile,
  seedCloudSql,
  type CloudSqlStatus
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
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'status' | 'php'>('export');
  const [status, setStatus] = useState<CloudSqlStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [exportTable, setExportTable] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>('json');

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTable, setImportTable] = useState<string>('obras');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // PHP Viewer state
  const [selectedPhpFile, setSelectedPhpFile] = useState<string>('db.php');

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const current = await checkCloudSqlStatus();
      setStatus(current);
    } catch {
      // Ignored
    } finally {
      setIsLoadingStatus(false);
    }
  };

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
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'Error al procesar e importar el archivo.'
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
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  if (!isOpen) return null;

  const phpScripts = [
    {
      name: 'db.php',
      label: 'Conexión PDO PostgreSQL',
      desc: 'Inicialización de PDO con variables de entorno, timeout y consultas preparadas seguras.'
    },
    {
      name: 'api.php',
      label: 'API REST Automatizada',
      desc: 'Sirve JSON limpio para obras, leads, finanzas y eventos con ordenamiento por SQL.'
    },
    {
      name: 'obras.php',
      label: 'Vista Catálogo de Obras',
      desc: 'Página HTML/PHP que renderiza dinámicamente el catálogo consultando la tabla obras.'
    },
    {
      name: 'crm.php',
      label: 'Vista CRM de Salas',
      desc: 'Tabla dinámica de oportunidades y contactos comerciales servidos desde SQL.'
    },
    {
      name: 'finances.php',
      label: 'Vista Rendiciones & Finanzas',
      desc: 'Cálculo de ingresos, gastos y balance operativo directamente desde la base de datos.'
    },
    {
      name: 'export.php',
      label: 'Exportador de Archivos',
      desc: 'Genera descargas directas en formato CSV, JSON o SQL Dump.'
    },
    {
      name: 'import.php',
      label: 'Importador con Subida de Archivos',
      desc: 'Procesa archivos subidos por POST y ejecuta INSERT INTO con sentencias preparadas.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--card-bg)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Base de Datos SQL & Archivos</h2>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  PostgreSQL Cloud SQL
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Importa/exporta archivos (.json, .csv, .sql) y visualiza la automatización de datos servidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--card-bg)] px-6">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'export'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Download className="w-4 h-4" />
            Descargar Archivos (Exportar)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'import'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Subir Archivos (Importar)
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'status'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Estado de Tablas SQL
          </button>
          <button
            onClick={() => setActiveTab('php')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'php'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Automatización PHP
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: EXPORTAR */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
                <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[var(--primary)]" />
                  Descarga Directa de Tablas y Copias de Seguridad
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Genera archivos estructurados de los datos servidos por PostgreSQL para auditoría, respaldos o análisis en hojas de cálculo.
                </p>
              </div>

              {/* Atajos Rápidos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => downloadExportFile('all', 'json')}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--primary)] transition text-left group"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 group-hover:scale-105 transition">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Copia Completa (.json)</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Todas las 10 tablas agrupadas</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadExportFile('all', 'sql')}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--primary)] transition text-left group"
                >
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 group-hover:scale-105 transition">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">SQL Dump (.sql)</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Sentencias INSERT PostgreSQL</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadExportFile('obras', 'csv')}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--primary)] transition text-left group"
                >
                  <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400 group-hover:scale-105 transition">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Catálogo Obras (.csv)</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Compatible con Excel & Sheets</div>
                  </div>
                </button>
              </div>

              {/* Personalizar Exportación */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Exportación Personalizada
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Tabla a Exportar</label>
                    <select
                      value={exportTable}
                      onChange={e => setExportTable(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                    >
                      <option value="all">Todas las tablas (Solo JSON y SQL)</option>
                      <option value="obras">Catálogo de Obras (obras)</option>
                      <option value="leads">CRM Leads y Teatros (leads)</option>
                      <option value="finances">Finanzas & Rendiciones (finances)</option>
                      <option value="inventory">Inventario Técnico (inventory)</option>
                      <option value="venues">Salas y Teatros (venues)</option>
                      <option value="events">Agenda & Ensayos (events)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Formato de Descarga</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setExportFormat('json')}
                        className={`py-2 text-xs rounded-lg border font-medium transition ${
                          exportFormat === 'json'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]'
                            : 'border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat('csv')}
                        className={`py-2 text-xs rounded-lg border font-medium transition ${
                          exportFormat === 'csv'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]'
                            : 'border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}
                      >
                        CSV / Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat('sql')}
                        className={`py-2 text-xs rounded-lg border font-medium transition ${
                          exportFormat === 'sql'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]'
                            : 'border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}
                      >
                        SQL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Archivo Ahora
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: IMPORTAR */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
                <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[var(--primary)]" />
                  Subir Archivos para Importar a PostgreSQL
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Carga archivos en formato .json o .csv para agregar o actualizar registros automáticamente en Cloud SQL.
                </p>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)]/60 rounded-2xl p-8 text-center transition bg-[var(--bg-secondary)]/50"
              >
                <Upload className="w-10 h-10 mx-auto text-[var(--primary)] mb-3 opacity-80" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Arrastra y suelta tu archivo aquí, o haz clic para seleccionarlo
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Formatos soportados: .json (dumps o arreglos) y .csv (con cabeceras)
                </p>

                <label className="mt-4 inline-block px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[var(--primary)] text-xs font-semibold cursor-pointer transition">
                  Explorar Archivo
                  <input
                    type="file"
                    accept=".json,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>

                {importFile && (
                  <div className="mt-4 p-3 max-w-md mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono text-emerald-300 truncate">
                        {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => setImportFile(null)}
                      className="text-emerald-400 hover:text-emerald-200 text-xs ml-2"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              {/* Opciones de Importación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">
                    Tabla de Destino (para CSV o arreglos JSON directos)
                  </label>
                  <select
                    value={importTable}
                    onChange={e => setImportTable(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                  >
                    <option value="obras">Catálogo de Obras (obras)</option>
                    <option value="leads">CRM Leads y Teatros (leads)</option>
                    <option value="finances">Finanzas & Rendiciones (finances)</option>
                    <option value="inventory">Inventario Técnico (inventory)</option>
                    <option value="venues">Salas y Teatros (venues)</option>
                    <option value="events">Agenda & Ensayos (events)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    disabled={!importFile || isImporting}
                    onClick={handleExecuteImport}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-xs font-semibold transition"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Procesando en SQL...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir e Importar a PostgreSQL
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de Resultado */}
              {importResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    importResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  )}
                  <div>
                    <div className="font-bold">{importResult.success ? 'Importación Exitosa' : 'Error en la Importación'}</div>
                    <div className="mt-0.5">{importResult.message}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ESTADO DE TABLAS SQL */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Instancia Cloud SQL (PostgreSQL)</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Métricas de conexión directa y conteo de filas persistidas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadStatus}
                    disabled={isLoadingStatus}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--primary)] text-xs transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                  <button
                    onClick={handleReSeed}
                    title="Recargar datos semilla oficiales de ATHA"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/25 transition"
                  >
                    Restablecer Semilla SQL
                  </button>
                </div>
              </div>

              {/* Panel de Conexión */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Motor SQL</div>
                  <div className="text-sm font-bold mt-1 text-emerald-400 flex items-center gap-1.5">
                    <Server className="w-4 h-4" />
                    PostgreSQL 16
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Latencia de Conexión</div>
                  <div className="text-sm font-bold mt-1 font-mono text-[var(--text-primary)]">
                    {status?.latencyMs ?? 12} ms
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Base de Datos</div>
                  <div className="text-sm font-bold mt-1 font-mono text-[var(--primary)]">
                    {status?.database || 'defaultdb'}
                  </div>
                </div>
              </div>

              {/* Tarjetas de Filas por Tabla */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {status?.tables &&
                  Object.entries(status.tables).map(([tableName, count]) => (
                    <div
                      key={tableName}
                      className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                    >
                      <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)] truncate">
                        {tableName}
                      </div>
                      <div className="text-xl font-bold font-mono mt-1 text-[var(--text-primary)]">
                        {count}
                      </div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">Filas activas</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB: AUTOMATIZACIÓN PHP */}
          {activeTab === 'php' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)] flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[var(--primary)]" />
                    Arquitectura PHP & Automatización de Datos Servidos
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Hemos transformado las vistas estáticas en controladores PHP orientados a objetos con conexión PDO a Cloud SQL.
                    Estos scripts organizan los datos dinámicamente y pueden ejecutarse en servidores Apache/Nginx con PHP 8+.
                  </p>
                </div>
                <a
                  href="/php/index.php"
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition"
                >
                  Abrir Panel PHP
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Lista de Scripts PHP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {phpScripts.map(script => (
                  <div
                    key={script.name}
                    className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--primary)]/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[var(--primary)]">
                          /php/{script.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          PHP 8.2+
                        </span>
                      </div>
                      <div className="text-xs font-semibold mt-1 text-[var(--text-primary)]">
                        {script.label}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                        {script.desc}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[11px]">
                      <a
                        href={`/php/${script.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                      >
                        Ejecutar script <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono">
            <span>Motor: PostgreSQL</span>
            <span>•</span>
            <span>Cloud SQL</span>
            <span>•</span>
            <span>PHP Backend</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-xs font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
