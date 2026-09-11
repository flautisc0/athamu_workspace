import React from 'react';
import { Obra, Lead, ProjectRD, EventSchedule, FinanceRecord } from '../../types';
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
  Database,
  Download,
  Upload,
  FileCode
} from 'lucide-react';

interface DashboardSectionProps {
  obras: Obra[];
  leads: Lead[];
  rdProjects: ProjectRD[];
  events: EventSchedule[];
  finances: FinanceRecord[];
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
          : 'bg-gradient-to-br from-[#1E110F] via-[#2A1714] to-[#1C100F] border-[#E05A47]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#E05A47]/10 via-[#38BDF8]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <FaseLogo variant="symbol" size="sm" theme={isLight ? 'light' : 'terracota'} />
              <div className="flex flex-col">
                <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-widest ${
                  isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'
                }`}>
                  <span>Plataforma F.A.S.E</span>
                  <span>•</span>
                  <span>Gestión Escénica & Producción</span>
                  <span>•</span>
                  <span className={isLight ? 'text-stone-500' : 'text-slate-400'}>Chile 2025</span>
                </div>
                <h1 className={`text-2xl md:text-3xl font-bold tracking-tight font-display ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  Panel Ejecutivo de Gestión Escénica
                </h1>
              </div>
            </div>
            <p className={`text-sm max-w-2xl leading-relaxed pt-1 ${
              isLight ? 'text-stone-600' : 'text-slate-300'
            }`}>
              Sistema operativo integral estructurado en 4 fases del ciclo escénico: Formulación e I+D, Articulación técnica de ensayos, Circulación en salas y festivales, y Rendición presupuestaria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateSection('calculadora')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-semibold shadow-lg shadow-[#E05A47]/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Calculadora de Estrenos</span>
            </button>
            <button
              onClick={() => onNavigateSection('acerca')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
              }`}
            >
              <span>Identidad F.A.S.E</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Phases Progress Bar / Methodology Indicator */}
        <div className={`mt-6 pt-5 border-t grid grid-cols-2 md:grid-cols-4 gap-3 ${
          isLight ? 'border-stone-200' : 'border-white/10'
        }`}>
          <div
            onClick={() => onNavigateSection('obras')}
            className={`p-3 rounded-xl border transition-all cursor-pointer group ${
              isLight
                ? 'bg-white/90 border-[#E05A47]/20 hover:border-[#E05A47]/50 shadow-xs'
                : 'bg-black/25 border-[#E05A47]/20 hover:border-[#E05A47]/50'
            }`}
          >
            <span className="text-[10px] font-mono text-[#E05A47] uppercase font-bold tracking-wider block">
              Fase 1 • Creación
            </span>
            <span className={`text-xs font-medium transition-colors ${
              isLight ? 'text-stone-900 group-hover:text-[#C84835]' : 'text-white group-hover:text-[#FF6B4A]'
            }`}>
              Catálogo & Dramaturgia
            </span>
            <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              {totalObras} obras activas
            </span>
          </div>

          <div
            onClick={() => onNavigateSection('riders')}
            className={`p-3 rounded-xl border transition-all cursor-pointer group ${
              isLight
                ? 'bg-white/90 border-sky-500/20 hover:border-sky-500/50 shadow-xs'
                : 'bg-black/25 border-sky-500/20 hover:border-sky-500/50'
            }`}
          >
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase font-bold tracking-wider block">
              Fase 2 • Articulación
            </span>
            <span className={`text-xs font-medium transition-colors ${
              isLight ? 'text-stone-900 group-hover:text-sky-600' : 'text-white group-hover:text-sky-400'
            }`}>
              Riders, Ensayos & Ficha
            </span>
            <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              {obrasEnProduccion} en montaje
            </span>
          </div>

          <div
            onClick={() => onNavigateSection('crm')}
            className={`p-3 rounded-xl border transition-all cursor-pointer group ${
              isLight
                ? 'bg-white/90 border-amber-500/20 hover:border-amber-500/50 shadow-xs'
                : 'bg-black/25 border-amber-500/20 hover:border-amber-500/50'
            }`}
          >
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider block">
              Fase 3 • Circulación
            </span>
            <span className={`text-xs font-medium transition-colors ${
              isLight ? 'text-stone-900 group-hover:text-amber-600' : 'text-white group-hover:text-amber-400'
            }`}>
              CRM Salas & Festivales
            </span>
            <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              {obrasEnGira} en gira
            </span>
          </div>

          <div
            onClick={() => onNavigateSection('finanzas')}
            className={`p-3 rounded-xl border transition-all cursor-pointer group ${
              isLight
                ? 'bg-white/90 border-emerald-500/20 hover:border-emerald-500/50 shadow-xs'
                : 'bg-black/25 border-emerald-500/20 hover:border-emerald-500/50'
            }`}
          >
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider block">
              Fase 4 • Rendición
            </span>
            <span className={`text-xs font-medium transition-colors ${
              isLight ? 'text-stone-900 group-hover:text-emerald-600' : 'text-white group-hover:text-emerald-400'
            }`}>
              Finanzas & Sostenibilidad
            </span>
            <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              {finances.length} registros
            </span>
          </div>
        </div>
      </div>

      {/* Cloud SQL PostgreSQL & PHP File Automation Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isLight
          ? 'bg-emerald-50/70 border-emerald-200 text-stone-900 shadow-xs'
          : 'bg-gradient-to-r from-emerald-950/40 via-[#1C1412] to-[#221513] border-emerald-800/40 text-white shadow-sm'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-emerald-500 uppercase tracking-wider">
                Cloud SQL (PostgreSQL) Activo
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono hidden sm:inline">
                Región us-west2
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Datos servidos dinámicamente con Drizzle ORM y automatización PHP. Descarga y sube archivos (.json, .csv, .sql).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={() => onNavigateSection('sql-hub')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Gestionar SQL & Archivos</span>
          </button>
          <a
            href="/php/index.php"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ver PHP</span>
          </a>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Obras en Circulación */}
        <div
          onClick={() => onNavigateSection('obras')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            isLight
              ? 'bg-white border-[#E5DDD8] hover:border-[#E05A47]/40 shadow-xs'
              : 'bg-[#221513] border-[#3E221E] hover:border-[#E05A47]/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
            }`}>
              Obras Activas
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-[#E05A47]/10 text-[#C84835]' : 'bg-[#E05A47]/20 text-[#FF6B4A]'
            }`}>
              <Drama className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {totalObras}
            </span>
            <span className={`text-xs font-medium ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`}>
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

        {/* Metric 2: Proyectos I+D */}
        <div
          onClick={() => onNavigateSection('id')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            isLight
              ? 'bg-white border-[#E5DDD8] hover:border-sky-500/40 shadow-xs'
              : 'bg-[#221513] border-[#3E221E] hover:border-sky-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
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
              ? 'bg-white border-[#E5DDD8] hover:border-amber-500/40 shadow-xs'
              : 'bg-[#221513] border-[#3E221E] hover:border-amber-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
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
              ? 'bg-white border-[#E5DDD8] hover:border-emerald-500/40 shadow-xs'
              : 'bg-[#221513] border-[#3E221E] hover:border-emerald-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
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
        isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#221513] border-[#3E221E] shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              <TrendingUp className={`w-4 h-4 ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`} />
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
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[#3E221E]'
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
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[#3E221E]'
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
                      ? 'bg-stone-200/70 text-stone-800 hover:text-[#C84835]'
                      : 'bg-white/5 text-slate-300 hover:text-[#FF6B4A]'
                  }`}
                >
                  {o.title}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Estreno & Temporada */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[#3E221E]'
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
                      ? 'bg-stone-200/70 text-stone-800 hover:text-[#C84835]'
                      : 'bg-white/5 text-slate-300 hover:text-[#FF6B4A]'
                  }`}
                >
                  {o.title}
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Gira & Repertorio */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[#3E221E]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`}>
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
                      ? 'bg-stone-200/70 text-stone-800 hover:text-[#C84835]'
                      : 'bg-white/5 text-slate-300 hover:text-[#FF6B4A]'
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
          isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#221513] border-[#3E221E] shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <Drama className={`w-4 h-4 ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`} />
              <span>Montajes en Circulación & Gira Activa</span>
            </h3>
            <button
              onClick={() => onNavigateSection('obras')}
              className={`text-xs hover:underline ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`}
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
                    ? 'bg-stone-50 border-stone-200 hover:border-[#C84835]/40 hover:bg-stone-100'
                    : 'bg-[#180F0E] border-[#3E221E] hover:border-[#E05A47]/40 hover:bg-white/5'
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
                        isLight ? 'text-stone-900 group-hover:text-[#C84835]' : 'text-white group-hover:text-[#FF6B4A]'
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
          isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#221513] border-[#3E221E] shadow-sm'
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
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#180F0E] border-[#3E221E]'
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
              ? 'bg-[#FAF7F5] border-stone-200'
              : 'bg-[#180F0E] border-[#3E221E]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-stone-800' : 'text-slate-200'}`}>
                Disponibilidad Artística
              </span>
              <button
                onClick={() => onNavigateSection('calculadora')}
                className={`font-semibold hover:underline ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`}
              >
                Abrir Calculadora →
              </button>
            </div>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Cruce de horarios para programar el próximo bloque técnico de ensayos.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
