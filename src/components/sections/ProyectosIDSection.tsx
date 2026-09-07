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
  Plus
} from 'lucide-react';

interface ProyectosIDSectionProps {
  projects: ProjectRD[];
  onUpdateProjectProgress: (projectId: string, newProgress: number) => void;
}

export const ProyectosIDSection: React.FC<ProyectosIDSectionProps> = ({
  projects,
  onUpdateProjectProgress
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(50);

  const handleStartEdit = (p: ProjectRD) => {
    setEditingProjectId(p.id);
    setTempProgress(p.progress);
  };

  const handleSaveProgress = (id: string) => {
    onUpdateProjectProgress(id, tempProgress);
    setEditingProjectId(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Section Header */}
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

      {/* Grid of R&D Projects with visible Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => {
          const isEditing = editingProjectId === project.id;
          const currentProgress = isEditing ? tempProgress : project.progress;
          const percentColor =
            currentProgress >= 80 ? 'bg-emerald-400' :
            currentProgress >= 60 ? 'bg-[#6ee7b7]' :
            currentProgress >= 40 ? 'bg-[#38bdf8]' : 'bg-[#fbbf24]';

          return (
            <div
              key={project.id}
              className="p-6 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-lg"
            >
              <div className="space-y-3">
                {/* Code & Phase */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                    {project.code}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Actualizado: {project.updatedAt}
                  </span>
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
                    {project.milestoneUpcoming}
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
                {isEditing ? (
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
                      onClick={() => handleSaveProgress(project.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-md transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingProjectId(null)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Liderado por: <span className="text-slate-200 font-medium">{project.teamLead}</span>
                    </span>
                    <button
                      onClick={() => handleStartEdit(project)}
                      className="text-[11px] text-[#38bdf8] hover:underline cursor-pointer"
                    >
                      Ajustar % avance
                    </button>
                  </div>
                )}

                {/* Budget & Tags */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono text-slate-300">
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

    </div>
  );
};
