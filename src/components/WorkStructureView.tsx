import React, { useState, useRef } from 'react';
import { 
  Project, 
  Stage, 
  Substage, 
  TaskItem, 
  ExpenseItem, 
  ExpenseCategory, 
  ExpenseFundingSource 
} from '../types/project';
import { formatCLP } from '../utils/calculations';
import { 
  FolderKanban, 
  CalendarRange, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Star, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  MoreVertical,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Copy,
  Layers,
  Sparkles,
  Filter,
  Check,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface WorkStructureViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToMainData?: () => void;
  onNavigateToEconomicModel?: () => void;
  onNavigateToSummary?: () => void;
}

type StageViewFilter = 'all' | 'tasks' | 'expenses' | 'summary';

export const WorkStructureView: React.FC<WorkStructureViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToMainData,
  onNavigateToEconomicModel,
  onNavigateToSummary
}) => {
  const [viewMode, setViewMode] = useState<'horizontal_board' | 'gantt'>('horizontal_board');
  const boardScrollRef = useRef<HTMLDivElement>(null);

  // Dropdown states per stage
  const [activeActionMenuStageId, setActiveActionMenuStageId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<Record<string, StageViewFilter>>({});
  const [collapsedSubstages, setCollapsedSubstages] = useState<Record<string, boolean>>({});

  // Inline forms
  const [addingSubstageToStageId, setAddingSubstageToStageId] = useState<string | null>(null);
  const [newSubstageName, setNewSubstageName] = useState('');
  const [newSubstageDesc, setNewSubstageDesc] = useState('');

  const [addingTaskToSubstageId, setAddingTaskToSubstageId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRole, setNewTaskRole] = useState('');
  const [newTaskIsMilestone, setNewTaskIsMilestone] = useState(false);

  const [addingExpenseToSubstageId, setAddingExpenseToSubstageId] = useState<string | null>(null);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('produccion');
  const [newExpenseCost, setNewExpenseCost] = useState<number>(250000);
  const [newExpenseQty, setNewExpenseQty] = useState<number>(1);
  const [newExpenseSource, setNewExpenseSource] = useState<ExpenseFundingSource>('fondo_solicitado');
  const [newExpenseProvider, setNewExpenseProvider] = useState('');

  // Horizontal scroll helpers
  const scrollBoard = (direction: 'left' | 'right') => {
    if (boardScrollRef.current) {
      const scrollAmount = 460;
      boardScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToStage = (stageId: string) => {
    const el = document.getElementById(`stage-column-${stageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  // Helper: mutate project stages
  const updateStages = (newStages: Stage[]) => {
    onUpdateProject({
      ...project,
      stages: newStages,
      updatedAt: new Date().toISOString()
    });
  };

  // Substage collapse toggle
  const toggleSubstageCollapse = (substageId: string) => {
    setCollapsedSubstages(prev => ({
      ...prev,
      [substageId]: !prev[substageId]
    }));
  };

  // Stage operations
  const handleAddStage = () => {
    const nextNum = project.stages.length + 1;
    const lastStage = project.stages[project.stages.length - 1];
    const startWeek = lastStage ? lastStage.startWeek + lastStage.durationWeeks : 1;
    
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      code: `ET-0${nextNum}`,
      name: `Etapa ${nextNum}: Nueva Fase de Producción`,
      durationWeeks: 4,
      startWeek: startWeek,
      status: 'pendiente',
      objective: 'Objetivo y entregables clave de esta etapa de trabajo.',
      substages: [
        {
          id: `sub-${Date.now()}-1`,
          name: 'Apartado Operativo Inicial',
          description: 'Definición de primeras acciones e implementos',
          tasks: [
            { id: `t-${Date.now()}`, title: 'Planificación detallada de entregables', role: 'Producción', completed: false, milestone: true }
          ],
          expenses: [
            {
              id: `exp-${Date.now()}`,
              name: 'Honorarios de Coordinación de Etapa',
              category: 'honorarios',
              unitCostCLP: 600000,
              quantity: 1,
              totalCLP: 600000,
              fundingSource: 'fondo_solicitado',
              providerOrRole: 'Coordinador de Fase'
            }
          ]
        }
      ]
    };

    updateStages([...project.stages, newStage]);
  };

  const handleDeleteStage = (stageId: string) => {
    if (project.stages.length <= 1) {
      alert('El proyecto debe mantener al menos una etapa de trabajo.');
      return;
    }
    if (confirm('¿Eliminar esta etapa y todos sus apartados, tareas y gastos?')) {
      updateStages(project.stages.filter(s => s.id !== stageId));
    }
  };

  const handleDuplicateStage = (stageId: string) => {
    const original = project.stages.find(s => s.id === stageId);
    if (!original) return;

    const lastStage = project.stages[project.stages.length - 1];
    const nextWeek = lastStage ? lastStage.startWeek + lastStage.durationWeeks : 1;
    const nextNum = project.stages.length + 1;

    const duplicated: Stage = {
      ...JSON.parse(JSON.stringify(original)),
      id: `stage-${Date.now()}`,
      code: `ET-0${nextNum}`,
      name: `${original.name} (Copia)`,
      startWeek: nextWeek,
      status: 'pendiente',
      substages: original.substages.map((sub, sIdx) => ({
        ...sub,
        id: `sub-${Date.now()}-${sIdx}`,
        tasks: sub.tasks.map((t, tIdx) => ({ ...t, id: `t-${Date.now()}-${sIdx}-${tIdx}`, completed: false })),
        expenses: sub.expenses.map((e, eIdx) => ({ ...e, id: `exp-${Date.now()}-${sIdx}-${eIdx}` }))
      }))
    };

    updateStages([...project.stages, duplicated]);
    setActiveActionMenuStageId(null);
  };

  const handleMoveStage = (stageId: string, direction: 'left' | 'right') => {
    const index = project.stages.findIndex(s => s.id === stageId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= project.stages.length) return;

    const newStages = [...project.stages];
    const [moved] = newStages.splice(index, 1);
    newStages.splice(targetIndex, 0, moved);

    // Recalculate start weeks sequentially
    let currWeek = 1;
    const resequenced = newStages.map((st, i) => {
      const updated = {
        ...st,
        code: `ET-0${i + 1}`,
        startWeek: currWeek
      };
      currWeek += st.durationWeeks;
      return updated;
    });

    updateStages(resequenced);
    setActiveActionMenuStageId(null);
  };

  const handleUpdateStageStatus = (stageId: string, newStatus: Stage['status']) => {
    const newStages = project.stages.map(s => {
      if (s.id === stageId) {
        return { ...s, status: newStatus };
      }
      return s;
    });
    updateStages(newStages);
    setActiveActionMenuStageId(null);
  };

  // Substage operations
  const handleAddSubstage = (stageId: string) => {
    if (!newSubstageName.trim()) return;
    const newSub: Substage = {
      id: `sub-${Date.now()}`,
      name: newSubstageName.trim(),
      description: newSubstageDesc.trim() || undefined,
      tasks: [],
      expenses: []
    };

    const newStages = project.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          substages: [...stage.substages, newSub]
        };
      }
      return stage;
    });

    updateStages(newStages);
    setNewSubstageName('');
    setNewSubstageDesc('');
    setAddingSubstageToStageId(null);
  };

  const handleDeleteSubstage = (stageId: string, substageId: string) => {
    if (confirm('¿Eliminar este apartado y todos sus elementos?')) {
      const newStages = project.stages.map(stage => {
        if (stage.id === stageId) {
          return {
            ...stage,
            substages: stage.substages.filter(sub => sub.id !== substageId)
          };
        }
        return stage;
      });
      updateStages(newStages);
    }
  };

  // Task operations
  const handleToggleTask = (stageId: string, substageId: string, taskId: string) => {
    const newStages = project.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          substages: stage.substages.map(sub => {
            if (sub.id === substageId) {
              return {
                ...sub,
                tasks: sub.tasks.map(task => {
                  if (task.id === taskId) {
                    return { ...task, completed: !task.completed };
                  }
                  return task;
                })
              };
            }
            return sub;
          })
        };
      }
      return stage;
    });
    updateStages(newStages);
  };

  const handleAddTask = (stageId: string, substageId: string) => {
    if (!newTaskTitle.trim()) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      role: newTaskRole.trim() || 'Equipo de Proyecto',
      completed: false,
      milestone: newTaskIsMilestone
    };

    const newStages = project.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          substages: stage.substages.map(sub => {
            if (sub.id === substageId) {
              return {
                ...sub,
                tasks: [...sub.tasks, newTask]
              };
            }
            return sub;
          })
        };
      }
      return stage;
    });

    updateStages(newStages);
    setNewTaskTitle('');
    setNewTaskRole('');
    setNewTaskIsMilestone(false);
    setAddingTaskToSubstageId(null);
  };

  const handleDeleteTask = (stageId: string, substageId: string, taskId: string) => {
    const newStages = project.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          substages: stage.substages.map(sub => {
            if (sub.id === substageId) {
              return {
                ...sub,
                tasks: sub.tasks.filter(t => t.id !== taskId)
              };
            }
            return sub;
          })
        };
      }
      return stage;
    });
    updateStages(newStages);
  };

  // Expense operations
  const handleAddExpense = (stageId: string, substageId: string) => {
    if (!newExpenseName.trim()) return;
    const cost = Math.max(0, newExpenseCost);
    const qty = Math.max(1, newExpenseQty);
    const total = cost * qty;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      name: newExpenseName.trim(),
      category: newExpenseCategory,
      unitCostCLP: cost,
      quantity: qty,
      totalCLP: total,
      fundingSource: newExpenseSource,
      providerOrRole: newExpenseProvider.trim() || 'Por definir'
    };

    const newStages = project.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          substages: stage.substages.map(sub => {
            if (sub.id === substageId) {
              return {
                ...sub,
                expenses: [...sub.expenses, newExpense]
              };
            }
            return sub;
          })
        };
      }
      return stage;
    });

    updateStages(newStages);
    setNewExpenseName('');
    setNewExpenseCost(250000);
    setNewExpenseQty(1);
    setNewExpenseProvider('');
    setAddingExpenseToSubstageId(null);
  };

  const handleDeleteExpense = (stageId: string, substageId: string, expenseId: string) => {
    const newStages = project.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          substages: stage.substages.map(sub => {
            if (sub.id === substageId) {
              return {
                ...sub,
                expenses: sub.expenses.filter(e => e.id !== expenseId)
              };
            }
            return sub;
          })
        };
      }
      return stage;
    });
    updateStages(newStages);
  };

  // Metrics
  const totalProjectExpenses = project.stages.reduce((acc, stage) => {
    return acc + stage.substages.reduce((sAcc, sub) => {
      return sAcc + sub.expenses.reduce((eAcc, exp) => eAcc + exp.totalCLP, 0);
    }, 0);
  }, 0);

  const totalTasksCount = project.stages.reduce((acc, stage) => {
    return acc + stage.substages.reduce((sAcc, sub) => sAcc + sub.tasks.length, 0);
  }, 0);

  const completedTasksCount = project.stages.reduce((acc, stage) => {
    return acc + stage.substages.reduce((sAcc, sub) => sAcc + sub.tasks.filter(t => t.completed).length, 0);
  }, 0);

  const totalDurationWeeks = project.stages.reduce((acc, s) => acc + s.durationWeeks, 0);

  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Header & Step Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              Paso 2 de 6 · Flujo de Trabajo Horizontal
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {project.stages.length} Etapas · {totalTasksCount} Tareas ({completedTasksCount} completadas) · {formatCLP(totalProjectExpenses)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
            Estructura de Etapas en Línea Horizontal
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Despliega y navega las etapas cronológicamente de izquierda a derecha. Usa los <strong>menús desplegables</strong> de cada etapa para filtrar vistas, añadir tareas o gastos y gestionar sus apartados.
          </p>
        </div>

        {/* Action buttons & View toggles */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigateToMainData && (
            <button
              onClick={onNavigateToMainData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Datos Principales</span>
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold">
            <button
              onClick={() => setViewMode('horizontal_board')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'horizontal_board'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Tablero Horizontal
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'gantt'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Cronograma Gantt
            </button>
          </div>

          <button
            onClick={handleAddStage}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Etapa</span>
          </button>

          {onNavigateToSummary && (
            <button
              id="btn-stage-to-consolidated"
              onClick={onNavigateToSummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/80 shadow-xs transition-all cursor-pointer"
              title="Ir a la pantalla de resumen consolidado de etapas"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver Consolidado</span>
            </button>
          )}

          {onNavigateToEconomicModel && (
            <button
              onClick={onNavigateToEconomicModel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 shadow-xs transition-all cursor-pointer"
            >
              <span>Modelo Económico →</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Horizontal Timeline Stepper & Scroll Controls */}
      <div className="bg-stone-100/70 dark:bg-stone-900/60 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Horizontal Mini-Timeline Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar flex-1">
          {project.stages.map((stage, idx) => {
            const stageCost = stage.substages.reduce(
              (acc, sub) => acc + sub.expenses.reduce((eAcc, e) => eAcc + e.totalCLP, 0),
              0
            );
            return (
              <button
                key={stage.id}
                onClick={() => scrollToStage(stage.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-left hover:border-amber-500 transition-all shrink-0 cursor-pointer group"
              >
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  {idx + 1}
                </span>
                <div>
                  <div className="text-[11px] font-bold text-stone-900 dark:text-stone-100 truncate max-w-[140px]">
                    {stage.code}: {stage.name}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">
                    Sem {stage.startWeek}-{stage.startWeek + stage.durationWeeks - 1} · {formatCLP(stageCost)}
                  </div>
                </div>
                {idx < project.stages.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scroll board arrows */}
        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
          <span className="text-[11px] text-stone-500 mr-1 hidden sm:inline">Desplazar etapas:</span>
          <button
            onClick={() => scrollBoard('left')}
            className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-700 cursor-pointer shadow-2xs"
            title="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollBoard('right')}
            className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-700 cursor-pointer shadow-2xs"
            title="Desplazar a la derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. MAIN WORK AREA: Horizontal Board OR Gantt */}
      {viewMode === 'horizontal_board' ? (
        <div 
          ref={boardScrollRef}
          className="flex flex-row overflow-x-auto gap-6 pb-8 pt-2 items-start scroll-smooth snap-x select-text"
          style={{ minHeight: '620px' }}
        >
          {project.stages.map((stage, sIdx) => {
            const stageTotal = stage.substages.reduce(
              (acc, sub) => acc + sub.expenses.reduce((eAcc, exp) => eAcc + exp.totalCLP, 0),
              0
            );
            const totalTasks = stage.substages.reduce((acc, sub) => acc + sub.tasks.length, 0);
            const completedTasks = stage.substages.reduce((acc, sub) => acc + sub.tasks.filter(t => t.completed).length, 0);
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const currentFilter = stageFilter[stage.id] || 'all';
            const isMenuOpen = activeActionMenuStageId === stage.id;

            return (
              <div
                id={`stage-column-${stage.id}`}
                key={stage.id}
                className="w-[380px] sm:w-[440px] shrink-0 snap-start flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-all overflow-visible relative"
              >
                {/* STAGE HEADER */}
                <div className="p-4 sm:p-5 bg-gradient-to-b from-stone-50/90 to-stone-50/40 dark:from-stone-800/60 dark:to-stone-900 border-b border-stone-200 dark:border-stone-800 space-y-3 rounded-t-3xl">
                  
                  {/* Top line: Code, Weeks, Status and Action Menu Dropdown */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        {stage.code}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                        Sem {stage.startWeek} a {stage.startWeek + stage.durationWeeks - 1} ({stage.durationWeeks} sem)
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        stage.status === 'completada'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : stage.status === 'en_progreso'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}>
                        {stage.status === 'completada' ? 'Completada' : stage.status === 'en_progreso' ? 'En Progreso' : 'Pendiente'}
                      </span>
                    </div>

                    {/* ACTIONS DROPDOWN BUTTON */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveActionMenuStageId(isMenuOpen ? null : stage.id)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1"
                        title="Menú de acciones de la etapa"
                      >
                        <span className="text-xs font-semibold hidden sm:inline">Menú</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* FLOATING ACTION DROPDOWN MENU */}
                      {isMenuOpen && (
                        <div 
                          className="absolute right-0 top-8 z-30 w-56 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl py-2 text-xs animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-stone-400 border-b border-stone-100 dark:border-stone-700">
                            Cambiar Estado
                          </div>
                          <button
                            onClick={() => handleUpdateStageStatus(stage.id, 'en_progreso')}
                            className="w-full px-3 py-1.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-200 flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Marcar En Progreso</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStageStatus(stage.id, 'completada')}
                            className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-stone-700 dark:text-stone-200 flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Marcar Completada</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStageStatus(stage.id, 'pendiente')}
                            className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-stone-400" />
                            <span>Marcar Pendiente</span>
                          </button>

                          <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-stone-400 border-t border-b border-stone-100 dark:border-stone-700 mt-1">
                            Acciones de Estructura
                          </div>
                          <button
                            onClick={() => {
                              setAddingSubstageToStageId(stage.id);
                              setActiveActionMenuStageId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            <span>+ Añadir Apartado</span>
                          </button>
                          <button
                            onClick={() => handleDuplicateStage(stage.id)}
                            className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-stone-400" />
                            <span>Duplicar Etapa</span>
                          </button>

                          <div className="flex items-center gap-1 px-3 py-1 border-t border-stone-100 dark:border-stone-700">
                            {sIdx > 0 && (
                              <button
                                onClick={() => handleMoveStage(stage.id, 'left')}
                                className="flex-1 py-1 text-center bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 rounded text-[11px] font-medium cursor-pointer"
                              >
                                ← Mover Izq
                              </button>
                            )}
                            {sIdx < project.stages.length - 1 && (
                              <button
                                onClick={() => handleMoveStage(stage.id, 'right')}
                                className="flex-1 py-1 text-center bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 rounded text-[11px] font-medium cursor-pointer"
                              >
                                Mover Der →
                              </button>
                            )}
                          </div>

                          <div className="border-t border-stone-100 dark:border-stone-700 pt-1 mt-1">
                            <button
                              onClick={() => {
                                setActiveActionMenuStageId(null);
                                handleDeleteStage(stage.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar Etapa</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stage Name & Objective */}
                  <div>
                    <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 leading-snug">
                      {stage.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {stage.objective}
                    </p>
                  </div>

                  {/* Stage Metrics & Progress */}
                  <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Presupuesto Etapa</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100 font-display text-sm">
                        {formatCLP(stageTotal)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Progreso Tareas</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {completedTasks}/{totalTasks} ({progressPct}%)
                      </span>
                    </div>
                  </div>

                  {/* VIEW FILTER DROPDOWN: Filter between tasks, expenses, or both */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-stone-400" />
                      <span>Filtro visual:</span>
                    </span>
                    <select
                      value={currentFilter}
                      onChange={(e) => setStageFilter(prev => ({ ...prev, [stage.id]: e.target.value as StageViewFilter }))}
                      className="text-xs bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="all">Ver Todo (Tareas + Gastos)</option>
                      <option value="tasks">Solo Tareas & Hitos</option>
                      <option value="expenses">Solo Gastos & Presupuesto</option>
                      <option value="summary">Solo Resumen de Apartados</option>
                    </select>
                  </div>

                </div>

                {/* STAGE BODY: Substages list */}
                <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[600px]">
                  
                  {/* Inline Form to Add Substage */}
                  {addingSubstageToStageId === stage.id && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-stone-800 border border-amber-300 dark:border-stone-700 space-y-2 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                        <span>Nuevo Apartado / Subetapa</span>
                        <button
                          onClick={() => setAddingSubstageToStageId(null)}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nombre del apartado (ej: Dramaturgia, Ensayos, Montaje)..."
                        value={newSubstageName}
                        onChange={(e) => setNewSubstageName(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                      />
                      <input
                        type="text"
                        placeholder="Descripción u objetivo breve (opcional)..."
                        value={newSubstageDesc}
                        onChange={(e) => setNewSubstageDesc(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setAddingSubstageToStageId(null)}
                          className="text-xs px-2.5 py-1 text-stone-500 hover:text-stone-700 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAddSubstage(stage.id)}
                          className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                        >
                          Guardar Apartado
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Substages */}
                  {stage.substages.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-400">
                      No hay apartados en esta etapa. Haz clic abajo para agregar uno.
                    </div>
                  ) : (
                    stage.substages.map((substage) => {
                      const isSubstageCollapsed = collapsedSubstages[substage.id] || false;
                      const subCost = substage.expenses.reduce((acc, exp) => acc + exp.totalCLP, 0);
                      const subTasksDone = substage.tasks.filter(t => t.completed).length;

                      return (
                        <div
                          key={substage.id}
                          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 p-3.5 space-y-3 transition-all"
                        >
                          {/* Substage Accordion Header */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => toggleSubstageCollapse(substage.id)}
                              className="flex items-start gap-2 text-left cursor-pointer flex-1 group"
                            >
                              <div className="mt-0.5 p-0.5 rounded text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200 transition-colors">
                                {isSubstageCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                                  {substage.name}
                                </h4>
                                {substage.description && (
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                                    {substage.description}
                                  </p>
                                )}
                              </div>
                            </button>

                            {/* Substage Badges & Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                                {subTasksDone}/{substage.tasks.length} tareas
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                {formatCLP(subCost)}
                              </span>
                              <button
                                onClick={() => handleDeleteSubstage(stage.id, substage.id)}
                                title="Eliminar apartado"
                                className="p-1 text-stone-300 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Substage Expanded Details */}
                          {!isSubstageCollapsed && (
                            <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 space-y-3">
                              
                              {/* 1. TASKS SECTION (if not filtered out) */}
                              {(currentFilter === 'all' || currentFilter === 'tasks') && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                                    <span className="flex items-center gap-1 text-[11px]">
                                      <CheckSquare className="w-3 h-3 text-emerald-600" />
                                      <span>Tareas Clave & Hitos ({substage.tasks.length})</span>
                                    </span>
                                    <button
                                      onClick={() => setAddingTaskToSubstageId(substage.id)}
                                      className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                                    >
                                      + Tarea
                                    </button>
                                  </div>

                                  {/* Inline Add Task Form */}
                                  {addingTaskToSubstageId === substage.id && (
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                                      <input
                                        type="text"
                                        placeholder="Descripción de la tarea..."
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        className="w-full text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                      />
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          placeholder="Rol o responsable (ej: Productor, Elenco)..."
                                          value={newTaskRole}
                                          onChange={(e) => setNewTaskRole(e.target.value)}
                                          className="flex-1 text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                        />
                                        <label className="flex items-center gap-1 text-[10px] text-stone-600 dark:text-stone-300 cursor-pointer shrink-0">
                                          <input
                                            type="checkbox"
                                            checked={newTaskIsMilestone}
                                            onChange={(e) => setNewTaskIsMilestone(e.target.checked)}
                                            className="rounded text-amber-600"
                                          />
                                          <span>Hito Crítico</span>
                                        </label>
                                      </div>
                                      <div className="flex justify-end gap-1.5 pt-1">
                                        <button
                                          onClick={() => setAddingTaskToSubstageId(null)}
                                          className="text-xs px-2 py-0.5 text-stone-500 cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleAddTask(stage.id, substage.id)}
                                          className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer"
                                        >
                                          Guardar Tarea
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Task List */}
                                  <div className="space-y-1.5">
                                    {substage.tasks.length === 0 ? (
                                      <p className="text-[11px] text-stone-400 italic py-1">Sin tareas asignadas aún.</p>
                                    ) : (
                                      substage.tasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className={`flex items-start justify-between gap-2 p-2 rounded-xl text-xs transition-colors ${
                                            task.completed
                                              ? 'bg-stone-100/50 dark:bg-stone-800/30 text-stone-400 dark:text-stone-500 line-through'
                                              : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/60 dark:border-stone-700/60'
                                          }`}
                                        >
                                          <div className="flex items-start gap-2 min-w-0 flex-1">
                                            <button
                                              onClick={() => handleToggleTask(stage.id, substage.id, task.id)}
                                              className="mt-0.5 text-stone-400 hover:text-amber-600 cursor-pointer shrink-0"
                                            >
                                              {task.completed ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                              ) : (
                                                <Square className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium text-[11px]">{task.title}</span>
                                                {task.milestone && (
                                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                                    Hito
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-[10px] text-stone-400 block">{task.role}</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteTask(stage.id, substage.id, task.id)}
                                            className="text-stone-300 hover:text-rose-500 cursor-pointer p-0.5 shrink-0"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 2. EXPENSES SECTION (if not filtered out) */}
                              {(currentFilter === 'all' || currentFilter === 'expenses') && (
                                <div className="space-y-2 pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                                    <span className="flex items-center gap-1 text-[11px]">
                                      <DollarSign className="w-3 h-3 text-amber-600" />
                                      <span>Insumos & Presupuesto ({substage.expenses.length})</span>
                                    </span>
                                    <button
                                      onClick={() => setAddingExpenseToSubstageId(substage.id)}
                                      className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                                    >
                                      + Gasto
                                    </button>
                                  </div>

                                  {/* Inline Add Expense Form */}
                                  {addingExpenseToSubstageId === substage.id && (
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                                      <input
                                        type="text"
                                        placeholder="Nombre del gasto o insumo..."
                                        value={newExpenseName}
                                        onChange={(e) => setNewExpenseName(e.target.value)}
                                        className="w-full text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[9px] text-stone-500 uppercase font-bold">Costo Unitario CLP</label>
                                          <input
                                            type="number"
                                            value={newExpenseCost}
                                            onChange={(e) => setNewExpenseCost(Number(e.target.value))}
                                            className="w-full text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] text-stone-500 uppercase font-bold">Cantidad</label>
                                          <input
                                            type="number"
                                            min={1}
                                            value={newExpenseQty}
                                            onChange={(e) => setNewExpenseQty(Number(e.target.value))}
                                            className="w-full text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <select
                                          value={newExpenseCategory}
                                          onChange={(e) => setNewExpenseCategory(e.target.value as ExpenseCategory)}
                                          className="text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                        >
                                          <option value="honorarios">Honorarios</option>
                                          <option value="produccion">Producción</option>
                                          <option value="difusion">Difusión</option>
                                          <option value="logistica_traslados">Logística / Traslados</option>
                                          <option value="administracion">Administración</option>
                                        </select>

                                        <select
                                          value={newExpenseSource}
                                          onChange={(e) => setNewExpenseSource(e.target.value as ExpenseFundingSource)}
                                          className="text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                                        >
                                          <option value="fondo_solicitado">Fondo Solicitado</option>
                                          <option value="cofinanciamiento_pecuniario">Cofinanciamiento Pecuniario</option>
                                          <option value="cofinanciamiento_valorado">Cofinanciamiento Valorado</option>
                                          <option value="taquilla">Taquilla Estimada</option>
                                        </select>
                                      </div>

                                      <div className="flex justify-end gap-1.5 pt-1">
                                        <button
                                          onClick={() => setAddingExpenseToSubstageId(null)}
                                          className="text-xs px-2 py-0.5 text-stone-500 cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleAddExpense(stage.id, substage.id)}
                                          className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer"
                                        >
                                          Guardar Gasto
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Expense Items List */}
                                  <div className="space-y-1.5">
                                    {substage.expenses.length === 0 ? (
                                      <p className="text-[11px] text-stone-400 italic py-1">Sin gastos en este apartado.</p>
                                    ) : (
                                      substage.expenses.map((exp) => (
                                        <div
                                          key={exp.id}
                                          className="flex items-center justify-between gap-2 p-2 rounded-xl text-xs bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="font-medium text-[11px] text-stone-800 dark:text-stone-200 truncate">
                                              {exp.name}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                                              <span className="capitalize">{exp.category}</span>
                                              <span>·</span>
                                              <span>{exp.quantity}x {formatCLP(exp.unitCostCLP)}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-bold font-mono text-[11px] text-stone-900 dark:text-stone-100">
                                              {formatCLP(exp.totalCLP)}
                                            </span>
                                            <button
                                              onClick={() => handleDeleteExpense(stage.id, substage.id, exp.id)}
                                              className="text-stone-300 hover:text-rose-500 cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    })
                  )}

                  {/* Add Substage button at the bottom of the column */}
                  <button
                    onClick={() => setAddingSubstageToStageId(stage.id)}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Apartado / Subetapa</span>
                  </button>

                </div>
              </div>
            );
          })}

          {/* ADD NEW STAGE CARD (HORIZONTAL END OF BOARD) */}
          <div className="w-[300px] sm:w-[340px] shrink-0 snap-start flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 bg-stone-50/40 dark:bg-stone-900/40 transition-all text-center space-y-3 min-h-[500px]">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100">
                Añadir Nueva Etapa
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-[240px]">
                Crea una nueva fase con apartados, tareas y estimación de presupuesto.
              </p>
            </div>
            <button
              onClick={handleAddStage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Etapa {project.stages.length + 1}</span>
            </button>
          </div>

        </div>
      ) : (
        /* GANTT VIEW (Alternative toggle) */
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm overflow-x-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100">
                Cronograma Gantt de Semanas
              </h3>
              <p className="text-xs text-stone-500">
                Visualización longitudinal de las {totalDurationWeeks} semanas de ejecución del proyecto
              </p>
            </div>
            <button
              onClick={() => setViewMode('horizontal_board')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              ← Volver al Tablero Horizontal
            </button>
          </div>

          {/* Weeks timeline header */}
          <div className="min-w-[700px] space-y-4">
            <div className="grid grid-cols-12 gap-1 text-center text-[10px] font-bold text-stone-400 uppercase tracking-wider pb-2 border-b border-stone-100 dark:border-stone-800">
              {Array.from({ length: Math.min(24, Math.max(12, totalDurationWeeks)) }).map((_, i) => (
                <div key={i} className="py-1 bg-stone-50 dark:bg-stone-800 rounded">
                  Sem {i + 1}
                </div>
              ))}
            </div>

            {/* Stages bars */}
            <div className="space-y-3">
              {project.stages.map((stage) => {
                const maxWeeks = Math.max(12, totalDurationWeeks);
                const leftPct = ((stage.startWeek - 1) / maxWeeks) * 100;
                const widthPct = (stage.durationWeeks / maxWeeks) * 100;

                return (
                  <div key={stage.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {stage.code}: {stage.name}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Semana {stage.startWeek} a {stage.startWeek + stage.durationWeeks - 1}
                      </span>
                    </div>

                    <div className="h-7 w-full bg-stone-100 dark:bg-stone-800 rounded-xl relative overflow-hidden">
                      <div
                        className="h-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center px-3 text-xs font-bold shadow-xs transition-all"
                        style={{
                          marginLeft: `${leftPct}%`,
                          width: `${Math.max(10, widthPct)}%`
                        }}
                      >
                        <span className="truncate">{stage.code} ({stage.durationWeeks}s)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Navigation Banner */}
      <div className="bg-stone-100 dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Las modificaciones en las etapas se guardan automáticamente en tu proyecto activo y sincronizan el modelo económico y el Canvas.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onNavigateToMainData && (
            <button
              onClick={onNavigateToMainData}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              ← Aspectos Principales
            </button>
          )}

          {onNavigateToEconomicModel && (
            <button
              id="btn-goto-economic-model"
              onClick={onNavigateToEconomicModel}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
            >
              <span>Continuar a Modelo Económico</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
