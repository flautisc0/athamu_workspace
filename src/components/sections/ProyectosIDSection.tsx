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
  Save
} from 'lucide-react';

interface ProyectosIDSectionProps {
  projects: ProjectRD[];
  onSaveProject: (project: ProjectRD) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProjectProgress?: (projectId: string, newProgress: number) => void;
}

export const ProyectosIDSection: React.FC<ProyectosIDSectionProps> = ({
  projects,
  onSaveProject,
  onDeleteProject,
  onUpdateProjectProgress
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(50);

  // Modal for editing/creating project
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProject, setModalProject] = useState<Partial<ProjectRD> | null>(null);

  const handleStartQuickEdit = (p: ProjectRD) => {
    setEditingProjectId(p.id);
    setTempProgress(p.progress);
  };

  const handleSaveProgress = (project: ProjectRD) => {
    const updated: ProjectRD = {
      ...project,
      progress: tempProgress,
      updatedAt: new Date().toLocaleDateString('es-CL')
    };
    onSaveProject(updated);
    if (onUpdateProjectProgress) {
      onUpdateProjectProgress(project.id, tempProgress);
    }
    setEditingProjectId(null);
  };

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
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#38bdf8] uppercase tracking-wider">
            <span>3. Proyectos I+D Escénico</span>
            <span>•</span>
            <span>Laboratorios & Innovación</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Investigación, Desarrollo & Nuevos Formatos
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Iniciativas de vanguardia de ATHA Producciones que exploran interfaces sonoras biométricas, sesiones acústicas patrimoniales, escenografía lumínica inmersiva e inteligencia de datos para el ecosistema cultural chileno.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0f1115] font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Proyecto I+D</span>
        </button>
      </div>

      {/* Grid of R&D Projects with visible Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => {
          const isQuickEditing = editingProjectId === project.id;
          const currentProgress = isQuickEditing ? tempProgress : project.progress;
          const percentColor =
            currentProgress >= 80 ? 'bg-emerald-400' :
            currentProgress >= 60 ? 'bg-[#6ee7b7]' :
            currentProgress >= 40 ? 'bg-[#38bdf8]' : 'bg-[#fbbf24]';

          return (
            <div
              key={project.id}
              className="p-6 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-lg relative group"
            >
              <div className="space-y-3">
                {/* Code & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                      {project.code}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Actualizado: {project.updatedAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(project)}
                      title="Editar proyecto completo"
                      className="p-1.5 text-slate-400 hover:text-[#38bdf8] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar proyecto I+D "${project.title}"?`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      title="Eliminar proyecto"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {project.title}
                </h3>

                {/* Phase Badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Fase actual:</span>
                  <span className="text-[#fbbf24] font-medium bg-[#fbbf24]/10 px-2 py-0.5 rounded border border-[#fbbf24]/20">
                    {project.phase}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {project.description}
                </p>

                {/* Next Milestone */}
                <div className="p-3 rounded-xl bg-[#12141a] border border-white/5 space-y-1">
                  <span className="text-[10px] font-semibold text-[#6ee7b7] uppercase tracking-wider block">
                    Próximo Hito Clave:
                  </span>
                  <p className="text-xs text-slate-200">
                    {project.milestoneUpcoming || 'En planificación'}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Adjustment */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Porcentaje de Desarrollo</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {currentProgress}%
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-3 rounded-full bg-[#0f1115] border border-white/10 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${percentColor}`}
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>

                {/* In-place progress slider when editing */}
                {isQuickEditing ? (
                  <div className="pt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tempProgress}
                      onChange={(e) => setTempProgress(Number(e.target.value))}
                      className="flex-1 accent-[#6ee7b7]"
                    />
                    <button
                      onClick={() => handleSaveProgress(project)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-md transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingProjectId(null)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Liderado por: <span className="text-slate-200 font-medium">{project.teamLead}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartQuickEdit(project)}
                        className="text-[11px] text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        Ajustar % avance
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => handleOpenEditModal(project)}
                        className="text-[11px] text-[#6ee7b7] hover:underline cursor-pointer font-medium"
                      >
                        Editar ficha
                      </button>
                    </div>
                  </div>
                )}

                {/* Budget & Tags */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-white/5">
                  <div className="flex items-center gap-2 font-mono text-slate-300 text-[11px]">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ejecutado: {formatCLP(project.spentCLP)} / {formatCLP(project.budgetCLP)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {project.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-400 border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Modal for Editing/Creating Project RD */}
      {isModalOpen && modalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12141a]">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#38bdf8]" />
                <h3 className="text-base font-semibold text-white">
                  {modalProject.title ? `Editar: ${modalProject.title}` : 'Nuevo Proyecto I+D'}
                </h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setModalProject(null); }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Título del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalProject.title || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej. Interfaces Sonoras Biométricas"
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    value={modalProject.code || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ej. ID-05"
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Fase Actual
                  </label>
                  <input
                    type="text"
                    value={modalProject.phase || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, phase: e.target.value }))}
                    placeholder="Ej. Prototipado Técnico & Muestreo"
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Líder de Investigación / Responsable
                  </label>
                  <input
                    type="text"
                    value={modalProject.teamLead || ''}
                    onChange={(e) => setModalProject(prev => ({ ...prev, teamLead: e.target.value }))}
                    placeholder="Ej. Antonia Fernández"
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Descripción del Proyecto & Objetivos
                </label>
                <textarea
                  rows={3}
                  value={modalProject.description || ''}
                  onChange={(e) => setModalProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalla el alcance de la investigación y su aplicación a la escena viva..."
                  className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Próximo Hito Clave
                </label>
                <input
                  type="text"
                  value={modalProject.milestoneUpcoming || ''}
                  onChange={(e) => setModalProject(prev => ({ ...prev, milestoneUpcoming: e.target.value }))}
                  placeholder="Ej. Residencia técnica de 5 días en Sala A1 GAM"
                  className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Avance (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={modalProject.progress ?? 0}
                    onChange={(e) => setModalProject(prev => ({ ...prev, progress: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Presupuesto Asignado ($ CLP)
                  </label>
                  <input
                    type="number"
                    value={modalProject.budgetCLP ?? 0}
                    onChange={(e) => setModalProject(prev => ({ ...prev, budgetCLP: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Gasto Ejecutado ($ CLP)
                  </label>
                  <input
                    type="number"
                    value={modalProject.spentCLP ?? 0}
                    onChange={(e) => setModalProject(prev => ({ ...prev, spentCLP: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Etiquetas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={Array.isArray(modalProject.tags) ? modalProject.tags.join(', ') : (modalProject.tags || '')}
                  onChange={(e) => setModalProject(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="Ej. Audio Inmersivo, Sensorica, FONDART"
                  className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                {modalProject.id && projects.some(p => p.id === modalProject.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar definitivamente este proyecto?`)) {
                        onDeleteProject(modalProject.id!);
                        setIsModalOpen(false);
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Proyecto</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setModalProject(null); }}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-[#0f1115] bg-[#38bdf8] hover:bg-[#38bdf8]/90 rounded-lg transition-colors shadow cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Proyecto</span>
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

