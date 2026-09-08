import React, { useState } from 'react';
import { 
  Project, 
  FundingType, 
  PublicFundCategory, 
  FundingSourceItem, 
  ExpenseCategory 
} from '../types/project';
import { FinancialSummary, formatCLP, formatPct } from '../utils/calculations';
import { 
  Coins, 
  PieChart, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  HelpCircle,
  TrendingUp,
  Landmark,
  Ticket
} from 'lucide-react';

interface EconomicModelViewProps {
  project: Project;
  finances: FinancialSummary;
  onUpdateProject: (updated: Project) => void;
}

export const EconomicModelView: React.FC<EconomicModelViewProps> = ({
  project,
  finances,
  onUpdateProject
}) => {
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState<'fondos_publicos' | 'aporte_propio' | 'aporte_tercero' | 'taquilla' | 'auspicio'>('aporte_propio');
  const [newSourceType, setNewSourceType] = useState<'pecuniario' | 'valorizado'>('pecuniario');
  const [newSourceAmount, setNewSourceAmount] = useState<number>(500000);
  const [newSourceNotes, setNewSourceNotes] = useState('');

  // Handlers to update funding regime
  const handleRegimeTypeChange = (type: FundingType) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        type
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleFundCategoryChange = (cat: PublicFundCategory) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        publicFundCategory: cat
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleRequestedAmountChange = (val: number) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        requestedAmountCLP: Math.max(0, val)
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleTicketPriceChange = (price: number) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        averageTicketPriceCLP: Math.max(0, price)
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleExpectedTicketsChange = (count: number) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        expectedTicketSalesCount: Math.max(0, count)
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleCapacityChange = (capacity: number) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        targetAudienceCapacity: Math.max(1, capacity)
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleContingencyChange = (pct: number) => {
    onUpdateProject({
      ...project,
      contingencyPct: Math.max(0, Math.min(20, pct)),
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddFundingSource = () => {
    if (!newSourceName.trim()) return;
    const newSource: FundingSourceItem = {
      id: `src-${Date.now()}`,
      name: newSourceName.trim(),
      category: newSourceCategory,
      type: newSourceType,
      amountCLP: Math.max(0, newSourceAmount),
      verified: true,
      notes: newSourceNotes.trim() || undefined
    };

    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        confirmedSources: [...project.fundingRegime.confirmedSources, newSource]
      },
      updatedAt: new Date().toISOString()
    });

    setNewSourceName('');
    setNewSourceAmount(500000);
    setNewSourceNotes('');
  };

  const handleDeleteFundingSource = (sourceId: string) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        confirmedSources: project.fundingRegime.confirmedSources.filter(s => s.id !== sourceId)
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleToggleSourceVerified = (sourceId: string) => {
    onUpdateProject({
      ...project,
      fundingRegime: {
        ...project.fundingRegime,
        confirmedSources: project.fundingRegime.confirmedSources.map(s => {
          if (s.id === sourceId) {
            return { ...s, verified: !s.verified };
          }
          return s;
        })
      },
      updatedAt: new Date().toISOString()
    });
  };

  const categoryNames: Record<ExpenseCategory, string> = {
    honorarios: 'Honorarios & Elenco',
    produccion: 'Producción & Montaje',
    tecnica_equipos: 'Técnica & Equipamiento',
    difusion_marketing: 'Difusión & Mediación',
    logistica_traslados: 'Logística & Giras',
    espacios_salas: 'Salas & Locaciones',
    imprevistos: 'Imprevistos (5%)'
  };

  const categoryColors: Record<ExpenseCategory, string> = {
    honorarios: 'bg-amber-500',
    produccion: 'bg-indigo-500',
    tecnica_equipos: 'bg-cyan-500',
    difusion_marketing: 'bg-emerald-500',
    logistica_traslados: 'bg-rose-500',
    espacios_salas: 'bg-purple-500',
    imprevistos: 'bg-stone-400'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Section: Regime selection & High-level KPIs */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-600" />
              Régimen de Financiamiento & Modelo Económico
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Ajusta si el proyecto compite en fondos públicos (Fondart, Fondo de la Música) o se sustenta mediante autogestión y taquilla.
            </p>
          </div>

          {/* Regime Selector Buttons */}
          <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => handleRegimeTypeChange('fondos_publicos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                project.fundingRegime.type === 'fondos_publicos'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Fondos Públicos
            </button>
            <button
              onClick={() => handleRegimeTypeChange('autogestion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                project.fundingRegime.type === 'autogestion'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Autogestión
            </button>
            <button
              onClick={() => handleRegimeTypeChange('mixto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                project.fundingRegime.type === 'mixto'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Modelo Mixto
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on Regime */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
          {(project.fundingRegime.type === 'fondos_publicos' || project.fundingRegime.type === 'mixto') && (
            <>
              <div>
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">
                  Línea Concursable de Postulación
                </label>
                <select
                  value={project.fundingRegime.publicFundCategory || 'Fondart Nacional'}
                  onChange={(e) => handleFundCategoryChange(e.target.value as PublicFundCategory)}
                  className="w-full text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
                >
                  <option value="Fondart Nacional">Fondart Nacional (Trayectoria / Emergente)</option>
                  <option value="Fondart Regional">Fondart Regional (O'Higgins / RM)</option>
                  <option value="Fondo de Artes Escénicas">Fondo de Artes Escénicas (Mincap)</option>
                  <option value="Fondo de la Música">Fondo de Fomento de la Música Nacional</option>
                  <option value="CORFO Economía Creativa">CORFO / Sercotec Economía Creativa</option>
                  <option value="FNDR 8% O'Higgins / RM">FNDR 8% Comunitario / Cultural</option>
                  <option value="Otro">Otro Fondo Concursable</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">
                  Monto Solicitado al Fondo (CLP)
                </label>
                <input
                  type="number"
                  step="100000"
                  value={project.fundingRegime.requestedAmountCLP}
                  onChange={(e) => handleRequestedAmountChange(Number(e.target.value))}
                  className="w-full text-xs font-mono font-semibold p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">
              Reserva de Contingencia / Imprevistos (% sobre directos)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="20"
                value={project.contingencyPct}
                onChange={(e) => handleContingencyChange(Number(e.target.value))}
                className="w-20 text-xs font-mono p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
              />
              <span className="text-xs text-stone-500">
                = {formatCLP(finances.contingencyCLP)} (estándar 5%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Budget Breakdown & Break-Even Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: Budget Breakdown by Category */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-500" />
                Desglose Presupuestario por Categoría
              </h3>
              <p className="text-xs text-stone-500">
                Presupuesto consolidado: {formatCLP(finances.totalBudgetCLP)}
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {formatPct(finances.feesRatioPct)}
              </span>
              <span className="text-stone-500 block text-[10px]">Honorarios</span>
            </div>
          </div>

          {/* Visual Stacked Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-stone-100 dark:bg-stone-800">
            {(Object.keys(finances.byCategory) as ExpenseCategory[]).map(cat => {
              const pct = finances.byCategoryPct[cat];
              if (pct <= 0) return null;
              return (
                <div 
                  key={cat}
                  className={`${categoryColors[cat]} h-full transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${categoryNames[cat]}: ${formatCLP(finances.byCategory[cat])} (${formatPct(pct)})`}
                />
              );
            })}
          </div>

          {/* Category List */}
          <div className="space-y-2 pt-2">
            {(Object.keys(finances.byCategory) as ExpenseCategory[]).map(cat => {
              const amount = finances.byCategory[cat];
              const pct = finances.byCategoryPct[cat];
              return (
                <div key={cat} className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-50/70 dark:bg-stone-800/40">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${categoryColors[cat]} shrink-0`} />
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {categoryNames[cat]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">
                      {formatCLP(amount)}
                    </span>
                    <span className="w-12 text-right font-mono text-[11px] text-stone-500">
                      {formatPct(pct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cultural benchmark footnote */}
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Criterio Fondart / Mincap:</strong> Se recomienda que el ítem de honorarios represente entre 40% y 60% del total para garantizar remuneraciones éticas sin desproteger la viabilidad técnica ni la difusión.
            </p>
          </div>
        </div>

        {/* RIGHT: Break-Even Simulator & Ticket Capacity */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              Simulador de Viabilidad & Punto de Equilibrio (Break-Even)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Ajusta las condiciones de aforo, precio de entrada y ventas para simular la sostenibilidad del proyecto en taquilla.
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            
            {/* Price slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  Precio Promedio de Entrada (CLP):
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {formatCLP(project.fundingRegime.averageTicketPriceCLP)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30000"
                step="1000"
                value={project.fundingRegime.averageTicketPriceCLP}
                onChange={(e) => handleTicketPriceChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Expected Tickets */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  Entradas Proyectadas a Vender:
                </span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {project.fundingRegime.expectedTicketSalesCount} tickets ({formatCLP(project.fundingRegime.expectedTicketSalesCount * project.fundingRegime.averageTicketPriceCLP)})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(1500, project.fundingRegime.targetAudienceCapacity)}
                step="25"
                value={project.fundingRegime.expectedTicketSalesCount}
                onChange={(e) => handleExpectedTicketsChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Total Venue Capacity */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  Capacidad Total de Aforo (Salas / Festival):
                </span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  {project.fundingRegime.targetAudienceCapacity} personas
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={project.fundingRegime.targetAudienceCapacity}
                onChange={(e) => handleCapacityChange(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

          </div>

          {/* Break-even Diagnostic Card */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Resultado de Punto de Equilibrio:
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                finances.capacityUtilizationNeededPct <= 70
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}>
                {finances.capacityUtilizationNeededPct <= 70 ? 'Viable' : 'Exigente'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                <div className="text-[11px] text-stone-500">Tickets para no perder</div>
                <div className="text-xl font-bold font-display text-stone-900 dark:text-stone-100">
                  {finances.ticketsNeededForBreakEven}
                </div>
                <div className="text-[10px] text-stone-400">
                  de {project.fundingRegime.targetAudienceCapacity} aforo
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                <div className="text-[11px] text-stone-500">Ocupación Requerida</div>
                <div className="text-xl font-bold font-display text-stone-900 dark:text-stone-100">
                  {formatPct(finances.capacityUtilizationNeededPct)}
                </div>
                <div className="text-[10px] text-stone-400">del aforo total</div>
              </div>
            </div>

            {/* Gap Analysis */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/80 dark:border-stone-700/80">
              <span className="text-stone-600 dark:text-stone-400">Brecha Financiera Proyectada:</span>
              <span className={`font-mono font-bold ${
                finances.financialGapCLP >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {finances.financialGapCLP >= 0 ? `+${formatCLP(finances.financialGapCLP)} (Superávit)` : `${formatCLP(finances.financialGapCLP)} (Déficit)`}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmed and Projected Funding Sources Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              Fuentes de Financiamiento Confirmadas y Aportes
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Registra los aportes pecuniarios (dinero en cuenta) y aportes valorizados (salas cedidas, equipos, difusión).
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="text-stone-500">Total Proyectado:</span>{' '}
            <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
              {formatCLP(finances.totalProjectedFundingCLP)}
            </span>
          </div>
        </div>

        {/* Sources List */}
        <div className="space-y-2">
          {project.fundingRegime.confirmedSources.map((src) => (
            <div 
              key={src.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/50 text-xs"
            >
              <div className="flex items-start sm:items-center gap-2.5">
                <button
                  onClick={() => handleToggleSourceVerified(src.id)}
                  title={src.verified ? 'Fuente confirmada / respaldada' : 'Fuente tentativa / por confirmar'}
                  className="cursor-pointer mt-0.5 sm:mt-0"
                >
                  <CheckCircle2 className={`w-4 h-4 ${src.verified ? 'text-emerald-600' : 'text-stone-400'}`} />
                </button>
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">
                    {src.name}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="capitalize">{src.category.replace('_', ' ')}</span>
                    <span>·</span>
                    <span className="capitalize">{src.type}</span>
                    {src.notes && <span>· {src.notes}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                  {formatCLP(src.amountCLP)}
                </span>
                <button
                  onClick={() => handleDeleteFundingSource(src.id)}
                  className="text-stone-400 hover:text-rose-600 cursor-pointer p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Source Form */}
        <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
          <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
            + Agregar Fuente de Financiamiento o Auspicio
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input
              type="text"
              placeholder="Nombre del fondo o aportante..."
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="sm:col-span-2 text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            />
            <select
              value={newSourceCategory}
              onChange={(e) => setNewSourceCategory(e.target.value as any)}
              className="text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            >
              <option value="aporte_propio">Aporte Propio</option>
              <option value="aporte_tercero">Aporte Tercero</option>
              <option value="fondos_publicos">Fondo Público</option>
              <option value="taquilla">Taquilla</option>
              <option value="auspicio">Auspicio Privado</option>
            </select>
            <select
              value={newSourceType}
              onChange={(e) => setNewSourceType(e.target.value as any)}
              className="text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            >
              <option value="pecuniario">Pecuniario (Dinero)</option>
              <option value="valorizado">Valorizado (Especie/Sala)</option>
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                step="50000"
                placeholder="Monto CLP"
                value={newSourceAmount}
                onChange={(e) => setNewSourceAmount(Number(e.target.value))}
                className="w-full text-xs font-mono p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
              />
              <button
                onClick={handleAddFundingSource}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Automated Recommendations Bar */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-3">
        <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          Diagnóstico de Viabilidad Económica & Recomendaciones Estratégicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {finances.recommendations.map((rec, idx) => (
            <div 
              key={idx}
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                rec.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-300'
                  : rec.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300'
                  : rec.type === 'danger'
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-300'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                {rec.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                {rec.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                {rec.type === 'danger' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                {rec.type === 'info' && <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                <span>{rec.message}</span>
              </div>
              {rec.action && (
                <div className="pl-5 text-[11px] opacity-90">
                  👉 <strong>Acción recomendada:</strong> {rec.action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
