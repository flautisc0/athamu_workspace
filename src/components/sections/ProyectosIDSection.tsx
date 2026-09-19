import React, { useState } from 'react';
import { ProjectRD } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  FlaskConical,
  Sparkles,
  Layers,
  CheckCircle2,
  TrendingUp,
  Tag,
  DollarSign,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Compass,
  ArrowUpRight,
  Database
} from 'lucide-react';

interface ProyectosIDSectionProps {
  projects: ProjectRD[];
  onSaveProject: (project: ProjectRD) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProjectProgress?: (projectId: string, newProgress: number) => void;
  onNavigateSection?: (section: string) => void;
  theme?: 'terracota' | 'dia';
}

export const ProyectosIDSection: React.FC<ProyectosIDSectionProps> = ({
  projects,
  onSaveProject,
  onDeleteProject,
  onUpdateProjectProgress,
  onNavigateSection,
  theme = 'terracota'
}) => {
  const isLight = theme === 'dia';

  // Modal for editing/creating project
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProject, setModalProject] = useState<Partial<ProjectRD> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenEditModal = (p: ProjectRD) => {
    setModalProject({ ...p });
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setModalProject({
      id: `rd-${Date.now()}`,
      code: `ID-${String(projects.length + 1).padStart(2, '0')}`,
      title: '',
      phase: 'Investigación Preliminar',
      description: '',
      teamLead: 'Francisco Pérez',
      progress: 10,
      budgetCLP: 6000000,
      spentCLP: 1000000,
      milestoneUpcoming: '',
      tags: ['I+D Escénico', 'Tecnología'],
      updatedAt: new Date().toLocaleDateString('es-CL')
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProject || !modalProject.title) return;

    const savedProject: ProjectRD = {
      id: modalProject.id || `rd-${Date.now()}`,
      code: modalProject.code || `ID-${String(projects.length + 1).padStart(2, '0')}`,
      title: modalProject.title,
      phase: modalProject.phase || 'Fase 1',
      description: modalProject.description || '',
      teamLead: modalProject.teamLead || 'Equipo ATHA',
      progress: Number(modalProject.progress) || 0,
      budgetCLP: Number(modalProject.budgetCLP) || 0,
      spentCLP: Number(modalProject.spentCLP) || 0,
      milestoneUpcoming: modalProject.milestoneUpcoming || '',
      tags: Array.isArray(modalProject.tags) ? modalProject.tags : (modalProject.tags ? String(modalProject.tags).split(',').map(s => s.trim()) : []),
      updatedAt: new Date().toLocaleDateString('es-CL')
    };

    onSaveProject(savedProject);
    setIsModalOpen(false);
    setModalProject(null);
    setFeedback('¡Proyecto I+D actualizado y sincronizado en SQL (proyectosid) con éxito!');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      
      {/* Header & Architect Banner */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${
        isLight
          ? 'bg-gradient-to-br from-white via-[#FAF6F4] to-[#F5ECE8] border-[#E8DDD7] text-stone-900 shadow-xs'
          : 'bg-gradient-to-br from-[#1E110F] via-[#241513] to-[#170E0D] border-[#E05A47]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#E05A47]/15 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[#E05A47]/15 text-[#E05A47] font-bold">
                Módulo I+D & Laboratorios Escénicos
              </span>
              <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                SQL Sincronizado: tabla `proyectosid`
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
              Proyectos de Investigación & Desarrollo Escénico
            </h1>
            <p className={`text-xs md:text-sm max-w-2xl ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Iniciativas de vanguardia que exploran interfaces sonoras biométricas, sesiones acústicas patrimoniales y escenografía inmersiva. Haz clic en cualquier tarjeta para editar sus datos en tiempo real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection('arquitecto')}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-stone-50 border-stone-300 text-stone-800'
                    : 'bg-[#2A1815] hover:bg-[#35201C] border-[#E05A47]/40 text-white'
                }`}
              >
                <Compass className="w-4 h-4 text-[#E05A47]" />
                <span>Abrir Arquitecto de Proyectos</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
              </button>
            )}

            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#E05A47] hover:bg-[#FF6B4A] text-white font-semibold text-xs rounded-2xl shadow-lg shadow-[#E05A47]/25 transition-all cursor-pointer w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proyecto I+D</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Grid of Clickable R&D Project Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => {
          const currentProgress = project.progress;
          const percentColor =
            currentProgress >= 80 ? 'bg-emerald-500' :
            currentProgress >= 60 ? 'bg-emerald-400' :
            currentProgress >= 40 ? 'bg-[#E05A47]' : 'bg-amber-500';

          return (
            <div
              key={project.id}
              onClick={() => handleOpenEditModal(project)}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md cursor-pointer group relative ${
                isLight
                  ? 'bg-white border-stone-200 hover:border-[#E05A47]/50'
                  : 'bg-[#180F0E] border-[#3E221E] hover:border-[#E05A47]/60'
              }`}
            >
              <div className="space-y-4">
                {/* Code & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#E05A47]/15 text-[#E05A47] border border-[#E05A47]/30">
                      {project.code}
                    </span>
                    <span className={`text-[11px] font-mono ${isLight ? 'text-stone-400' : 'text-slate-400'}`}>
                      SQL Sync: {project.updatedAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-medium text-[#E05A47] flex items-center gap-1 bg-[#E05A47]/10 px-2.5 py-1 rounded-lg">
                      <Edit2 className="w-3 h-3" />
                      <span>Editar Ficha</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar proyecto I+D "${project.title}"?`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      title="Eliminar proyecto"
                      className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-lg font-bold tracking-tight font-display ${isLight ? 'text-stone-900 group-hover:text-[#E05A47]' : 'text-white group-hover:text-[#E05A47]'}`}>
                  {project.title}
                </h3>

                {/* Phase Badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className={isLight ? 'text-stone-500' : 'text-slate-400'}>Fase actual:</span>
                  <span className="text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {project.phase}
                  </span>
                </div>

                {/* Description */}
                <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                  {project.description}
                </p>

                {/* Next Milestone */}
                <div className={`p-3.5 rounded-2xl border space-y-1 ${
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/30 border-white/5'
                }`}>
                  <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider block">
                    Próximo Hito Clave:
                  </span>
                  <p className={`text-xs ${isLight ? 'text-stone-800' : 'text-slate-200'}`}>
                    {project.milestoneUpcoming || 'En planificación y desarrollo'}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className={`space-y-3 pt-4 border-t ${isLight ? 'border-stone-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>Porcentaje de Desarrollo</span>
                  <span className="font-mono font-bold text-sm">
                    {currentProgress}%
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 ${isLight ? 'bg-stone-100 border border-stone-200' : 'bg-black/40 border border-white/10'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${percentColor}`}
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                    Líder: <span className={`font-medium ${isLight ? 'text-stone-900' : 'text-slate-200'}`}>{project.teamLead}</span>
                  </span>

                  <div className="flex items-center gap-1 font-mono text-[11px] font-semibold">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{formatCLP(project.spentCLP)} / {formatCLP(project.budgetCLP)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {project.tags.map((tag, idx) => (
                    <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] border ${
                      isLight ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-white/5 text-slate-300 border-white/10'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal for Editing/Creating Project RD & SQL Sync */}
      {isModalOpen && modalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#1C1210] border-[#3E221E] text-white'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'}`}>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#E05A47]" />
                <h3 className="text-base font-semibold font-display">
                  {modalProject.title ? `Editar Proyecto I+D: ${modalProject.title}` : 'Nuevo Proyecto I+D (SQL Sync)'}
                </h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setModalProject(null); }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Título del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalProject.title || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej. Interfaces Sonoras Biométricas"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Código SQL (`proyectosid`)
                  </label>
                  <input
                    type="text"
                    value={modalProject.code || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ej. ID-05"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Fase Actual
                  </label>
                  <input
                    type="text"
                    value={modalProject.phase || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, phase: e.target.value }))}
                    placeholder="Ej. Prototipado Técnico & Muestreo"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Líder de Investigación
                  </label>
                  <input
                    type="text"
                    value={modalProject.teamLead || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, teamLead: e.target.value }))}
                    placeholder="Ej. Antonia Fernández"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold uppercase tracking-wider opacity-80">
                  Descripción & Objetivos
                </label>
                <textarea
                  rows={3}
                  value={modalProject.description || ''}
                  onChange={(e) => setModalProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalla el alcance de la investigación y su aplicación..."
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold uppercase tracking-wider opacity-80">
                  Próximo Hito Clave
                </label>
                <input
                  type="text"
                  value={modalProject.milestoneUpcoming || ''}
                  onChange={(e) => setModalProject(prev => ({ ...prev, milestoneUpcoming: e.target.value }))}
                  placeholder="Ej. Residencia técnica de 5 días en Sala A1 GAM"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Avance (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={modalProject.progress ?? 0}
                    onChange={(e) => setModalProject(prev => ({ ...prev, progress: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Presupuesto ($ CLP)
                  </label>
                  <input
                    type="number"
                    value={modalProject.budgetCLP ?? 0}
                    onChange={(e) => setModalProject(prev => ({ ...prev, budgetCLP: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-wider opacity-80">
                    Gasto Ejecutado ($ CLP)
                  </label>
                  <input
                    type="number"
                    value={modalProject.spentCLP ?? 0}
                    onChange={(e) => setModalProject(prev => ({ ...prev, spentCLP: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold uppercase tracking-wider opacity-80">
                  Etiquetas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={Array.isArray(modalProject.tags) ? modalProject.tags.join(', ') : (modalProject.tags || '')}
                  onChange={(e) => setModalProject(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="Ej. Audio Inmersivo, Sensórica, FONDART"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-stone-200 dark:border-white/10 flex items-center justify-between">
                {modalProject.id && projects.some(p => p.id === modalProject.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar definitivamente este proyecto I+D?`)) {
                        onDeleteProject(modalProject.id!);
                        setIsModalOpen(false);
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Proyecto</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setModalProject(null); }}
                    className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                      isLight ? 'border-stone-200 text-stone-700 hover:bg-stone-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white font-semibold shadow-lg shadow-[#E05A47]/20 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar y Sincronizar SQL</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
