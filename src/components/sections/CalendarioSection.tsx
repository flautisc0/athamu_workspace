import React, { useState } from 'react';
import { EventSchedule, Obra } from '../../types';
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface CalendarioSectionProps {
  events: EventSchedule[];
  obras: Obra[];
  onAddEvent: (event: EventSchedule) => void;
}

export const CalendarioSection: React.FC<CalendarioSectionProps> = ({
  events,
  obras,
  onAddEvent
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState<Partial<EventSchedule>>({
    title: '',
    obraId: obras[0]?.id || '',
    obraTitle: obras[0]?.title || '',
    type: 'Ensayo',
    date: '2025-03-16',
    timeStart: '10:00',
    timeEnd: '14:00',
    venue: 'Centro GAM - Sala A1',
    castCount: 4,
    status: 'Confirmado'
  });

  const filteredEvents = events.filter((e) =>
    filterType === 'all' ? true : e.type === filterType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;

    const selectedObra = obras.find(o => o.id === newEvent.obraId);

    const created: EventSchedule = {
      id: `evt-${Date.now()}`,
      title: newEvent.title || 'Ensayo general',
      obraId: newEvent.obraId || '',
      obraTitle: selectedObra?.title || 'Producción ATHA',
      type: newEvent.type as any || 'Ensayo',
      date: newEvent.date || '2025-03-20',
      timeStart: newEvent.timeStart || '10:00',
      timeEnd: newEvent.timeEnd || '14:00',
      venue: newEvent.venue || 'Sala de ensayos ATHA',
      castCount: Number(newEvent.castCount) || 4,
      status: (newEvent.status as any) || 'Confirmado'
    };

    onAddEvent(created);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#38bdf8] uppercase tracking-wider">
            <span>5. Planificación & Calendario</span>
            <span>•</span>
            <span>Agenda de Escenario</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Cronograma de Ensayos, Montajes y Funciones
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión coordinada de tiempos de escenario, llamados de elenco y pasadas técnicas para optimizar los recursos de sala.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f1115] text-xs font-semibold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Ensayo o Función</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 text-xs">
        {['all', 'Ensayo', 'Montaje técnico', 'Función / Estreno', 'Reunión de producción'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
              filterType === type
                ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {type === 'all' ? 'Todos los Eventos' : type}
          </button>
        ))}
      </div>

      {/* Events Timeline / List */}
      <div className="space-y-3">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-4 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#12141a] border border-white/5 text-center shrink-0 min-w-[70px]">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">
                  {new Date(evt.date + 'T00:00:00').toLocaleDateString('es-CL', { month: 'short' })}
                </span>
                <span className="text-xl font-bold text-white font-mono">
                  {new Date(evt.date + 'T00:00:00').getDate()}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono ${
                    evt.type === 'Función / Estreno' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                    evt.type === 'Montaje técnico' ? 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30' :
                    evt.type === 'Ensayo' ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30' :
                    'bg-slate-500/15 text-slate-300'
                  }`}>
                    {evt.type}
                  </span>
                  <span className="text-xs font-bold text-[#6ee7b7]">
                    {evt.obraTitle}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  {evt.title}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {evt.timeStart} - {evt.timeEnd} hrs
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {evt.venue}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {evt.castCount} personas convocadas
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {evt.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[#12141a] flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Agendar Nuevo Hito de Producción</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título del Evento *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Ej. Ensayo general con pasada de luces"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Obra Asociada</label>
                  <select
                    value={newEvent.obraId}
                    onChange={e => {
                      const o = obras.find(item => item.id === e.target.value);
                      setNewEvent({ ...newEvent, obraId: e.target.value, obraTitle: o?.title || '' });
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                  >
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Actividad</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Ensayo">Ensayo</option>
                    <option value="Montaje técnico">Montaje técnico</option>
                    <option value="Función / Estreno">Función / Estreno</option>
                    <option value="Reunión de producción">Reunión de producción</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Inicio</label>
                    <input
                      type="time"
                      value={newEvent.timeStart}
                      onChange={e => setNewEvent({ ...newEvent, timeStart: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Término</label>
                    <input
                      type="time"
                      value={newEvent.timeEnd}
                      onChange={e => setNewEvent({ ...newEvent, timeEnd: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sala / Ubicación</label>
                <input
                  type="text"
                  value={newEvent.venue}
                  onChange={e => setNewEvent({ ...newEvent, venue: e.target.value })}
                  placeholder="Ej. Centro GAM - Sala A1"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-[#0f1115] bg-[#38bdf8] hover:bg-[#0284c7] rounded-lg shadow"
                >
                  Guardar en Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
