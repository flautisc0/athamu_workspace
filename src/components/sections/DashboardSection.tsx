import React from 'react';
import { Obra, Lead, ProjectRD, EventSchedule, FinanceRecord } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  Drama,
  Users2,
  FlaskConical,
  CalendarDays,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sparkles,
  MapPin,
  DollarSign
} from 'lucide-react';

interface DashboardSectionProps {
  obras: Obra[];
  leads: Lead[];
  rdProjects: ProjectRD[];
  events: EventSchedule[];
  finances: FinanceRecord[];
  onNavigateSection: (sectionId: string) => void;
  onSelectObra: (obra: Obra) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  obras,
  leads,
  rdProjects,
  events,
  finances,
  onNavigateSection,
  onSelectObra
}) => {
  // Key Metrics
  const totalObras = obras.length;
  const obrasEnGira = obras.filter(o => o.status === 'En gira').length;
  const obrasEnProduccion = obras.filter(o => o.status === 'En producción' || o.status === 'Estreno').length;
  const obrasEnRepertorio = obras.filter(o => o.status === 'En repertorio').length;
  const obrasID = obras.filter(o => o.status === 'I+D').length;

  const activeLeadsCount = leads.filter(l => l.status === 'negociacion' || l.status === 'cerrado').length;
  const pipelineValueCLP = leads
    .filter(l => l.status === 'negociacion')
    .reduce((acc, l) => acc + l.estimatedValueCLP, 0);

  const totalGastosCLP = finances
    .filter(f => f.type === 'Gasto')
    .reduce((acc, f) => acc + f.amountCLP, 0);

  const totalIngresosCLP = finances
    .filter(f => f.type === 'Ingreso')
    .reduce((acc, f) => acc + f.amountCLP, 0);

  // Next upcoming events
  const upcomingEvents = [...events].slice(0, 4);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#161920] via-[#1a231f] to-[#161920] border border-white/10 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#6ee7b7] uppercase tracking-widest mb-1.5">
              <span>ATHA Producciones</span>
              <span>•</span>
              <span>Temporada 2025</span>
              <span>•</span>
              <span>Santiago & Valparaíso</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">
              Diagrama Central de Gestión Escénica
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Panel integrado para seguimiento de montajes teatrales, danza contemporánea, giras nacionales, I+D tecnológico sonoro y convenios con salas de Chile.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateSection('calculadora')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6ee7b7] hover:bg-[#5eead4] text-[#0f1115] text-xs font-semibold shadow transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Calculadora de Estrenos</span>
            </button>
            <button
              onClick={() => onNavigateSection('obras')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-medium transition-all cursor-pointer"
            >
              <span>Ver Catálogo Obras</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Obras en Circulación */}
        <div
          onClick={() => onNavigateSection('obras')}
          className="p-5 rounded-2xl bg-[#161920] border border-white/5 hover:border-[#6ee7b7]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Obras Activas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#6ee7b7]/15 text-[#6ee7b7] flex items-center justify-center">
              <Drama className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">{totalObras}</span>
            <span className="text-xs text-[#6ee7b7] font-medium">{obrasEnGira} en gira actual</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex justify-between">
            <span>{obrasEnProduccion} en producción</span>
            <span>{obrasEnRepertorio} en repertorio</span>
          </div>
        </div>

        {/* Metric 2: Proyectos I+D */}
        <div
          onClick={() => onNavigateSection('id')}
          className="p-5 rounded-2xl bg-[#161920] border border-white/5 hover:border-[#38bdf8]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Iniciativas I+D
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8] flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">{rdProjects.length}</span>
            <span className="text-xs text-[#38bdf8] font-medium">ATHAMU & Aurora</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex justify-between">
            <span>Avance promedio: 67%</span>
            <span>4 Laboratorios</span>
          </div>
        </div>

        {/* Metric 3: CRM / Pipeline de Salas */}
        <div
          onClick={() => onNavigateSection('crm')}
          className="p-5 rounded-2xl bg-[#161920] border border-white/5 hover:border-[#fbbf24]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pipeline CRM
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#fbbf24]/15 text-[#fbbf24] flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">{activeLeadsCount}</span>
            <span className="text-xs text-[#fbbf24] font-medium">Leads calientes</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex justify-between">
            <span>En negociación:</span>
            <span className="text-white font-mono font-medium">{formatCLP(pipelineValueCLP)}</span>
          </div>
        </div>

        {/* Metric 4: Flujo Financiero */}
        <div
          onClick={() => onNavigateSection('finanzas')}
          className="p-5 rounded-2xl bg-[#161920] border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Balance Rendiciones
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {formatCLP(totalIngresosCLP - totalGastosCLP)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex justify-between">
            <span>Ingresos: {formatCLP(totalIngresosCLP)}</span>
            <span>Gastos: {formatCLP(totalGastosCLP)}</span>
          </div>
        </div>

      </div>

      {/* Pipeline Escénico Visual / Diagrama de Ciclo de Vida */}
      <div className="p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#6ee7b7]" />
              <span>Diagrama del Pipeline Escénico ATHA (Etapas de Producción)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Distribución de las obras y proyectos a lo largo del flujo de investigación, estreno y circulación.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">
            Total {totalObras + rdProjects.length} proyectos mapeados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          {/* Step 1: I+D & Laboratorios */}
          <div className="p-4 rounded-xl bg-[#12141a] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#38bdf8]">1. I+D / Laboratorio</span>
              <span className="font-mono text-slate-400">{rdProjects.length + obrasID}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Investigación coreográfica, dramatúrgica y tecnologías biométricas.
            </p>
            <div className="space-y-1.5 pt-2">
              {rdProjects.slice(0, 2).map(rd => (
                <div key={rd.id} className="text-[11px] p-1.5 rounded bg-white/5 text-slate-300 truncate">
                  {rd.title.split(':')[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: En Producción / Ensayos */}
          <div className="p-4 rounded-xl bg-[#12141a] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#a78bfa]">2. Producción & Ensayos</span>
              <span className="font-mono text-slate-400">{obrasEnProduccion}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Construcción escenográfica, diseño sonoro y ensayos de elenco.
            </p>
            <div className="space-y-1.5 pt-2">
              {obras.filter(o => o.status === 'En producción').map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectObra(o)}
                  className="text-[11px] p-1.5 rounded bg-white/5 text-slate-300 hover:text-[#6ee7b7] cursor-pointer truncate"
                >
                  {o.title}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Estreno & Temporada */}
          <div className="p-4 rounded-xl bg-[#12141a] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#fbbf24]">3. Estreno / Temporada</span>
              <span className="font-mono text-slate-400">
                {obras.filter(o => o.status === 'Estreno').length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Montajes técnicos en salas principales y convocatoria de crítica.
            </p>
            <div className="space-y-1.5 pt-2">
              {obras.filter(o => o.status === 'Estreno').map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectObra(o)}
                  className="text-[11px] p-1.5 rounded bg-white/5 text-slate-300 hover:text-[#6ee7b7] cursor-pointer truncate"
                >
                  {o.title}
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Gira & Repertorio */}
          <div className="p-4 rounded-xl bg-[#12141a] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#6ee7b7]">4. Giras & Repertorio</span>
              <span className="font-mono text-slate-400">{obrasEnGira + obrasEnRepertorio}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Circulación regional, internacional y venta a festivales.
            </p>
            <div className="space-y-1.5 pt-2">
              {obras.filter(o => o.status === 'En gira').slice(0, 2).map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectObra(o)}
                  className="text-[11px] p-1.5 rounded bg-white/5 text-slate-300 hover:text-[#6ee7b7] cursor-pointer truncate"
                >
                  {o.title} (En gira)
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Two Column Grid: Obras Destacadas & Próximos Ensayos/Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Obras en Cartelera / Gira (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Drama className="w-4 h-4 text-[#6ee7b7]" />
              <span>Montajes en Circulación & Gira Activa</span>
            </h3>
            <button
              onClick={() => onNavigateSection('obras')}
              className="text-xs text-[#6ee7b7] hover:underline"
            >
              Ver todas ({totalObras})
            </button>
          </div>

          <div className="space-y-3">
            {obras.slice(0, 4).map((obra) => (
              <div
                key={obra.id}
                onClick={() => onSelectObra(obra)}
                className="p-3.5 rounded-xl bg-[#12141a] border border-white/5 hover:border-[#6ee7b7]/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={obra.image}
                    alt={obra.title}
                    className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#6ee7b7] transition-colors truncate">
                        {obra.title}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {obra.discipline}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {obra.synopsis}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Caché: {formatCLP(obra.economics.feeCLP)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    obra.status === 'En gira' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                    obra.status === 'Estreno' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                    'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  }`}>
                    {obra.status}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">{obra.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Próximos Ensayos & Hitos Técnicos (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#38bdf8]" />
              <span>Agenda de Ensayos & Producción</span>
            </h3>
            <button
              onClick={() => onNavigateSection('calendario')}
              className="text-xs text-[#38bdf8] hover:underline"
            >
              Ver calendario
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-[#12141a] border border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-[#38bdf8] font-mono">
                    {evt.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {evt.date} • {evt.timeStart} hrs
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white">{evt.title}</h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-[#6ee7b7]">{evt.obraTitle}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {evt.venue.split('-')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateSection('crm')}
              className="w-full py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Revisar Convenios & Salas Pendientes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
