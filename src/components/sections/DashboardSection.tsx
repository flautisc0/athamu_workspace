import React from 'react';
import { urlConSesion } from '../../utils/sesionEcosistema';
import { Obra, Lead, ProjectRD, EventSchedule, FinanceRecord, UserSession } from '../../types';
import { formatCLP } from '../../utils/storage';
import { FaseLogo } from '../FaseLogo';
import {
  Drama,
  Users2,
  FlaskConical,
  CalendarDays,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  DollarSign,
  Compass,
  Download,
  Upload,
  Camera
} from 'lucide-react';

interface DashboardSectionProps {
  obras: Obra[];
  leads: Lead[];
  rdProjects: ProjectRD[];
  events: EventSchedule[];
  finances: FinanceRecord[];
  currentUser?: UserSession;
  onUpdateUserAvatar?: (url: string) => void;
  onNavigateSection: (sectionId: string) => void;
  onSelectObra: (obra: Obra) => void;
  theme?: 'terracota' | 'dia';
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  obras,
  leads,
  rdProjects,
  events,
  finances,
  currentUser,
  onUpdateUserAvatar,
  onNavigateSection,
  onSelectObra,
  theme = 'terracota'
}) => {
  const isLight = theme === 'dia';

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
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Top Banner / Welcome with F.A.S.E Branding */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 transition-colors ${
        isLight
          ? 'bg-gradient-to-br from-[#FFF8F6] via-white to-[#FDF4F0] border-[#E8DDD7] text-stone-900 shadow-xs'
          : 'bg-gradient-to-br from-[var(--bg-surface)] via-[#2A1714] to-[#1C100F] border-[var(--accent-terracota)]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--accent-terracota)]/10 via-[#38BDF8]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <FaseLogo variant="symbol" size="xs" theme={isLight ? 'light' : 'terracota'} />
                <h1 className={`text-lg md:text-xl font-bold tracking-tight font-display ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  Panel ejecutivo de gestión F.A.S.E
                </h1>
              </div>
              <p className={`text-xs max-w-xl leading-relaxed ${
                isLight ? 'text-stone-600' : 'text-slate-300'
              }`}>
                Sistema operativo integral estructurado en 4 fases del ciclo escénico: Formulación e I+D, Articulación técnica, Circulación y Rendición.
              </p>
            </div>
          </div>

          {/* User Profile Hero Card (Primary Focus) */}
          {currentUser && (
            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${
              isLight ? 'bg-white border-[var(--accent-terracota)]/30 shadow-md' : 'bg-[#180F0E] border-[var(--accent-terracota)]/40 shadow-xl'
            }`}>
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="relative group shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[var(--accent-terracota)] shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-2xl transition-opacity cursor-pointer text-white text-[10px] font-medium" title="Actualizar fotografía">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Cambiar foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onUpdateUserAvatar) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            onUpdateUserAvatar(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)] font-bold">
                      Sesión Google Workspace Activa
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Verificado
                    </span>
                  </div>
                  <h2 className="text-xl font-bold font-display tracking-tight text-white dark:text-white">
                    {currentUser.name}
                  </h2>
                  <p className={`text-xs ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                    {currentUser.role} • <span className="font-mono">{currentUser.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateSection('obras')}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold shadow-lg shadow-[var(--accent-terracota)]/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Ver Catálogo de Obras</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accesos Operativos Prioritarios: Planner & Arquitecto de Proyectos (External App Links) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Planner Escénico */}
        <a
          href={urlConSesion('planner', 'https://planner-frontend-897089213264.us-central1.run.app')}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-start justify-between gap-4 block ${
            isLight
              ? 'bg-gradient-to-br from-white to-[#FAF6F4] border-[#E8DDD7] hover:border-[var(--accent-terracota)]/40 shadow-xs'
              : 'bg-gradient-to-br from-[#201311] to-[#170E0D] border-[var(--border-color)] hover:border-[var(--accent-terracota)]/40 shadow-sm'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent-terracota)] font-bold">
                Operaciones & Giras (App Externa)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-terracota)] animate-pulse" />
            </div>
            <h3 className={`text-base font-bold transition-colors ${
              isLight ? 'text-stone-900 group-hover:text-[var(--accent-terracota)]' : 'text-white group-hover:text-[var(--accent-glow)]'
            }`}>
              Planner Escénico & Cronograma
            </h3>
            <p className={`text-xs leading-relaxed max-w-md ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Planificación integral de temporadas, ensayos técnicos DMX, hitos de montaje y funciones para el catálogo de obras.
            </p>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-terracota)] pt-1">
              <span>Abrir app de planner escénico</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isLight ? 'bg-[var(--accent-terracota)]/10 text-[var(--accent-terracota)]' : 'bg-[var(--accent-terracota)]/20 text-[var(--accent-glow)]'
          }`}>
            <CalendarDays className="w-5 h-5" />
          </div>
        </a>

        {/* Card 2: Arquitecto de Proyectos */}
        <a
          href={urlConSesion('arquitecto', 'https://artha-arquitecto-897089213264.us-central1.run.app')}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-start justify-between gap-4 block ${
            isLight
              ? 'bg-gradient-to-br from-white to-[#F6F9FA] border-sky-200/80 hover:border-sky-400/50 shadow-xs'
              : 'bg-gradient-to-br from-[#121A22] to-[#0E141B] border-sky-950 hover:border-sky-500/40 shadow-sm'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold">
                Creación & Fondart (App Externa)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            </div>
            <h3 className={`text-base font-bold transition-colors ${
              isLight ? 'text-stone-900 group-hover:text-sky-600' : 'text-white group-hover:text-sky-400'
            }`}>
              Arquitecto de Proyectos
            </h3>
            <p className={`text-xs leading-relaxed max-w-md ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Diseño conceptual, desglose financiero multinivel (Fondart / Iberescena), ficha técnica y prospección para el CRM.
            </p>
            <div className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 pt-1">
              <span>Abrir app arquitecto de proyectos</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
        </a>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Obras en Circulación */}
        <div
          onClick={() => onNavigateSection('obras')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            isLight
              ? 'bg-white border-[var(--border-color)] hover:border-[var(--accent-terracota)]/40 shadow-xs'
              : 'bg-[#221513] border-[var(--border-color)] hover:border-[var(--accent-terracota)]/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
            }`}>
              Obras Activas
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-[var(--accent-terracota)]/10 text-[var(--accent-terracota)]' : 'bg-[var(--accent-terracota)]/20 text-[var(--accent-glow)]'
            }`}>
              <Drama className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {totalObras}
            </span>
            <span className={`text-xs font-medium ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`}>
              {obrasEnGira} en gira
            </span>
          </div>
          <div className={`mt-3 pt-3 border-t text-[11px] flex justify-between ${
            isLight ? 'border-stone-100 text-stone-500' : 'border-white/5 text-slate-400'
          }`}>
            <span>{obrasEnProduccion} en producción</span>
            <span>{obrasEnRepertorio} en repertorio</span>
          </div>
        </div>

        {/* Metric 2: Finanzas */}
        <div
          onClick={() => onNavigateSection('finanzas')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            isLight
              ? 'bg-white border-[var(--border-color)] hover:border-sky-500/40 shadow-xs'
              : 'bg-[#221513] border-[var(--border-color)] hover:border-sky-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
            }`}>
              Iniciativas I+D
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {rdProjects.length}
            </span>
            <span className="text-xs text-sky-500 font-medium">ATHAMU & Aurora</span>
          </div>
          <div className={`mt-3 pt-3 border-t text-[11px] flex justify-between ${
            isLight ? 'border-stone-100 text-stone-500' : 'border-white/5 text-slate-400'
          }`}>
            <span>Avance prom: 67%</span>
            <span>4 Laboratorios</span>
          </div>
        </div>

        {/* Metric 3: CRM / Pipeline de Salas */}
        <div
          onClick={() => onNavigateSection('crm')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            isLight
              ? 'bg-white border-[var(--border-color)] hover:border-amber-500/40 shadow-xs'
              : 'bg-[#221513] border-[var(--border-color)] hover:border-amber-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
            }`}>
              Pipeline CRM
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {activeLeadsCount}
            </span>
            <span className="text-xs text-amber-500 font-medium">Leads calientes</span>
          </div>
          <div className={`mt-3 pt-3 border-t text-[11px] flex justify-between ${
            isLight ? 'border-stone-100 text-stone-500' : 'border-white/5 text-slate-400'
          }`}>
            <span>En negociación:</span>
            <span className={`font-mono font-medium ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {formatCLP(pipelineValueCLP)}
            </span>
          </div>
        </div>

        {/* Metric 4: Flujo Financiero */}
        <div
          onClick={() => onNavigateSection('finanzas')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            isLight
              ? 'bg-white border-[var(--border-color)] hover:border-emerald-500/40 shadow-xs'
              : 'bg-[#221513] border-[var(--border-color)] hover:border-emerald-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
            }`}>
              Balance Rendiciones
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {formatCLP(totalIngresosCLP - totalGastosCLP)}
            </span>
          </div>
          <div className={`mt-3 pt-3 border-t text-[11px] flex justify-between ${
            isLight ? 'border-stone-100 text-stone-500' : 'border-white/5 text-slate-400'
          }`}>
            <span>Ingresos: {formatCLP(totalIngresosCLP)}</span>
            <span>Gastos: {formatCLP(totalGastosCLP)}</span>
          </div>
        </div>

      </div>

      {/* Pipeline Escénico Visual / Flujo de Ciclo de Vida */}
      <div className={`p-6 rounded-2xl border space-y-4 ${
        isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#221513] border-[var(--border-color)] shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              <TrendingUp className={`w-4 h-4 ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`} />
              <span>Pipeline del Ciclo Escénico F.A.S.E (Etapas de Producción)</span>
            </h2>
            <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Distribución de las obras y proyectos a lo largo del flujo de investigación, estreno y circulación.
            </p>
          </div>
          <span className={`text-xs font-mono px-2.5 py-1 rounded-md ${
            isLight ? 'bg-stone-100 text-stone-600' : 'bg-white/5 text-slate-400'
          }`}>
            Total {totalObras + rdProjects.length} proyectos mapeados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          {/* Step 1: I+D & Laboratorios */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[var(--border-color)]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-500">1. I+D / Laboratorio</span>
              <span className={`font-mono ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                {rdProjects.length + obrasID}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Investigación coreográfica, dramatúrgica y tecnologías biométricas.
            </p>
            <div className="space-y-1.5 pt-2">
              {rdProjects.slice(0, 2).map(rd => (
                <div key={rd.id} className={`text-[11px] p-1.5 rounded truncate ${
                  isLight ? 'bg-stone-200/70 text-stone-800' : 'bg-white/5 text-slate-300'
                }`}>
                  {rd.title.split(':')[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: En Producción / Ensayos */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[var(--border-color)]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-500">2. Producción & Ensayos</span>
              <span className={`font-mono ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                {obrasEnProduccion}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Construcción escenográfica, diseño sonoro y ensayos de elenco.
            </p>
            <div className="space-y-1.5 pt-2">
              {obras.filter(o => o.status === 'En producción').map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectObra(o)}
                  className={`text-[11px] p-1.5 rounded cursor-pointer truncate transition-colors ${
                    isLight
                      ? 'bg-stone-200/70 text-stone-800 hover:text-[var(--accent-terracota)]'
                      : 'bg-white/5 text-slate-300 hover:text-[var(--accent-glow)]'
                  }`}
                >
                  {o.title}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Estreno & Temporada */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[var(--border-color)]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-500">3. Estreno / Temporada</span>
              <span className={`font-mono ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                {obras.filter(o => o.status === 'Estreno').length}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Montajes técnicos en salas principales y convocatoria de crítica.
            </p>
            <div className="space-y-1.5 pt-2">
              {obras.filter(o => o.status === 'Estreno').map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectObra(o)}
                  className={`text-[11px] p-1.5 rounded cursor-pointer truncate transition-colors ${
                    isLight
                      ? 'bg-stone-200/70 text-stone-800 hover:text-[var(--accent-terracota)]'
                      : 'bg-white/5 text-slate-300 hover:text-[var(--accent-glow)]'
                  }`}
                >
                  {o.title}
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Gira & Repertorio */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[var(--border-color)]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`}>
                4. Giras & Repertorio
              </span>
              <span className={`font-mono ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                {obrasEnGira + obrasEnRepertorio}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Circulación regional, internacional y venta a festivales.
            </p>
            <div className="space-y-1.5 pt-2">
              {obras.filter(o => o.status === 'En gira').slice(0, 2).map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectObra(o)}
                  className={`text-[11px] p-1.5 rounded cursor-pointer truncate transition-colors ${
                    isLight
                      ? 'bg-stone-200/70 text-stone-800 hover:text-[var(--accent-terracota)]'
                      : 'bg-white/5 text-slate-300 hover:text-[var(--accent-glow)]'
                  }`}
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
        <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-4 ${
          isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#221513] border-[var(--border-color)] shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <Drama className={`w-4 h-4 ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`} />
              <span>Montajes en Circulación & Gira Activa</span>
            </h3>
            <button
              onClick={() => onNavigateSection('obras')}
              className={`text-xs hover:underline ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`}
            >
              Ver todas ({totalObras})
            </button>
          </div>

          <div className="space-y-3">
            {obras.slice(0, 4).map((obra) => (
              <div
                key={obra.id}
                onClick={() => onSelectObra(obra)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                  isLight
                    ? 'bg-stone-50 border-stone-200 hover:border-[var(--accent-terracota)]/40 hover:bg-stone-100'
                    : 'bg-[#180F0E] border-[var(--border-color)] hover:border-[var(--accent-terracota)]/40 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={obra.image}
                    alt={obra.title}
                    className="w-12 h-12 rounded-lg object-cover border border-stone-200 dark:border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold truncate transition-colors ${
                        isLight ? 'text-stone-900 group-hover:text-[var(--accent-terracota)]' : 'text-white group-hover:text-[var(--accent-glow)]'
                      }`}>
                        {obra.title}
                      </h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isLight ? 'bg-stone-200 text-stone-700' : 'bg-white/10 text-slate-300'
                      }`}>
                        {obra.discipline}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                      {obra.synopsis}
                    </p>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                      Caché: {formatCLP(obra.economics.feeCLP)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    obra.status === 'En gira'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : obra.status === 'Estreno'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30'
                  }`}>
                    {obra.status}
                  </span>
                  <span className={`text-[10px] block mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                    {obra.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Próximos Hitos & Ensayos (5 cols) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 ${
          isLight ? 'bg-white border-[var(--border-color)] shadow-xs' : 'bg-[#221513] border-[var(--border-color)] shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <CalendarDays className="w-4 h-4 text-sky-500" />
              <span>Próximas Fechas & Ensayos</span>
            </h3>
            <button
              onClick={() => onNavigateSection('calendario')}
              className="text-xs text-sky-500 hover:underline"
            >
              Ver agenda ({events.length})
            </button>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[var(--border-color)]'
                }`}
              >
                <div className="p-2 rounded-lg bg-sky-500/15 text-sky-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs font-semibold truncate ${isLight ? 'text-stone-900' : 'text-white'}`}>
                      {evt.title}
                    </h4>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      evt.type === 'Función' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                      evt.type === 'Ensayo General' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' :
                      'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    }`}>
                      {evt.type}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                    <span className="font-mono">{evt.date} • {evt.startTime}</span>
                    <span>•</span>
                    <span className="truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {evt.venueName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-[var(--bg-base)] border-stone-200'
              : 'bg-[#180F0E] border-[var(--border-color)]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-stone-800' : 'text-slate-200'}`}>
                Planificador de Ensayos & Montajes
              </span>
              <button
                onClick={() => onNavigateSection('planner')}
                className={`font-semibold hover:underline cursor-pointer ${isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'}`}
              >
                Abrir Planner Escénico →
              </button>
            </div>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Cronograma operativo de producción, transporte técnico y funciones confirmadas.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
