import React, { useState } from 'react';
import { Project } from '../types/project';
import { UserSession } from '../utils/crmCatalogService';
import { AuthModal } from './AuthModal';
import {
  FolderKanban,
  Plus,
  Copy,
  Share2,
  FlaskConical,
  Moon,
  Sun,
  CheckCircle2,
  Layers,
  RefreshCw,
  Wand2,
} from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onOpenWizard?: () => void;
  onOpenCrmCatalog?: () => void;
  onOpenCrmSend?: () => void;
  onDuplicateProject: () => void;
  onOpenAthamuModal: () => void;
  onOpenTestsTab: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lastSavedAt: string;
  onResetToDefaults: () => void;
  currentUser: UserSession;
  onSelectUser: (user: UserSession) => void;
  onSyncCloud: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onNewProject,
  onOpenWizard,
  onOpenCrmCatalog,
  onOpenCrmSend,
  onDuplicateProject,
  onOpenAthamuModal,
  onOpenTestsTab,
  darkMode,
  onToggleDarkMode,
  lastSavedAt,
  onResetToDefaults,
  currentUser,
  onSelectUser,
  onSyncCloud,
  isSyncing,
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-stone-900 dark:text-stone-100 tracking-tight">ATHA Producciones</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">Intranet · Capa 2</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">Arquitecto de Proyecto — Control de Gestión &amp; Viabilidad Cultural</p>
            </div>
          </div>

          {/* Project Selector & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Project Select Dropdown */}
            <div className="relative">
              <select
                id="project-selector-dropdown"
                value={activeProject.id}
                onChange={(e) => onSelectProject(e.target.value)}
                className="text-xs sm:text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} · {p.title}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>

            {onOpenWizard && (
              <button id="btn-header-wizard" onClick={onOpenWizard} title="Abrir Asistente Guiado de Creación" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 shadow-sm transition-colors cursor-pointer">
                <Wand2 className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                <span className="hidden sm:inline">Asistente</span>
              </button>
            )}

            <button id="btn-new-project" onClick={onNewProject} title="Crear nuevo proyecto" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Nuevo</span>
            </button>

            <button id="btn-duplicate-project" onClick={onDuplicateProject} title="Duplicar proyecto actual" className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer">
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Duplicar</span>
            </button>

            {onOpenCrmCatalog && (
              <button id="btn-header-crm-catalog" onClick={onOpenCrmCatalog} title="Explorar carpetas y catálogo del CRM ATHAMU" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors cursor-pointer shadow-xs">
                <FolderKanban className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Carpetas CRM</span>
              </button>
            )}

            <button id="btn-athamu-sync" onClick={onOpenAthamuModal} title="Contrato JSON compatible con CRM ATHAAMU" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors cursor-pointer shadow-sm">
              <Share2 className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
              <span>ATHAMU JSON</span>
            </button>

            <button id="btn-open-tests" onClick={onOpenTestsTab} title="Ver pruebas unitarias del sistema" className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors cursor-pointer">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">Tests</span>
            </button>

            <button id="btn-reset-data" onClick={onResetToDefaults} title="Restablecer proyectos de demostración iniciales" className="p-2 rounded-lg text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* User / Auth Button */}
            <button
              id="btn-user-auth"
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              title="Gestión de usuario y acceso ATHA"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                currentUser.provider === 'google'
                  ? 'bg-[#6ee7b7]/10 border-[#6ee7b7]/40 text-[#6ee7b7] hover:bg-[#6ee7b7]/20'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
              <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name.split(' ')[0]}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button id="btn-dark-mode-toggle" onClick={onToggleDarkMode} title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer">
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>
          </div>
        </div>

        {/* Status Line */}
        <div className="py-1 px-1 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              {currentUser.provider === 'google'
                ? `Sesión Google · ${currentUser.email.split('@')[0]}`
                : 'Persistencia local activa'}
            </span>
            <span className="hidden sm:inline text-stone-300 dark:text-stone-700">|</span>
            <span className="hidden sm:inline">Último guardado: {lastSavedAt || 'Recién guardado'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400 dark:text-stone-500 text-[10px]">Territorios: Santiago · Rancagua / O'Higgins</span>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={onSelectUser}
        onSyncCloud={onSyncCloud}
        isSyncing={isSyncing}
      />
    </header>
  );
};
