import React, { useState } from 'react';
import { Obra, EventSchedule, Venue } from '../../types';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Filter,
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  ChevronRight,
  TrendingUp,
  Workflow,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';

export interface PlannerTask {
  id: string;
  title: string;
  obraId: string;
  obraTitle: string;
  phase: 'Pre-producción' | 'Ensayos' | 'Técnica & Montaje' | 'Gira & Temporada' | 'Desmontaje';
  startDate: string;
  endDate: string;
  venueName: string;
  responsible: string;
  progress: number;
  status: 'Planificado' | 'En curso' | 'Completado' | 'Alerta';
  priority: 'Alta' | 'Media' | 'Baja';
  notes?: string;
}

const INITIAL_PLANNER_TASKS: PlannerTask[] = [
  {
    id: 'plan-01',
    title: 'Montaje de Iluminación & Enfoque DMX',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    phase: 'Técnica & Montaje',
    startDate: '2025-04-10',
    endDate: '2025-04-12',
    venueName: 'Teatro Biobío (Concepción)',
    responsible: 'Antonia Fernández',
    progress: 80,
    status: 'En curso',
    priority: 'Alta',
    notes: 'Requiere revisión de los 4 canales dimmer y posicionamiento de varas LED.'
  },
  {
    id: 'plan-02',
    title: 'Ensayo General con Vestuario y Diseño Sonoro',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    phase: 'Ensayos',
    startDate: '2025-04-13',
    endDate: '2025-04-14',
    venueName: 'Teatro Biobío (Concepción)',
    responsible: 'Jo Schultz',
    progress: 45,
    status: 'Planificado',
    priority: 'Alta',
    notes: 'Presencia de los 5 intérpretes + operador QLab en vivo.'
  },
  {
    id: 'plan-03',
    title: 'Temporada Oficial Estreno Sur (3 Funciones)',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    phase: 'Gira & Temporada',
    startDate: '2025-04-15',
    endDate: '2025-04-17',
    venueName: 'Teatro Biobío (Concepción)',
    responsible: 'Francisco Pérez',
    progress: 10,
    status: 'Planificado',
    priority: 'Alta',
    notes: 'Coordinar registro audiovisual y conversatorio post-función.'
  },
  {
    id: 'plan-04',
    title: 'Prueba Acústica & Calibración de Sintetizadores',
    obraId: 'obra-02',
    obraTitle: 'Cordillera Eléctrica',
    phase: 'Pre-producción',
    startDate: '2025-04-20',
    endDate: '2025-04-22',
    venueName: 'Centro GAM (Sala A1)',
    responsible: 'Nicolás Ortiz',
    progress: 100,
    status: 'Completado',
    priority: 'Media',
    notes: 'Parche de software Max/MSP calibrado con la interfaz Apollo x8.'
  },
  {
    id: 'plan-05',
    title: 'Transporte y Carga de Escenografía Pesada',
    obraId: 'obra-03',
    obraTitle: 'Cuerpo Territorio',
    phase: 'Técnica & Montaje',
    startDate: '2025-05-02',
    endDate: '2025-05-03',
    venueName: 'Parque Cultural de Valparaíso',
    responsible: 'Tomás Verdugo',
    progress: 25,
    status: 'Alerta',
    priority: 'Alta',
    notes: 'Confirmar camión de 5 toneladas y permisos de carga municipal.'
  },
  {
    id: 'plan-06',
    title: 'Desmontaje Técnico & Retorno a Bodega Central',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    phase: 'Desmontaje',
    startDate: '2025-04-18',
    endDate: '2025-04-18',
    venueName: 'Teatro Biobío (Concepción)',
    responsible: 'Antonia Fernández',
    progress: 0,
    status: 'Planificado',
    priority: 'Media',
    notes: 'Empaque de luminarias móviles y cables DMX según inventario.'
  }
];

interface PlannerSectionProps {
  obras: Obra[];
  events: EventSchedule[];
  venues: Venue[];
  onNavigateSection: (sectionId: string) => void;
  theme?: 'terracota' | 'dia';
}

