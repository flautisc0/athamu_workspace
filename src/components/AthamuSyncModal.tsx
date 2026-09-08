import React, { useState } from 'react';
import { Project, ATHAMUExportPayload } from '../types/project';
import { INITIAL_TEMPLATES, INITIAL_METRICS_SCHEMA } from '../data/initialProjects';
import { 
  Share2, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  FileCode, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  Database
} from 'lucide-react';

interface AthamuSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project;
  onImportProject: (importedProject: Project) => void;
}

export const AthamuSyncModal: React.FC<AthamuSyncModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProject,
  onImportProject
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  if (!isOpen) return null;

  // Build compliant payload
  const payload: ATHAMUExportPayload = {
    contractVersion: '1.1.0-ATHAMU',
    system: 'ATHA-INTRANET-CRM-ARQUITECTO',
    validUntil: '2026-12-31T23:59:59Z',
    connectorStatus: 'offline_standalone',
    exportedAt: new Date().toISOString(),
    totalProjectsCount: projects.length,
    projects: projects,
    activeProjectId: activeProject.id,
    totalTemplatesCount: INITIAL_TEMPLATES.length,
    templates: INITIAL_TEMPLATES,
    metricsSchema: INITIAL_METRICS_SCHEMA,
    metadata: {
      ecosystemLayer: 'Capa 2: Intermedia (Intranet/CRM)',
      agentMacContext: 'ATHA-Mac-Agent-V1.4',
      notes: 'Datos de referencia con fecha de vigencia; conector a ATHAMU pendiente.'
    }
  };

  const jsonString = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atha-proyecto-${activeProject.code.toLowerCase()}.athanet.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleProcessImport = () => {
    setImportError(null);
    setImportSuccess(false);

    try {
      if (!importText.trim()) {
        throw new Error('Por favor pega un contenido JSON válido.');
      }

      const parsed = JSON.parse(importText);

      // Check if it's payload or single project
      let targetProject: Project | null = null;
      if (parsed.contractVersion && parsed.projects && parsed.projects.length > 0) {
        targetProject = parsed.projects.find((p: any) => p.id === parsed.activeProjectId) || parsed.projects[0];
      } else if (parsed.code && parsed.stages && parsed.fundingRegime) {
        targetProject = parsed as Project;
      }

      if (!targetProject || !targetProject.title || !targetProject.stages) {
        throw new Error('El JSON no cumple con la estructura mínima requerida para un Proyecto de ATHA.');
      }

      onImportProject(targetProject);
      setImportSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      setImportError(err.message || 'Error de análisis sintáctico JSON.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                Integración con CRM ATHAMU (Esquema JSON)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ecosistema ATHA Producciones · Capa Intermedia (Intranet)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher: Export vs Import */}
        <div className="px-5 pt-3 border-b border-stone-100 dark:border-stone-800 flex gap-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Exportar Contrato JSON ({payload.contractVersion})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Importar desde ATHAMU / Archivo
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Note Banner */}
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 flex items-start gap-2">
            <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Compatibilidad de Capas:</strong> Este artefacto opera de forma desacoplada y almacena los datos en tu navegador (localStorage).
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                "Datos de referencia con fecha de vigencia; conector a ATHAMU pendiente."
              </p>
            </div>
          </div>

          {activeTab === 'export' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  Estructura JSON del Contrato v1.0.0:
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  {jsonString.length.toLocaleString('es-CL')} bytes
                </span>
              </div>

              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-xs max-h-72 overflow-y-auto border border-stone-800">
                  {jsonString}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Cargar archivo .json o pegar payload:
                </label>
                <input
                  type="file"
                  accept=".json,.athanet.json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer mb-2"
                />
              </div>

              <textarea
                rows={9}
                placeholder="Pega aquí el código JSON del proyecto..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-2 focus:ring-amber-500"
              />

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Proyecto importado y sincronizado correctamente!</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            Sistema: ATHA-INTRANET-CRM-V1
          </span>

          <div className="flex gap-2">
            {activeTab === 'export' ? (
              <>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleProcessImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Importar Proyecto</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-2 text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
