import React, { useState } from 'react';
import { Project, StrategicCanvas } from '../types/project';
import { FinancialSummary, formatCLP, formatPct } from '../utils/calculations';
import { 
  Compass, 
  Sparkles, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  MapPin, 
  Users, 
  ShieldAlert, 
  Briefcase, 
  Layers, 
  HeartHandshake
} from 'lucide-react';

interface StrategicCanvasViewProps {
  project: Project;
  finances: FinancialSummary;
  onUpdateProject: (updated: Project) => void;
}

export const StrategicCanvasView: React.FC<StrategicCanvasViewProps> = ({
  project,
  finances,
  onUpdateProject
}) => {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);

  const updateCanvasField = (field: keyof StrategicCanvas, value: string) => {
    onUpdateProject({
      ...project,
      canvas: {
        ...project.canvas,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    });
  };

  const generateExecutivePitch = () => {
    return `=====================================================
ATHA PRODUCCIONES LTDA — DOSSIER EJECUTIVO DE PROYECTO
Ecosistema Cultural Santiago · Rancagua
=====================================================

CÓDIGO: ${project.code}
TÍTULO: ${project.title}
SUBTÍTULO: ${project.subtitle}
DISCIPLINA: ${project.discipline}
TERRITORIO: ${project.territory}
ESTADO: ${project.status.toUpperCase()}
DURACIÓN: ${project.durationWeeks} semanas (${project.startDate} a ${project.endDate})

DIRECCIÓN ARTÍSTICA: ${project.artisticDirector}
PRODUCCIÓN EJECUTIVA: ${project.leadProducer}

1. SÍNTESIS ARTÍSTICA Y PROPUESTA DE VALOR
${project.canvas.artisticProposal}

Propuesta de Valor ATHA:
${project.canvas.valuePropositionATHA}

2. PÚBLICOS, AUDIENCIAS Y MEDIACIÓN
Públicos objetivo: ${project.canvas.targetAudiences}
Estrategia de mediación: ${project.canvas.mediationAndAudiences}
Aforo / Audiencia Proyectada: ${project.fundingRegime.targetAudienceCapacity.toLocaleString('es-CL')} personas

3. TERRITORIO, ALIANZAS Y COPRODUCCIÓN
Aliados territoriales: ${project.canvas.territorialAllies}
Impacto territorial (Santiago/Rancagua): ${project.canvas.territorialImpact}

4. MODELO ECONÓMICO Y FINANCIAMIENTO
Régimen: ${project.fundingRegime.type.toUpperCase()} ${project.fundingRegime.publicFundCategory ? `(${project.fundingRegime.publicFundCategory})` : ''}
Presupuesto Total: ${formatCLP(finances.totalBudgetCLP)}
- Gastos Directos: ${formatCLP(finances.directExpensesCLP)}
- Imprevistos (${project.contingencyPct}%): ${formatCLP(finances.contingencyCLP)}
- Financiamiento Proyectado: ${formatCLP(finances.totalProjectedFundingCLP)}
- Cobertura Presupuestaria: ${formatPct(finances.coveragePct)}
- Índice de Viabilidad ATHA: ${finances.viabilityScore}/100 (${finances.viabilityStatus.toUpperCase()})
- Ratio de Honorarios Culturales: ${formatPct(finances.feesRatioPct)}
- Costo por Espectador Directo: ${formatCLP(finances.costPerAudienceMemberCLP)}

5. ARQUETIPO DE VALOR: ${project.valueArchetype.type.toUpperCase()}
${project.valueArchetype.description}

Ejes Estratégicos:
${project.valueArchetype.strategicAxes.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

6. MITIGACIÓN DE RIESGOS
${project.canvas.riskMitigation}

-----------------------------------------------------
"Datos de referencia con fecha de vigencia; conector a ATHAMU pendiente."
Ecosistema ATHA Producciones Ltda — Capa Intermedia Intranet
=====================================================`;
  };

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(generateExecutivePitch());
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner: Canvas Title & Pitch button */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            Dimensión 4 del Arquitecto
          </span>
          <h2 className="text-xl font-bold font-display text-stone-900 dark:text-stone-100 mt-2 flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-600" />
            Lienzo Cultural ATHA (Strategic Cultural Canvas)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-3xl mt-1">
            Matriz estratégica de 9 bloques que unifica propuesta estética, sustentabilidad económica, vinculación con el territorio (Santiago/Rancagua) y mitigación de riesgos para pitch a fondos públicos o coproductores.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPitchModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 text-amber-400 dark:text-amber-600" />
            <span>Ficha Ejecutiva / Pitch</span>
          </button>
          
          <button
            onClick={handlePrint}
            title="Imprimir o guardar como PDF"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* 9-Block Cultural Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Bloque 1: Propuesta Artística */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>1. Propuesta Artística & Conceptual</span>
          </div>
          <p className="text-[11px] text-stone-500">¿Qué discurso o dramaturgia define la obra o evento?</p>
          <textarea
            rows={4}
            value={project.canvas.artisticProposal}
            onChange={(e) => updateCanvasField('artisticProposal', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 2: Propuesta de Valor ATHA */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Briefcase className="w-4 h-4" />
            <span>2. Propuesta de Valor ATHA</span>
          </div>
          <p className="text-[11px] text-stone-500">¿Qué sello de producción, rigor técnico o calidad aporta ATHA?</p>
          <textarea
            rows={4}
            value={project.canvas.valuePropositionATHA}
            onChange={(e) => updateCanvasField('valuePropositionATHA', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 3: Públicos & Comunidades */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Users className="w-4 h-4" />
            <span>3. Públicos & Segmentos</span>
          </div>
          <p className="text-[11px] text-stone-500">¿A quién va dirigido? Comunidades, edad, territorios.</p>
          <textarea
            rows={4}
            value={project.canvas.targetAudiences}
            onChange={(e) => updateCanvasField('targetAudiences', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 4: Mediación & Formación */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <HeartHandshake className="w-4 h-4" />
            <span>4. Mediación & Desarrollo de Públicos</span>
          </div>
          <p className="text-[11px] text-stone-500">Talleres, cuadernillos, coloquios post-función, vinculación escolar.</p>
          <textarea
            rows={4}
            value={project.canvas.mediationAndAudiences}
            onChange={(e) => updateCanvasField('mediationAndAudiences', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 5: Aliados Territoriales */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <MapPin className="w-4 h-4" />
            <span>5. Aliados Territoriales & Coproducción</span>
          </div>
          <p className="text-[11px] text-stone-500">Salas de teatro, centros culturales, municipios, patrocinadores.</p>
          <textarea
            rows={4}
            value={project.canvas.territorialAllies}
            onChange={(e) => updateCanvasField('territorialAllies', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 6: Impacto Territorial & Descentralización */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Layers className="w-4 h-4" />
            <span>6. Impacto Territorial & Descentralización</span>
          </div>
          <p className="text-[11px] text-stone-500">Retorno cultural a Rancagua/O'Higgins y Región Metropolitana.</p>
          <textarea
            rows={4}
            value={project.canvas.territorialImpact}
            onChange={(e) => updateCanvasField('territorialImpact', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 7: Recursos Críticos & Equipamiento */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Briefcase className="w-4 h-4" />
            <span>7. Recursos Críticos & Equipamiento</span>
          </div>
          <p className="text-[11px] text-stone-500">Elenco, técnica de audio/iluminación, fletes, permisos.</p>
          <textarea
            rows={4}
            value={project.canvas.criticalResources}
            onChange={(e) => updateCanvasField('criticalResources', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 8: Actividades Clave */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Layers className="w-4 h-4" />
            <span>8. Actividades & Entregables Clave</span>
          </div>
          <p className="text-[11px] text-stone-500">Ensayos, construcción escénica, funciones, registro 4K.</p>
          <textarea
            rows={4}
            value={project.canvas.keyActivities}
            onChange={(e) => updateCanvasField('keyActivities', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Bloque 9: Mitigación de Riesgos & Contingencia */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>9. Mitigación de Riesgos & Contingencia ({project.contingencyPct}%)</span>
          </div>
          <p className="text-[11px] text-stone-500">Estrategias ante bajas de taquilla, cambios de sala o clima.</p>
          <textarea
            rows={4}
            value={project.canvas.riskMitigation}
            onChange={(e) => updateCanvasField('riskMitigation', e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 resize-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

      </div>

      {/* PITCH MODAL */}
      {showPitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                  Ficha Ejecutiva / Pitch Deck Cultural (ATHA)
                </h3>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <pre className="p-4 rounded-xl bg-stone-100 dark:bg-stone-950 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed border border-stone-200 dark:border-stone-800">
                {generateExecutivePitch()}
              </pre>
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Formato listo para copiar a dossier de postulación
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyPitch}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {copiedPitch ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPitch ? 'Copiado al portapapeles' : 'Copiar Texto Completo'}</span>
                </button>
                <button
                  onClick={() => setShowPitchModal(false)}
                  className="px-3 py-2 text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
