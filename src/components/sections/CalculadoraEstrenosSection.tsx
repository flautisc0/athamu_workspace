import React, { useState } from 'react';
import { ArtistAvailability, Obra } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  Calculator,
  Calendar,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Sliders,
  UserCheck,
  User,
  Plus,
  Edit2,
  Trash2,
  X,
  Save
} from 'lucide-react';

interface CalculadoraEstrenosSectionProps {
  obras: Obra[];
  artists: ArtistAvailability[];
  onUpdateArtistAvailability: (updatedArtist: ArtistAvailability) => void;
  onAddArtist: (newArtist: ArtistAvailability) => void;
  onDeleteArtist: (artistId: string) => void;
}

export const CalculadoraEstrenosSection: React.FC<CalculadoraEstrenosSectionProps> = ({
  obras,
  artists,
  onUpdateArtistAvailability,
  onAddArtist,
  onDeleteArtist
}) => {
  const [activeTab, setActiveTab] = useState<'calculadora' | 'disponibilidad'>('calculadora');

  // Calculator State
  const [selectedObraId, setSelectedObraId] = useState<string>(obras[0]?.id || '');
  const [weeksRemaining, setWeeksRemaining] = useState<number>(8);
  const [castSize, setCastSize] = useState<number>(5);
  const [musiciansCount, setMusiciansCount] = useState<number>(1);
  const [complexity, setComplexity] = useState<'baja' | 'media' | 'alta'>('media');
  const [customTotalHours, setCustomTotalHours] = useState<number>(90);
  const [hourlyPerformerFeeCLP, setHourlyPerformerFeeCLP] = useState<number>(12000); // CLP per hour per actor
  const [roomRentalPerHourCLP, setRoomRentalPerHourCLP] = useState<number>(18000); // CLP per hour for rehearsal hall
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);
  const [hoursPerSession, setHoursPerSession] = useState<number>(4);

  // Artist availability state
  const [selectedArtistId, setSelectedArtistId] = useState<string>(artists[0]?.id || '');

  // Artist modal for adding/editing artist
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [artistModalData, setArtistModalData] = useState<Partial<ArtistAvailability> | null>(null);

  // Calculate target hours based on complexity
  const targetHours =
    complexity === 'baja' ? 60 :
    complexity === 'media' ? 90 : 140;

  const weeklyRehearsalHours = sessionsPerWeek * hoursPerSession;
  const totalRehearsalHoursAchievable = weeklyRehearsalHours * weeksRemaining;
  const hoursDeficitOrSurplus = totalRehearsalHoursAchievable - targetHours;
  const isFeasible = hoursDeficitOrSurplus >= 0;

  // Financial Estimation
  const totalPerformers = castSize + musiciansCount;
  const totalElencoCostCLP = targetHours * totalPerformers * hourlyPerformerFeeCLP;
  const totalRoomCostCLP = targetHours * roomRentalPerHourCLP;
  const technicalDressRehearsalCostCLP = 450000; // 2 technical pasadas
  const totalEstimatedRehearsalBudgetCLP =
    totalElencoCostCLP + totalRoomCostCLP + technicalDressRehearsalCostCLP;

  // Selected artist object
  const currentArtist = artists.find(a => a.id === selectedArtistId) || artists[0];

  const toggleTimeSlot = (day: keyof ArtistAvailability['timeSlots'], slot: string) => {
    if (!currentArtist) return;
    const currentSlots = currentArtist.timeSlots[day] || [];
    const updatedSlots = currentSlots.includes(slot)
      ? currentSlots.filter(s => s !== slot)
      : [...currentSlots, slot];

    const updatedArtist: ArtistAvailability = {
      ...currentArtist,
      timeSlots: {
        ...currentArtist.timeSlots,
        [day]: updatedSlots
      }
    };
    onUpdateArtistAvailability(updatedArtist);
  };

  const handleOpenAddArtist = () => {
    setArtistModalData({
      id: `art-${Date.now()}`,
      artistName: '',
      role: 'Actriz / Intérprete Escénica',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      notes: '',
      timeSlots: {
        lunes: ['Mañana (09:00 - 13:30)'],
        martes: ['Tarde (14:30 - 18:30)'],
        miercoles: ['Mañana (09:00 - 13:30)'],
        jueves: ['Tarde (14:30 - 18:30)'],
        viernes: ['Mañana (09:00 - 13:30)'],
        sabado: []
      }
    });
    setIsArtistModalOpen(true);
  };

  const handleOpenEditArtist = (art: ArtistAvailability) => {
    setArtistModalData({ ...art });
    setIsArtistModalOpen(true);
  };

  const handleSaveArtistModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistModalData || !artistModalData.artistName) return;

    const isExisting = artists.some(a => a.id === artistModalData.id);
    const saved: ArtistAvailability = {
      id: artistModalData.id || `art-${Date.now()}`,
      artistName: artistModalData.artistName,
      role: artistModalData.role || 'Intérprete Escénico',
      avatar: artistModalData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      notes: artistModalData.notes || '',
      timeSlots: artistModalData.timeSlots || {
        lunes: [],
        martes: [],
        miercoles: [],
        jueves: [],
        viernes: [],
        sabado: []
      }
    };

    if (isExisting) {
      onUpdateArtistAvailability(saved);
    } else {
      onAddArtist(saved);
      setSelectedArtistId(saved.id);
    }

    setIsArtistModalOpen(false);
    setArtistModalData(null);
  };

  const daysList: (keyof ArtistAvailability['timeSlots'])[] = [
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado'
  ];

  const standardSlots = [
    'Mañana (09:00 - 13:00)',
    'Tarde (14:30 - 18:30)'
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#a78bfa] uppercase tracking-wider">
            <span>6. Calculadora de Estrenos</span>
            <span>•</span>
            <span>Planificación Cuantitativa</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Estimador de Ensayos, Recursos & Disponibilidad
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Calcula la viabilidad cronológica de un estreno, horas de piso de danza o sala requeridas, presupuesto de producción y cruce de horarios de artistas.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-[#161920] border border-white/10 rounded-xl">
          <button
            onClick={() => setActiveTab('calculadora')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'calculadora'
                ? 'bg-[#a78bfa] text-[#0f1115] font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Calculadora de Ensayos
          </button>
          <button
            onClick={() => setActiveTab('disponibilidad')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'disponibilidad'
                ? 'bg-[#6ee7b7] text-[#0f1115] font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vista de Artista (Horarios)
          </button>
        </div>
      </div>

      {activeTab === 'calculadora' ? (
        /* TAB 1: CALCULATOR VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Parameter Inputs (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-6 shadow-lg">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4 text-[#a78bfa]" />
              <span>Parámetros del Montaje & Calendario</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Obra en Preparación
                </label>
                <select
                  value={selectedObraId}
                  onChange={(e) => setSelectedObraId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#a78bfa]"
                >
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>{o.title} ({o.discipline})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Complejidad Escénica
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['baja', 'media', 'alta'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setComplexity(lvl)}
                      className={`py-2 px-1 text-center text-xs font-medium rounded-lg border transition-colors cursor-pointer uppercase ${
                        complexity === lvl
                          ? 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]'
                          : 'bg-[#0f1115] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              {/* Weeks remaining */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Semanas restantes hasta el estreno:</span>
                  <span className="text-[#a78bfa] font-bold font-mono">{weeksRemaining} semanas</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={weeksRemaining}
                  onChange={(e) => setWeeksRemaining(Number(e.target.value))}
                  className="w-full accent-[#a78bfa]"
                />
              </div>

              {/* Cast size */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Intérpretes / Bailarines / Actores en escena:</span>
                  <span className="text-white font-bold font-mono">{castSize} personas</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={castSize}
                  onChange={(e) => setCastSize(Number(e.target.value))}
                  className="w-full accent-[#a78bfa]"
                />
              </div>

              {/* Musicians */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Músicos / Técnicos en sala de ensayo:</span>
                  <span className="text-white font-bold font-mono">{musiciansCount} personas</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  value={musiciansCount}
                  onChange={(e) => setMusiciansCount(Number(e.target.value))}
                  className="w-full accent-[#a78bfa]"
                />
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ensayos por Semana
                  </label>
                  <select
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#a78bfa]"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} ensayos semanales</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Duración por Ensayo
                  </label>
                  <select
                    value={hoursPerSession}
                    onChange={(e) => setHoursPerSession(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#a78bfa]"
                  >
                    {[2, 3, 4, 5, 6].map(h => (
                      <option key={h} value={h}>{h} horas por sesión</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rates */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Honorario Intérprete/Hora (CLP)
                  </label>
                  <input
                    type="number"
                    value={hourlyPerformerFeeCLP}
                    onChange={(e) => setHourlyPerformerFeeCLP(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Arriendo Sala/Hora (CLP)
                  </label>
                  <input
                    type="number"
                    value={roomRentalPerHourCLP}
                    onChange={(e) => setRoomRentalPerHourCLP(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Calculations & Feasibility Diagnosis (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Feasibility Alert Box */}
            <div className={`p-6 rounded-2xl border shadow-lg ${
              isFeasible
                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                : 'bg-amber-950/20 border-amber-500/30 text-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                {isFeasible ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isFeasible ? 'Plan de Ensayos Factible' : 'Alerta: Horas Insuficientes'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {isFeasible
                      ? `Con ${sessionsPerWeek} sesiones semanales se alcanzan ${totalRehearsalHoursAchievable} hrs (Meta: ${targetHours} hrs).`
                      : `Faltan ${Math.abs(hoursDeficitOrSurplus)} horas de ensayo. Se recomienda aumentar sesiones o postergar ${Math.ceil(Math.abs(hoursDeficitOrSurplus) / weeklyRehearsalHours)} semanas el estreno.`}
                  </p>
                </div>
              </div>

              {/* Progress towards required rehearsal hours */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>Horas planificadas vs requeridas:</span>
                  <span className="font-mono font-bold">{totalRehearsalHoursAchievable} / {targetHours} hrs</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isFeasible ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, (totalRehearsalHoursAchievable / targetHours) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Presupuesto Estimado de Proceso de Ensayos</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">
                    Honorarios Elenco ({totalPerformers} personas x {targetHours} hrs):
                  </span>
                  <span className="text-white font-mono font-medium">{formatCLP(totalElencoCostCLP)}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">
                    Arriendo Sala de Ensayos ({targetHours} hrs):
                  </span>
                  <span className="text-white font-mono font-medium">{formatCLP(totalRoomCostCLP)}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">Pasadas Técnicas & Montaje General:</span>
                  <span className="text-white font-mono font-medium">{formatCLP(technicalDressRehearsalCostCLP)}</span>
                </div>

                <div className="flex items-center justify-between pt-2 text-sm font-bold">
                  <span className="text-white">Costo Total de Ensayos:</span>
                  <span className="text-[#6ee7b7] font-mono text-base">
                    {formatCLP(totalEstimatedRehearsalBudgetCLP)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400">
                💡 Este presupuesto cubre estrictamente la fase previa al estreno. El caché por función se cobra por separado.
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* TAB 2: ARTIST AVAILABILITY VIEW */
        <div className="space-y-6">
          
          <div className="p-4 rounded-2xl bg-[#161920] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={currentArtist.avatar}
                alt={currentArtist.artistName}
                className="w-12 h-12 rounded-xl object-cover border border-[#6ee7b7]"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-base font-bold text-white">{currentArtist.artistName}</h3>
                <span className="text-xs text-[#6ee7b7] font-medium">{currentArtist.role}</span>
              </div>
            </div>

            {/* Select Artist Dropdown and Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Seleccionar Intérprete:</span>
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ee7b7]"
              >
                {artists.map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.artistName} ({art.role.split('(')[0]})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleOpenEditArtist(currentArtist)}
                title="Editar datos del intérprete"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#6ee7b7]" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddArtist}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-xl shadow transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Intérprete</span>
              </button>
            </div>
          </div>

          {/* Availability Grid */}
          <div className="p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#6ee7b7]" />
                  <span>Matriz de Disponibilidad Semanal</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Haz clic en cada bloque horario para marcar disponibilidad o bloqueo del intérprete.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Verde = Disponible | Gris = No disponible
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {daysList.map((day) => {
                const daySlots = currentArtist.timeSlots[day] || [];
                return (
                  <div key={day} className="p-3.5 rounded-xl bg-[#12141a] border border-white/5 space-y-3">
                    <span className="text-xs font-bold uppercase text-[#fbbf24] block border-b border-white/5 pb-1 font-display">
                      {day}
                    </span>

                    <div className="space-y-2">
                      {standardSlots.map((slot) => {
                        const isAvailable = daySlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleTimeSlot(day, slot)}
                            className={`w-full p-2 rounded-lg text-[11px] text-left transition-all cursor-pointer border ${
                              isAvailable
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                                : 'bg-[#0f1115] text-slate-400 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{slot.split(' ')[0]}</span>
                              {isAvailable && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {slot.split(' ')[1]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div className="p-3.5 rounded-xl bg-[#12141a] border border-white/5 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
                Observaciones del Intérprete:
              </span>
              <p>{currentArtist.notes}</p>
            </div>

            {/* General Best Match analysis */}
            <div className="p-4 rounded-xl bg-[#6ee7b7]/10 border border-[#6ee7b7]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#6ee7b7]" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Horario de Mayor Coincidencia de Elenco:
                  </h4>
                  <p className="text-xs text-slate-300">
                    Lunes, Miércoles y Viernes de 14:30 a 18:30 hrs (4 de 4 intérpretes disponibles).
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Modal Add / Edit Artist */}
      {isArtistModalOpen && artistModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[#12141a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#6ee7b7]" />
                <h3 className="text-base font-semibold text-white">
                  {artists.some(a => a.id === artistModalData.id) ? 'Editar Intérprete' : 'Nuevo Intérprete al Elenco'}
                </h3>
              </div>
              <button
                onClick={() => { setIsArtistModalOpen(false); setArtistModalData(null); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveArtistModal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={artistModalData.artistName || ''}
                  onChange={e => setArtistModalData(prev => ({ ...prev, artistName: e.target.value }))}
                  placeholder="Ej. Francisca Gavilán"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rol / Personaje / Función</label>
                <input
                  type="text"
                  value={artistModalData.role || ''}
                  onChange={e => setArtistModalData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Ej. Actriz Principal (Protagonista)"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Fotografía / Avatar</label>
                <input
                  type="url"
                  value={artistModalData.avatar || ''}
                  onChange={e => setArtistModalData(prev => ({ ...prev, avatar: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observaciones / Restricciones</label>
                <textarea
                  rows={3}
                  value={artistModalData.notes || ''}
                  onChange={e => setArtistModalData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ej. Bloqueo fijo martes por rodaje de serie. Disponible para giras internacionales."
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                {artistModalData.id && artists.some(a => a.id === artistModalData.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar al intérprete "${artistModalData.artistName}" del elenco?`)) {
                        onDeleteArtist(artistModalData.id!);
                        setIsArtistModalOpen(false);
                        setArtistModalData(null);
                        const remaining = artists.filter(a => a.id !== artistModalData.id);
                        if (remaining[0]) setSelectedArtistId(remaining[0].id);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsArtistModalOpen(false); setArtistModalData(null); }}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-lg shadow cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Intérprete</span>
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
