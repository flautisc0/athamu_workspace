import React, { useState, useEffect } from 'react';
import { Project } from '../types/project';
import { runAllUnitTests, TestResult } from '../utils/unitTests';
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  Clock,
  Layers
} from 'lucide-react';

interface UnitTestsViewProps {
  projects: Project[];
}

export const UnitTestsView: React.FC<UnitTestsViewProps> = ({ projects }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllUnitTests(projects);
      setResults(res);
      setIsRunning(false);
    }, 400);
  };

  useEffect(() => {
    executeTests();
  }, [projects]);

  const toggleExpand = (id: string) => {
    setExpandedTests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === 'passed').length;
  const failedTests = totalTests - passedTests;
  const allPassed = totalTests > 0 && failedTests === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner: Suite title & Runner controls */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Garantía de Calidad & Verificación
          </span>
          <h2 className="text-xl font-bold font-display text-stone-900 dark:text-stone-100 mt-2 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            Suite de Pruebas Unitarias del Sistema
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-2xl mt-1">
            Verificación automatizada en tiempo real de algoritmos financieros, cálculo del 5% de imprevistos, punto de equilibrio (break-even), índice de viabilidad y contrato de esquema JSON con CRM ATHAMU.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={executeTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{isRunning ? 'Ejecutando...' : 'Re-ejecutar Pruebas'}</span>
          </button>
        </div>
      </div>

      {/* Summary Score Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${
          allPassed 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>Estado General</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-display">
            {allPassed ? '100% Aprobado' : `${failedTests} Fallos`}
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">
            {allPassed ? 'Todos los componentes críticos certificados' : 'Revisar detalles en la consola inferior'}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span>Pruebas Ejecutadas</span>
            <FlaskConical className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
            {passedTests} / {totalTests}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Cobertura de los 5 módulos funcionales
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span>Tiempo de Respuesta</span>
            <Clock className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
            {results.reduce((acc, r) => acc + r.durationMs, 0).toFixed(1)} ms
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Ejecución ultra-rápida en navegador
          </div>
        </div>
      </div>

      {/* Tests Results List */}
      <div className="space-y-3">
        {results.map((test) => {
          const isExpanded = expandedTests[test.id] !== false; // Default expanded
          const isPassed = test.status === 'passed';

          return (
            <div
              key={test.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden transition-all"
            >
              {/* Test Header */}
              <div 
                onClick={() => toggleExpand(test.id)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-800/40 select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                        {test.category}
                      </span>
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-400 font-mono">{test.durationMs}ms</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                      {test.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {test.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    isPassed 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {isPassed ? 'PASSED' : 'FAILED'}
                  </span>
                  <div className="text-stone-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expandable Assertions Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-800/20 space-y-2">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    Aserciones Validadas ({test.assertions.length}):
                  </div>
                  <div className="space-y-1.5">
                    {test.assertions.map((assertion, aIdx) => (
                      <div 
                        key={aIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${assertion.passed ? 'bg-emerald-500' : 'bg-rose-500'} shrink-0`} />
                          <span className="font-medium text-stone-800 dark:text-stone-200">
                            {assertion.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500 pl-4 sm:pl-0">
                          {assertion.expected !== undefined && (
                            <span>Esperado: <strong className="text-stone-700 dark:text-stone-300">{String(assertion.expected)}</strong></span>
                          )}
                          {assertion.actual !== undefined && (
                            <span>| Real: <strong className={assertion.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>{String(assertion.actual)}</strong></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