export const PlannerSection: React.FC<PlannerSectionProps> = ({
  obras,
  events,
  venues,
  onNavigateSection,
  theme = 'dia'
}) => {
  const isLight = theme === 'dia';

  const [tasks, setTasks] = useState<PlannerTask[]>(INITIAL_PLANNER_TASKS);
  const [selectedObraId, setSelectedObraId] = useState<string>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');

  // New task modal state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskObraId, setNewTaskObraId] = useState(obras[0]?.id || 'obra-01');
  const [newTaskPhase, setNewTaskPhase] = useState<PlannerTask['phase']>('Técnica & Montaje');
  const [newTaskStartDate, setNewTaskStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTaskEndDate, setNewTaskEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTaskVenue, setNewTaskVenue] = useState(venues[0]?.name || 'Teatro Biobío');
  const [newTaskResponsible, setNewTaskResponsible] = useState('Antonia Fernández');

  const filteredTasks = tasks.filter(task => {
    const matchesObra = selectedObraId === 'all' || task.obraId === selectedObraId;
    const matchesPhase = selectedPhase === 'all' || task.phase === selectedPhase;
    return matchesObra && matchesPhase;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const matchedObra = obras.find(o => o.id === newTaskObraId);

    const created: PlannerTask = {
      id: `plan-${Date.now()}`,
      title: newTaskTitle.trim(),
      obraId: newTaskObraId,
      obraTitle: matchedObra ? matchedObra.title : 'Producción General',
      phase: newTaskPhase,
      startDate: newTaskStartDate,
      endDate: newTaskEndDate,
      venueName: newTaskVenue,
      responsible: newTaskResponsible,
      progress: 0,
      status: 'Planificado',
      priority: 'Alta'
    };

    setTasks(prev => [created, ...prev]);
    setIsNewTaskOpen(false);
    setNewTaskTitle('');
  };

  const handleUpdateProgress = (taskId: string, newProgress: number) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const updatedStatus = newProgress === 100 ? 'Completado' : newProgress > 0 ? 'En curso' : 'Planificado';
        return { ...t, progress: newProgress, status: updatedStatus };
      })
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border transition-all ${
        isLight
          ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs'
          : 'bg-[#1C110F] border-[#3E221E] text-white shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#E05A47]">
              <span>Módulo de Operaciones</span>
              <span>•</span>
              <span>Cronograma Escénico & Giras</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-display mt-1 ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              Planner Escénico F.A.S.E
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
              isLight ? 'text-stone-600' : 'text-slate-300'
            }`}>
              Planificación integral de temporadas, ensayos técnicos, montajes DMX, funciones y desmontajes para el catálogo de obras y coordinación de salas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateSection('crm')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                isLight
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-amber-500" />
              <span>Conectar con CRM Salas</span>
            </button>

            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#C84835] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Hito de Planificación</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className={`mt-6 pt-5 border-t flex flex-wrap items-center justify-between gap-3 ${
          isLight ? 'border-stone-100' : 'border-white/5'
        }`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Filter className="w-3.5 h-3.5" />
              <span className="font-medium">Filtrar por:</span>
            </div>

            {/* Obra selector */}
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#E05A47]'
                  : 'bg-[#150D0C] border-[#3E221E] text-white focus:border-[#E05A47]'
              }`}
            >
              <option value="all">Todas las Obras ({obras.length})</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>

            {/* Phase selector */}
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-stone-50 border-stone-200 text-stone-800 focus:border-[#E05A47]'
                  : 'bg-[#150D0C] border-[#3E221E] text-white focus:border-[#E05A47]'
              }`}
            >
              <option value="all">Todas las Fases</option>
              <option value="Pre-producción">Pre-producción</option>
              <option value="Ensayos">Ensayos</option>
              <option value="Técnica & Montaje">Técnica & Montaje</option>
              <option value="Gira & Temporada">Gira & Temporada</option>
              <option value="Desmontaje">Desmontaje</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-stone-200/50 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-[#281614] text-[#E05A47] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
              }`}
            >
              Línea de Tiempo (Gantt)
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#281614] text-[#E05A47] shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
              }`}
            >
              Tarjetas Detalladas ({filteredTasks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Timeline vs Grid */}
      {viewMode === 'timeline' ? (
        <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
          isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#1C110F] border-[#3E221E] shadow-md'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <CalendarDays className="w-4 h-4 text-[#E05A47]" />
              <span>Línea Temporal de Hitos Operativos</span>
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              {filteredTasks.length} hitos activos
            </span>
          </div>

          {/* Timeline Bars */}
          <div className="space-y-3.5 pt-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all ${
                  isLight
                    ? 'bg-stone-50/70 border-stone-200 hover:bg-stone-50 hover:border-[#E05A47]/40'
                    : 'bg-[#150D0C] border-[#3E221E] hover:border-[#E05A47]/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                        {task.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        task.status === 'Completado' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                        task.status === 'Alerta' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                        task.status === 'En curso' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                        'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}>
                        {task.status}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}>
                        {task.phase}
                      </span>
                    </div>

                    <div className={`flex flex-wrap items-center gap-3 text-[11px] ${
                      isLight ? 'text-stone-500' : 'text-slate-400'
                    }`}>
                      <span className="font-semibold text-[#E05A47]">{task.obraTitle}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {task.venueName}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{task.startDate} al {task.endDate}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Resp: {task.responsible}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & Quick Adjust */}
                  <div className="flex items-center gap-3 shrink-0 sm:w-56">
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className={isLight ? 'text-stone-600' : 'text-slate-300'}>Avance</span>
                        <span className="font-bold text-[#E05A47]">{task.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#E05A47] to-[#FF6B4A] transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateProgress(task.id, Math.min(100, task.progress + 20))}
                        className="px-2 py-1 rounded bg-stone-200 dark:bg-white/10 hover:bg-[#E05A47] hover:text-white text-[11px] font-mono transition cursor-pointer"
                        title="Sumar 20% avance"
                      >
                        +20%
                      </button>
                    </div>
                  </div>
                </div>

                {task.notes && (
                  <p className={`text-[11px] mt-2 pt-2 border-t font-sans italic ${
                    isLight ? 'border-stone-200 text-stone-600' : 'border-white/5 text-slate-400'
                  }`}>
                    Nota técnica: {task.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Detailed Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isLight
                  ? 'bg-white border-[#E5DDD8] hover:border-[#E05A47]/40 shadow-xs'
                  : 'bg-[#1C110F] border-[#3E221E] hover:border-[#E05A47]/40 shadow-md'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                    task.priority === 'Alta' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-slate-300'
                  }`}>
                    Prioridad {task.priority}
                  </span>
                  <span className={`text-xs font-mono font-bold ${
                    task.status === 'Completado' ? 'text-emerald-500' : 'text-[#E05A47]'
                  }`}>
                    {task.status}
                  </span>
                </div>

                <h4 className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                  {task.title}
                </h4>
                <p className="text-xs font-semibold text-[#E05A47] truncate">
                  {task.obraTitle}
                </p>

                <div className={`space-y-1 text-xs pt-1 ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{task.venueName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{task.startDate} → {task.endDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>Responsable: {task.responsible}</span>
                  </div>
                </div>

                {task.notes && (
                  <p className={`text-[11px] p-2 rounded-lg ${
                    isLight ? 'bg-stone-50 text-stone-600' : 'bg-[#140B0A] text-slate-400'
                  }`}>
                    {task.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5">
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className={isLight ? 'text-stone-500' : 'text-slate-400'}>Progreso</span>
                  <span className="font-bold text-[#E05A47]">{task.progress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#E05A47]"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#1C110F] border-[#3E221E] text-white'
          }`}>
            <h3 className="text-base font-bold">Nuevo Hito de Planificación Escénica</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1">Título del Hito o Tarea</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ej: Montaje Parrilla DMX y Fonoacústica"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isLight ? 'bg-stone-50 border-stone-200 focus:border-[#E05A47]' : 'bg-[#150D0C] border-[#3E221E] focus:border-[#E05A47]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Obra Vinculada</label>
                  <select
                    value={newTaskObraId}
                    onChange={(e) => setNewTaskObraId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
                    }`}
                  >
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Fase del Ciclo</label>
                  <select
                    value={newTaskPhase}
                    onChange={(e) => setNewTaskPhase(e.target.value as PlannerTask['phase'])}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
                    }`}
                  >
                    <option value="Pre-producción">Pre-producción</option>
                    <option value="Ensayos">Ensayos</option>
                    <option value="Técnica & Montaje">Técnica & Montaje</option>
                    <option value="Gira & Temporada">Gira & Temporada</option>
                    <option value="Desmontaje">Desmontaje</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={newTaskStartDate}
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Fecha Término</label>
                  <input
                    type="date"
                    value={newTaskEndDate}
                    onChange={(e) => setNewTaskEndDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Sala / Teatro / Venue</label>
                  <input
                    type="text"
                    value={newTaskVenue}
                    onChange={(e) => setNewTaskVenue(e.target.value)}
                    placeholder="Teatro Biobío"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Responsable</label>
                  <input
                    type="text"
                    value={newTaskResponsible}
                    onChange={(e) => setNewTaskResponsible(e.target.value)}
                    placeholder="Antonia Fernández"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className={`px-4 py-2 rounded-xl border cursor-pointer ${
                    isLight ? 'border-stone-200 text-stone-700 hover:bg-stone-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#C84835] text-white font-semibold cursor-pointer"
                >
                  Guardar Hito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
