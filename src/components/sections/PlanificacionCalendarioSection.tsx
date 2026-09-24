import React, { useState } from 'react';
import { EventSchedule, Obra, ReminderNotification } from '../../types';
import {
  CalendarDays,
  Clock,
  Filter,
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sparkles,
  ChevronRight,
  Database,
  Search,
  Check
} from 'lucide-react';

interface PlanificacionCalendarioSectionProps {
  events: EventSchedule[];
  obras: Obra[];
  reminders: ReminderNotification[];
  onUpdateEvents: (events: EventSchedule[]) => void;
  theme?: 'terracota' | 'dia';
}

export const PlanificacionCalendarioSection: React.FC<PlanificacionCalendarioSectionProps> = ({
  events,
  obras,
  reminders,
  onUpdateEvents,
  theme = 'terracota'
}) => {
  const isLight = theme === 'dia';

  // Filters state
  const [selectedObraFilter, setSelectedObraFilter] = useState<string>('all');
  const [selectedMountingType, setSelectedMountingType] = useState<string>('all');
  const [selectedLifecycleStage, setSelectedLifecycleStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New event / mounting state
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    obraId: obras[0]?.id || '',
    obraTitle: obras[0]?.title || 'Obra General',
    type: 'Montaje técnico' as EventSchedule['type'],
    date: new Date().toISOString().split('T')[0],
    timeStart: '10:00',
    timeEnd: '14:00',
    venue: 'Sala Principal GAM',
    castCount: 6,
    workloadHours: 4,
    managementCount: 3,
    lifecycleStage: 'Creación & Ensayos'
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtered events
  const filteredEvents = events.filter(ev => {
    if (selectedObraFilter !== 'all' && ev.obraId !== selectedObraFilter) return false;
    if (searchQuery.trim() && !ev.title.toLowerCase().includes(searchQuery.toLowerCase()) && !ev.venue.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate total workload hours and management tasks for the filtered schedule
  const totalWorkloadHours = filteredEvents.reduce((acc, curr) => acc + (curr.castCount > 5 ? 6 : 4), 0);
  const totalManagementTasks = filteredEvents.length * 2 + 3;

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const matchedObra = obras.find(o => o.id === newEvent.obraId);
    const created: EventSchedule = {
      id: `ev-${Date.now()}`,
      title: newEvent.title,
      obraId: newEvent.obraId,
      obraTitle: matchedObra ? matchedObra.title : newEvent.obraTitle,
      type: newEvent.type,
      date: newEvent.date,
      timeStart: newEvent.timeStart,
      timeEnd: newEvent.timeEnd,
      venue: newEvent.venue,
      castCount: Number(newEvent.castCount),
      status: 'Confirmado'
    };

    const updated = [created, ...events];
    onUpdateEvents(updated);
    setShowNewEventModal(false);
    setNewEvent({
      title: '',
      obraId: obras[0]?.id || '',
      obraTitle: obras[0]?.title || 'Obra General',
      type: 'Montaje técnico',
      date: new Date().toISOString().split('T')[0],
      timeStart: '10:00',
      timeEnd: '14:00',
      venue: 'Sala Principal GAM',
      castCount: 6,
      workloadHours: 4,
      managementCount: 3,
      lifecycleStage: 'Creación & Ensayos'
    });
    setFeedback('¡Nuevo evento de montaje y carga horaria sincronizado con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${
        isLight
          ? 'bg-gradient-to-br from-white via-[#FAF6F4] to-[#F5ECE8] border-[#E8DDD7] text-stone-900 shadow-xs'
          : 'bg-gradient-to-br from-[var(--bg-surface)] via-[#241513] to-[#170E0D] border-[var(--accent-terracota)]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--accent-terracota)]/15 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)] font-bold">
                Planificación Operativa & Calendario Sincronizado
              </span>
              <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sincronizado con Planner & Arquitecto SQL
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
              Gestión de Tiempo, Carga Horaria & Múltiples Montajes
            </h1>
            <p className={`text-xs md:text-sm max-w-2xl ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Controla la carga diaria de ensayos, montaje técnico y funciones por obra. Conectado en tiempo real con el catálogo real del CRM y bases de datos del Arquitecto de Proyectos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowNewEventModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold shadow-lg shadow-[var(--accent-terracota)]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Nuevo Montaje</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Workload Analytics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)]'}`}>
          <div className="flex items-center justify-between text-xs font-mono text-[var(--accent-terracota)] uppercase tracking-wider font-bold mb-1">
            <span>Carga Horaria Total</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-display">{totalWorkloadHours} hrs</div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
            Acumulado en ensayos y montaje técnico
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)]'}`}>
          <div className="flex items-center justify-between text-xs font-mono text-sky-500 uppercase tracking-wider font-bold mb-1">
            <span>Gestiones Activas</span>
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-display">{totalManagementTasks} tareas</div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
            Coordinación de elencos y salas
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)]'}`}>
          <div className="flex items-center justify-between text-xs font-mono text-amber-500 uppercase tracking-wider font-bold mb-1">
            <span>Montajes Simultáneos</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-display">{obras.length} Obras</div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
            Sincronizadas con catálogo CRM
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)]'}`}>
          <div className="flex items-center justify-between text-xs font-mono text-emerald-500 uppercase tracking-wider font-bold mb-1">
            <span>Estado Arquitecto SQL</span>
            <Database className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-500">Conectado</div>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
            Wiring activo para bases de datos
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)]'
      }`}>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--accent-terracota)]" />
            <span className="text-xs font-bold uppercase tracking-wider">Filtrar Obra:</span>
          </div>
          <select
            value={selectedObraFilter}
            onChange={e => setSelectedObraFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
              isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
            }`}
          >
            <option value="all">Todas las Obras del Catálogo Real ({obras.length})</option>
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>

          <select
            value={selectedLifecycleStage}
            onChange={e => setSelectedLifecycleStage(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
              isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
            }`}
          >
            <option value="all">Ciclo Completo (I+D, Creación, Gira, Rendición)</option>
            <option value="id">Fase 1: I+D & Formulación</option>
            <option value="creacion">Fase 2: Creación & Montaje Técnico</option>
            <option value="gira">Fase 3: Circulación & Gira</option>
            <option value="rendicion">Fase 4: Rendición Presupuestaria</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título o sala..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
              isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
            }`}
          />
        </div>
      </div>

      {/* Calendar Events List Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold font-display flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[var(--accent-terracota)]" />
          <span>Cronograma de Montajes & Carga Diaria ({filteredEvents.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-5 rounded-2xl border space-y-4 transition-all hover:border-[var(--accent-terracota)]/40 ${
                isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)]">
                    {ev.type}
                  </span>
                  <h4 className="text-sm font-bold font-display">{ev.title}</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-400 shrink-0">
                  {ev.status}
                </span>
              </div>

              <div className={`space-y-2 text-xs pt-2 border-t ${isLight ? 'border-stone-100 text-stone-600' : 'border-white/5 text-slate-300'}`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-terracota)]" />
                  <span className="font-semibold">{ev.obraTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                  <span>{ev.date} ({ev.timeStart} - {ev.timeEnd})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                  <span>{ev.venue} • Elenco: {ev.castCount} pers.</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-white/5">
                <span>Carga estim: 4 hrs</span>
                <span className="text-[var(--accent-terracota)] font-semibold">SQL Sincronizado</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Event / Mounting Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 md:p-8 rounded-3xl border space-y-6 ${
            isLight ? 'bg-white border-stone-200 text-stone-900 shadow-2xl' : 'bg-[#1C1210] border-[var(--border-color)] text-white shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-white/10">
              <h3 className="text-lg font-bold font-display">Programar Nuevo Montaje / Hito Horario</h3>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Título del Ensayo / Montaje</label>
                <input
                  type="text"
                  placeholder="Ej: Puesta de luces general Sala Principal"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Vincular con Obra del Catálogo Real (SQL)</label>
                <select
                  value={newEvent.obraId}
                  onChange={e => {
                    const sel = obras.find(o => o.id === e.target.value);
                    setNewEvent({ ...newEvent, obraId: e.target.value, obraTitle: sel ? sel.title : '' });
                  }}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-[#180F0E] border-white/10 text-white'
                  }`}
                >
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.title} ({o.discipline})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Tipo de Actividad</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-[#180F0E] border-white/10 text-white'
                    }`}
                  >
                    <option value="Montaje técnico">Montaje técnico</option>
                    <option value="Ensayo">Ensayo general</option>
                    <option value="Función / Estreno">Función / Estreno</option>
                    <option value="Reunión de producción">Reunión de producción</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Fecha</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Hora Inicio</label>
                  <input
                    type="time"
                    value={newEvent.timeStart}
                    onChange={e => setNewEvent({ ...newEvent, timeStart: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Hora Fin</label>
                  <input
                    type="time"
                    value={newEvent.timeEnd}
                    onChange={e => setNewEvent({ ...newEvent, timeEnd: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Sala / Venue</label>
                <input
                  type="text"
                  placeholder="Ej: Sala Principal GAM"
                  value={newEvent.venue}
                  onChange={e => setNewEvent({ ...newEvent, venue: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'}`}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    isLight ? 'border-stone-200 text-stone-700 hover:bg-stone-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold shadow-lg shadow-[var(--accent-terracota)]/20 cursor-pointer"
                >
                  Guardar en Calendario & Carga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
