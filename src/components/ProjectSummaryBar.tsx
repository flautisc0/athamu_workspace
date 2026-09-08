import React from 'react';
import { Project } from '../types/project';
import { FinancialSummary, formatCLP, formatPct } from '../utils/calculations';
import { 
  TrendingUp, 
  Wallet, 
  Users, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ShieldCheck
} from 'lucide-react';

interface ProjectSummaryBarProps {
  project: Project;
  finances: FinancialSummary;
}

export const ProjectSummaryBar: React.FC<ProjectSummaryBarProps> = ({ project, finances }) => {
  const getStatusBadge = () => {
    switch (project.status) {
      case 'en_produccion':
        return { label: 'En Producción', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
      case 'en_evaluacion':
        return { label: 'En Evaluación / Postulación', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      case 'aprobado':
        return { label: 'Aprobado', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      default:
        return { label: 'Borrador de Trabajo', bg: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-700' };
    }
  };

  const getViabilityBadge = () => {
    const score = finances.viabilityScore;
    if (score >= 80) {
      return {
        label: `Viabilidad Óptima (${score}/100)`,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
        icon: CheckCircle2
      };
    } else if (score >= 65) {
      return {
        label: `Viable c/ Observaciones (${score}/100)`,
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        icon: AlertCircle
      };
    } else {
      return {
        label: `Riesgo Crítico (${score}/100)`,
        color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
        icon: AlertCircle
      };
    }
  };

  const statusBadge = getStatusBadge();
  const viabilityBadge = getViabilityBadge();
  const ViabilityIcon = viabilityBadge.icon;

  return (
    <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="max-w-7xl mx-auto">
        
        {/* Top line: Project Title, Subtitle, Tags */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
                {project.code}
              </span>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-500" />
                {project.territory}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                {project.discipline}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-stone-900 dark:text-stone-50 tracking-tight">
              {project.title}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-3xl mt-0.5">
              {project.subtitle}
            </p>
          </div>

          {/* Viability Pill */}
          <div className="self-start md:self-auto shrink-0">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold shadow-xs ${viabilityBadge.color}`}>
              <ViabilityIcon className="w-4 h-4" />
              <span>{viabilityBadge.label}</span>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          
          {/* Presupuesto Total */}
          <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs mb-1">
              <span className="font-medium">Presupuesto Total CLP</span>
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-stone-100">
              {formatCLP(finances.totalBudgetCLP)}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-1">
              <span>Directos: {formatCLP(finances.directExpensesCLP)}</span>
              <span>+ 5% imp</span>
            </div>
          </div>

          {/* Cobertura Presupuestaria */}
          <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs mb-1">
              <span className="font-medium">Cobertura Financiera</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-stone-100 flex items-baseline gap-1.5">
              <span>{formatPct(finances.coveragePct)}</span>
              <span className={`text-[11px] font-normal ${finances.financialGapCLP >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {finances.financialGapCLP >= 0 ? `+${formatCLP(finances.financialGapCLP)}` : `${formatCLP(finances.financialGapCLP)}`}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${finances.coveragePct >= 100 ? 'bg-emerald-500' : finances.coveragePct >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, finances.coveragePct)}%` }}
              />
            </div>
          </div>

          {/* Audiencia / Aforo & Costo por Asistente */}
          <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs mb-1">
              <span className="font-medium">Audiencia & Costo Unitario</span>
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-stone-100">
              {project.fundingRegime.targetAudienceCapacity.toLocaleString('es-CL')} pax
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Costo: <span className="font-medium text-stone-700 dark:text-stone-300">{formatCLP(finances.costPerAudienceMemberCLP)}</span> / espectador
            </div>
          </div>

          {/* Temporalidad & Honorarios */}
          <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs mb-1">
              <span className="font-medium">Plazo & % Honorarios</span>
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-stone-100">
              {project.durationWeeks} semanas
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center justify-between">
              <span>{project.stages.length} etapas</span>
              <span className="font-medium text-amber-700 dark:text-amber-400">
                Honorarios: {formatPct(finances.feesRatioPct)}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
