import React, { useState, useEffect } from 'react';
import { Project } from '../types/project';
import { CrmFolder, CrmCatalogEntry } from '../types/crm';
import {
  loadCrmFolders,
  loadCrmFoldersAsync,
  loadCrmCatalog,
  loadCrmCatalogAsync,
  sendProjectToCrm,
  sendProjectToCrmAsync,
  createNewCrmFolder,
  getUserSession,
  getAuthToken,
} from '../utils/crmCatalogService';
import { formatCLP } from '../utils/calculations';
import { 
  X, 
  FolderKanban, 
  FolderPlus, 
  Send, 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Building2, 
  Layers, 
  Sparkles, 
  Share2, 
  Filter, 
  ExternalLink,
  Tag,
  AlertCircle
} from 'lucide-react';

interface CrmCatalogExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project;
  onLoadProjectFromCrm: (project: Project) => void;
  initialMode?: 'explore' | 'send';
}

export const CrmCatalogExplorerModal: React.FC<CrmCatalogExplorerModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  onLoadProjectFromCrm,
  initialMode = 'explore'
}) => {
  const [mode, setMode] = useState<'explore' | 'send'>(initialMode);
  const [folders, setFolders] = useState<CrmFolder[]>([]);
  const [catalog, setCatalog] = useState<CrmCatalogEntry[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for sending project
  const [sendFolderId, setSendFolderId] = useState<string>('');
  const [sendNotes, setSendNotes] = useState<string>('');
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // State for creating folder
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [isConnected, setIsConnected] = useState(false);  // estado conexión CRM real

  // Reload data on open — intenta backend REAL primero
  useEffect(() => {
    if (isOpen) {
      let cancelled = false;
      (async () => {
        const token = getAuthToken();
        const user = getUserSession();
        setIsConnected(!!(token && user));

        // cargar folders REALES (fallback localStorage)
        const realFolders = await loadCrmFoldersAsync();
        if (!cancelled) setFolders(realFolders);

        // cargar catálogo REAL (fallback localStorage)
        const realCatalog = await loadCrmCatalogAsync();
        if (!cancelled) setCatalog(realCatalog);

        if (!cancelled) {
          setMode(initialMode);
          setSendSuccessMessage(null);
          if (realFolders.length > 0) setSendFolderId(realFolders[0].id);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Filtered entries
  const filteredEntries = catalog.filter((entry) => {
    const matchesFolder = selectedFolderId === 'all' || entry.folderId === selectedFolderId;
    const matchesQuery = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.discipline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.territory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesQuery;
  });

  const handleSendProject = async (e: React.FormEvent) => {
    e.preventDefault();
    // Intentar backend REAL primero; fallback localStorage
    const result = await sendProjectToCrmAsync(
      activeProject, sendFolderId, sendNotes,
    );
    if (result) {
      const label = result.backend ? 'CRM real' : 'Intranet (local)';
      setCatalog(result.updatedCatalog);
      setFolders(await loadCrmFoldersAsync());
      setSendSuccessMessage(
        result.backend
          ? `¡Proyecto "${activeProject.title}" sincronizado con el CRM real!`
          : `¡Proyecto "${activeProject.title}" guardado en Intranet CRM ATHAMU (modo local)!`,
      );
      setTimeout(() => setMode('explore'), 2000);
    } else {
      setSendSuccessMessage('Error al enviar proyecto al CRM ATHAMU.');
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const created = createNewCrmFolder(newFolderName.trim(), newFolderDesc.trim());
    const updated = loadCrmFolders();
    setFolders(updated);
    setSelectedFolderId(created.id);
    setIsCreatingFolder(false);
    setNewFolderName('');
    setNewFolderDesc('');
  };

  const handleSelectToLoad = (entry: CrmCatalogEntry) => {
    if (window.confirm(`¿Deseas abrir y cargar el proyecto "${entry.title}" (${entry.projectCode}) en el Arquitecto de Proyecto? Los cambios actuales en memoria se guardarán.`)) {
      onLoadProjectFromCrm(entry.projectData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-150"
        role="dialog"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-stone-900 dark:text-stone-100">
                  Catálogo de Proyectos & Carpetas del CRM ATHAMU
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Intranet ATHAMU
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sincronización bidireccional: envía proyectos al catálogo o lee carpetas existentes para trabajarlas en el Arquitecto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-stone-200 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setMode('explore')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  mode === 'explore'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Explorar Carpetas ({catalog.length})
              </button>
              <button
                onClick={() => setMode('send')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mode === 'send'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>Enviar Proyecto Actual</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODE 1: EXPLORAR CARPETAS & LEER PROYECTOS DEL CRM */}
        {mode === 'explore' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            
            {/* Sidebar: Carpetas del CRM */}
            <div className="w-full md:w-72 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-4 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Carpetas del CRM ({folders.length})
                </span>
                <button
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Nueva</span>
                </button>
              </div>

              {/* Create folder inline form */}
              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="bg-white dark:bg-stone-800 p-3 rounded-xl border border-amber-300 dark:border-amber-800 space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Nombre de carpeta en CRM..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Descripción o propósito..."
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[11px]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold text-[11px]"
                    >
                      Crear Carpeta
                    </button>
                  </div>
                </form>
              )}

              {/* Folders List */}
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolderId('all')}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                    selectedFolderId === 'all'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderKanban className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Todas las Carpetas</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    {catalog.length}
                  </span>
                </button>

                {folders.map((f) => {
                  const count = catalog.filter((c) => c.folderId === f.id).length;
                  const isSelected = selectedFolderId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolderId(f.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FolderKanban className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-stone-400'}`} />
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status info */}
              <div className="mt-auto pt-4 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 space-y-2">
                <div className={`flex items-center gap-1.5 font-semibold ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Conector CRM ATHAMU: conectado a backend real</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Conector CRM ATHAMU: modo local (Intranet)</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-stone-400">
                  Formato de intercambio compatible con Esquema v1.1.0-ATHAMU. Integrantes y obras sincronizados con crm-v1 (:5052).
                </p>
              </div>

            </div>

            {/* Main Area: Lista de proyectos en el CRM */}
            <div className="flex-1 flex flex-col p-5 overflow-y-auto space-y-4">
              
              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en el catálogo del CRM por título, código, disciplina o territorio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Projects Grid */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 space-y-2">
                    <FolderKanban className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-700" />
                    <p className="text-sm font-semibold">No se encontraron proyectos en esta carpeta del CRM.</p>
                    <p className="text-xs">Usa "Enviar Proyecto Actual" para incorporar este proyecto al catálogo.</p>
                  </div>
                ) : (
                  filteredEntries.map((entry) => {
                    const isCurrent = entry.projectId === activeProject.id;
                    return (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700'
                        } shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {entry.projectCode}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                              Carpeta: {entry.folderName}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {entry.status.toUpperCase()}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
                                ACTIVO EN ARQUITECTO
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                            {entry.title}
                          </h4>
                          {entry.subtitle && (
                            <p className="text-xs text-stone-500 truncate">{entry.subtitle}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap pt-1">
                            <span>{entry.discipline}</span>
                            <span>·</span>
                            <span>{entry.territory}</span>
                            <span>·</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {formatCLP(entry.totalBudgetCLP)}
                            </span>
                            <span>·</span>
                            <span>{entry.stagesCount} etapas ({entry.progressPct}% avance)</span>
                          </div>

                          {entry.notes && (
                            <p className="text-[11px] text-stone-400 italic">
                              Nota CRM: {entry.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 sm:self-center">
                          <button
                            onClick={() => handleSelectToLoad(entry)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 shadow-xs transition-colors cursor-pointer"
                            title="Cargar y abrir este proyecto en el Arquitecto"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                            <span>Abrir en Arquitecto</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        )}

        {/* MODE 2: ENVIAR PROYECTO ACTUAL AL CRM */}
        {mode === 'send' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            
            {sendSuccessMessage && (
              <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sendSuccessMessage}</span>
              </div>
            )}

            {/* Current project preview */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Proyecto a Enviar al CRM ATHAMU
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {activeProject.title}
                  </h4>
                  <p className="text-xs text-stone-500">{activeProject.subtitle}</p>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-1 bg-stone-200 dark:bg-stone-700 rounded text-stone-800 dark:text-stone-200">
                  {activeProject.code}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 pt-1">
                <span>Disciplina: <strong>{activeProject.discipline}</strong></span>
                <span>Territorio: <strong>{activeProject.territory}</strong></span>
                <span>Etapas: <strong>{activeProject.stages.length}</strong></span>
                <span>Operador: <strong>{activeProject.operator?.name || activeProject.leadProducer}</strong></span>
              </div>
            </div>

            {/* Send Form */}
            <form onSubmit={handleSendProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Seleccionar Carpeta de Destino en el CRM *
                </label>
                <select
                  value={sendFolderId}
                  onChange={(e) => setSendFolderId(e.target.value)}
                  required
                  className="w-full text-xs font-medium bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.description})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Notas de Envío / Versión de Sincronización
                </label>
                <textarea
                  rows={3}
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  placeholder="Ej. Etapas cerradas para postulación Fondart 2026. Presupuesto visado por dirección artística y producción ejecutiva."
                  className="w-full text-xs bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-stone-400">
                  El proyecto quedará disponible inmediatamente para todos los operadores en la Intranet y CRM.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('explore')}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Confirmar Envío al Catálogo del CRM</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
};
