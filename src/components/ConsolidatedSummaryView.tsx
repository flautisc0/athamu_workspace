import React, { useState } from 'react';
import { Project, Stage } from '../types/project';
import { FinancialSummary } from '../utils/calculations';
import { formatCLP } from '../utils/calculations';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  Coins, 
  Calendar, 
  Flag, 
  Layers, 
  Users, 
  ArrowLeft, 
  Share2, 
  Printer, 
  Building2, 
  Sparkles, 
  BarChart3, 
  Target,
  FileCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface ConsolidatedSummaryViewProps {
  project: Project;
  finances: FinancialSummary;
  onNavigateToWorkStructure: () => void;
  onOpenCrmSync: () => void;
}

export const ConsolidatedSummaryView: React.FC<ConsolidatedSummaryViewProps> = ({
  project,
  finances,
  onNavigateToWorkStructure,
  onOpenCrmSync
}) => {
  const [activeSection, setActiveSection] = useState<'matriz' | 'financiero' | 'hitos' | 'equipo'>('matriz');

  // Calculations for consolidated stages
  let totalTasks = 0;
  let completedTasks = 0;
  let totalMilestones = 0;
  let completedMilestones = 0;

  // Role assignments consolidation
  const roleMap: Record<string, { tasksCount: number; milestonesCount: number; sampleTasks: string[] }> = {};

  // Stage metrics breakdown
  const stageSummaries = project.stages.map((stage) => {
    let sTasks = 0;
    let sCompleted = 0;
    let sMilestones = 0;
    let sExpensesCLP = 0;
    const categoryTotals: Record<string, number> = {};

    stage.substages.forEach((sub) => {
      sub.tasks.forEach((task) => {
        sTasks++;
        totalTasks++;
        if (task.completed) {
          sCompleted++;
          completedTasks++;
        }
        if (task.milestone) {
          sMilestones++;
          totalMilestones++;
          if (task.completed) completedMilestones++;
        }

        // Roles consolidation
        const roleKey = task.role || 'Sin Rol Asignado';
        if (!roleMap[roleKey]) {
          roleMap[roleKey] = { tasksCount: 0, milestonesCount: 0, sampleTasks: [] };
        }
        roleMap[roleKey].tasksCount++;
        if (task.milestone) roleMap[roleKey].milestonesCount++;
        if (roleMap[roleKey].sampleTasks.length < 3) {
          roleMap[roleKey].sampleTasks.push(task.title);
        }
      });

      sub.expenses.forEach((exp) => {
        sExpensesCLP += exp.totalCLP;
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.totalCLP;
      });
    });

    const progressPct = sTasks > 0 ? Math.round((sCompleted / sTasks) * 100) : 0;
    const pctOfTotalBudget = finances.directExpensesCLP > 0 
      ? Math.round((sExpensesCLP / finances.directExpensesCLP) * 100) 
      : 0;

    return {
      stage,
      tasksCount: sTasks,
      completedCount: sCompleted,
      progressPct,
      milestonesCount: sMilestones,
      expensesCLP: sExpensesCLP,
      pctOfTotalBudget,
      categoryTotals
    };
  });

  const overallProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      
      {/* Top Banner: Breadcrumb & Executive Actions */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 sticky top-16 z-20 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToWorkStructure}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              title="Volver al tablero horizontal de edición de etapas"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Editar Etapas</span>
            </button>
            <div className="h-4 w-px bg-stone-300 dark:bg-stone-700" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                  Consolidado Ejecutivo de Etapas
                </span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {project.code}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold font-display text-stone-900 dark:text-stone-100 truncate">
                {project.title}
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-print-summary"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition-colors cursor-pointer shadow-xs"
              title="Imprimir o guardar como PDF este informe consolidado"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Imprimir Ficha</span>
            </button>

            <button
              id="btn-send-crm-consolidated"
              onClick={onOpenCrmSync}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30 transition-colors cursor-pointer"
              title="Enviar este proyecto consolidado al Catálogo de Proyectos del CRM ATHAMU"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar al Catálogo CRM</span>
            </button>
          </div>

        </div>

        {/* View Segmented Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 border-t border-stone-200 dark:border-stone-800/80 overflow-x-auto py-1">
          <button
            onClick={() => setActiveSection('matriz')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'matriz'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matriz Consolidada de Etapas</span>
          </button>

          <button
            onClick={() => setActiveSection('financiero')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'financiero'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Consolidado Presupuestario</span>
          </button>

          <button
            onClick={() => setActiveSection('hitos')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'hitos'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Hitos Críticos ({totalMilestones})</span>
          </button>

          <button
            onClick={() => setActiveSection('equipo')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'equipo'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Distribución de Equipo ({Object.keys(roleMap).length} Roles)</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Project Objectives & Core Purpose Highlight */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
                  {project.discipline}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
                  {project.territory}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Estado: {project.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold font-display text-stone-900 dark:text-stone-100">
                {project.title}
              </h2>
              {project.subtitle && (
                <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                  {project.subtitle}
                </p>
              )}
              
              {/* General Objective */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5" />
                  Objetivo General Consolidado
                </span>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {project.generalObjective || project.description || 'Sin objetivo general especificado.'}
                </p>
              </div>

              {/* Specific Objectives List */}
              {project.specificObjectives && project.specificObjectives.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                    Objetivos Específicos de las Etapas ({project.specificObjectives.length})
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-400">
                    {project.specificObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Side Info: Team & Dates */}
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 border border-stone-200 dark:border-stone-800 min-w-[260px] space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">Productor / Operador Responsable</span>
                <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                  {project.operator?.name || project.leadProducer}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">Dirección Artística</span>
                <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                  {project.artisticDirector}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">Calendario Total</span>
                <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                  {project.durationWeeks} semanas ({project.startDate} al {project.endDate})
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">Arquetipo Estratégico</span>
                <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5 capitalize">
                  {project.valueArchetype?.type?.replace('_', ' ') || 'Cadena lineal'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          
          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium">Etapas Definidas</span>
              <FolderKanban className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
              {project.stages.length}
            </p>
            <span className="text-[11px] text-stone-500">
              {project.durationWeeks} semanas globales
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium">Avance de Tareas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
              {overallProgressPct}%
            </p>
            <span className="text-[11px] text-stone-500">
              {completedTasks} de {totalTasks} tareas listas
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium">Hitos Críticos</span>
              <Flag className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
              {totalMilestones}
            </p>
            <span className="text-[11px] text-stone-500">
              {completedMilestones} hitos cumplidos
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium">Gastos Directos</span>
              <Coins className="w-4 h-4 text-stone-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-display text-stone-900 dark:text-stone-100 truncate">
              {formatCLP(finances.directExpensesCLP)}
            </p>
            <span className="text-[11px] text-stone-500">
              Suma de etapas de trabajo
            </span>
          </div>

          <div className="bg-amber-600 text-white p-4 rounded-xl shadow-md shadow-amber-600/20 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-amber-200 mb-1">
              <span className="text-xs font-medium">Presupuesto Total</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-display truncate">
              {formatCLP(finances.totalBudgetCLP)}
            </p>
            <span className="text-[11px] text-amber-100">
              Incluye 5% imprevistos ({formatCLP(finances.contingencyCLP)})
            </span>
          </div>

        </div>

        {/* SECTION 1: MATRIZ CONSOLIDADA DE ETAPAS */}
        {activeSection === 'matriz' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100">
                  Desglose Consolidado por Etapa
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Síntesis del alcance de objetivos, duración, presupuesto asignado y entregables de cada etapa de trabajo.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {stageSummaries.map(({ stage, tasksCount, completedCount, progressPct, milestonesCount, expensesCLP, pctOfTotalBudget }) => {
                return (
                  <div 
                    key={stage.id} 
                    className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs hover:border-amber-400/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800/80 pb-4">
                      
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-300 dark:border-amber-800">
                          {stage.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                              {stage.name}
                            </h4>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              stage.status === 'completada'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : stage.status === 'en_progreso'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400'
                            }`}>
                              {stage.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {stage.objective || 'Sin objetivo formulado'}
                          </p>
                        </div>
                      </div>

                      {/* Stage quick stats */}
                      <div className="flex items-center gap-4 sm:gap-6 text-xs shrink-0">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400">Duración</span>
                          <p className="font-semibold text-stone-800 dark:text-stone-200">
                            {stage.durationWeeks} sem. (Sem {stage.startWeek})
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400">Presupuesto</span>
                          <p className="font-semibold text-stone-800 dark:text-stone-200">
                            {formatCLP(expensesCLP)} <span className="text-stone-400">({pctOfTotalBudget}%)</span>
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400">Avance</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-16 bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-600 h-full rounded-full" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="font-bold text-stone-700 dark:text-stone-300">{progressPct}%</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Stage details: Subetapas, apartados & hitos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                      
                      {/* Apartados & Subetapas */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Apartados / Subetapas ({stage.substages.length})
                        </span>
                        <div className="space-y-1">
                          {stage.substages.map((sub) => (
                            <div key={sub.id} className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800/60">
                              <span className="font-semibold text-stone-800 dark:text-stone-200">{sub.name}</span>
                              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
                                <span>{sub.tasks.length} tareas</span>
                                <span>{sub.expenses.length} gastos ({formatCLP(sub.expenses.reduce((s, e) => s + e.totalCLP, 0))})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tareas Clave */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Tareas Clave ({tasksCount})
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {stage.substages.flatMap(sub => sub.tasks).slice(0, 5).map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-1.5 rounded-md bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800/60 text-[11px]">
                              <span className={`truncate mr-2 ${t.completed ? 'line-through text-stone-400' : 'text-stone-700 dark:text-stone-300'}`}>
                                {t.title}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 shrink-0">
                                {t.role || 'Rol'}
                              </span>
                            </div>
                          ))}
                          {stage.substages.flatMap(sub => sub.tasks).length > 5 && (
                            <p className="text-[10px] text-stone-400 text-center">
                              +{stage.substages.flatMap(sub => sub.tasks).length - 5} tareas adicionales
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Hitos y Gastos Clave */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Hitos & Principales Ítems
                        </span>
                        <div className="space-y-1">
                          {stage.substages.flatMap(s => s.tasks.filter(t => t.milestone)).map(m => (
                            <div key={m.id} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] flex items-center gap-1.5">
                              <Flag className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="font-medium text-amber-900 dark:text-amber-200 truncate">{m.title}</span>
                            </div>
                          ))}
                          {stage.substages.flatMap(s => s.tasks.filter(t => t.milestone)).length === 0 && (
                            <p className="text-stone-400 text-[11px] italic">Sin hitos críticos asignados en esta etapa.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: CONSOLIDADO PRESUPUESTARIO */}
        {activeSection === 'financiero' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100">
                Consolidado Presupuestario por Etapa y Categoría
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Matriz consolidada de costos según categorías del tabulador cultural chileno.
              </p>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 uppercase tracking-wider font-bold text-[10px] border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="p-3.5">Etapa</th>
                      <th className="p-3.5">Honorarios</th>
                      <th className="p-3.5">Técnica / Equipos</th>
                      <th className="p-3.5">Producción</th>
                      <th className="p-3.5">Difusión</th>
                      <th className="p-3.5">Espacios / Salas</th>
                      <th className="p-3.5">Logística</th>
                      <th className="p-3.5 text-right">Subtotal Etapa</th>
                      <th className="p-3.5 text-right">% Directos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {stageSummaries.map(({ stage, expensesCLP, categoryTotals, pctOfTotalBudget }) => (
                      <tr key={stage.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100">
                          {stage.code}: {stage.name}
                        </td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-400">
                          {formatCLP(categoryTotals['honorarios'] || 0)}
                        </td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-400">
                          {formatCLP(categoryTotals['tecnica_equipos'] || 0)}
                        </td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-400">
                          {formatCLP(categoryTotals['produccion'] || 0)}
                        </td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-400">
                          {formatCLP(categoryTotals['difusion_marketing'] || 0)}
                        </td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-400">
                          {formatCLP(categoryTotals['espacios_salas'] || 0)}
                        </td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-400">
                          {formatCLP(categoryTotals['logistica_traslados'] || 0)}
                        </td>
                        <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100 text-right">
                          {formatCLP(expensesCLP)}
                        </td>
                        <td className="p-3.5 text-right font-medium text-stone-500">
                          {pctOfTotalBudget}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 dark:bg-stone-800/60 font-bold border-t-2 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100">
                    <tr>
                      <td className="p-3.5">TOTAL GASTOS DIRECTOS</td>
                      <td className="p-3.5">{formatCLP(finances.byCategory['honorarios'] || 0)}</td>
                      <td className="p-3.5">{formatCLP(finances.byCategory['tecnica_equipos'] || 0)}</td>
                      <td className="p-3.5">{formatCLP(finances.byCategory['produccion'] || 0)}</td>
                      <td className="p-3.5">{formatCLP(finances.byCategory['difusion_marketing'] || 0)}</td>
                      <td className="p-3.5">{formatCLP(finances.byCategory['espacios_salas'] || 0)}</td>
                      <td className="p-3.5">{formatCLP(finances.byCategory['logistica_traslados'] || 0)}</td>
                      <td className="p-3.5 text-right text-amber-700 dark:text-amber-400 text-sm">
                        {formatCLP(finances.directExpensesCLP)}
                      </td>
                      <td className="p-3.5 text-right">100%</td>
                    </tr>
                    <tr className="bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                      <td colSpan={7} className="p-3.5 text-right">
                        Reserva de Imprevistos y Contingencia (5% exigido ATHA)
                      </td>
                      <td colSpan={2} className="p-3.5 text-right font-bold text-sm">
                        + {formatCLP(finances.contingencyCLP)}
                      </td>
                    </tr>
                    <tr className="bg-amber-600 text-white text-sm">
                      <td colSpan={7} className="p-3.5 text-right font-bold">
                        PRESUPUESTO TOTAL CONSOLIDADO DEL PROYECTO
                      </td>
                      <td colSpan={2} className="p-3.5 text-right font-bold text-base">
                        {formatCLP(finances.totalBudgetCLP)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: HITOS CRÍTICOS (MILESTONES) */}
        {activeSection === 'hitos' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100">
                Consolidado de Hitos Críticos y Entregables
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Línea de compromisos que determinan la continuidad y viabilidad del proyecto ante fondos o programadores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.stages.flatMap(st => 
                st.substages.flatMap(sub => 
                  sub.tasks.filter(t => t.milestone).map(m => ({ ...m, stageName: st.name, stageCode: st.code, subName: sub.name }))
                )
              ).map((milestone, idx) => (
                <div key={idx} className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${milestone.completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'} shrink-0`}>
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        {milestone.stageCode} · {milestone.subName}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${milestone.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400'}`}>
                        {milestone.completed ? 'Cumplido' : 'Pendiente'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
                      {milestone.title}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-stone-400" />
                      Responsable: <span className="font-semibold text-stone-700 dark:text-stone-300">{milestone.role}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: DISTRIBUCIÓN DE EQUIPO Y ROLES */}
        {activeSection === 'equipo' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100">
                Consolidado de Roles y Equipo de Trabajo
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Distribución de responsabilidades identificadas en todas las etapas del proyecto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(roleMap).map(([role, data]) => (
                <div key={role} className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                      {role}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-full">
                      {data.tasksCount} tareas
                    </span>
                  </div>

                  {data.milestonesCount > 0 && (
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Flag className="w-3 h-3" />
                      Responsable de {data.milestonesCount} hito(s) crítico(s)
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-stone-500">
                    <span className="text-[10px] font-bold uppercase text-stone-400">Tareas representativas:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {data.sampleTasks.map((t, idx) => (
                        <li key={idx} className="truncate">{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
