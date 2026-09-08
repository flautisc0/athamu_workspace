import { Project, ExpenseCategory, ExpenseFundingSource } from '../types/project';

export interface FinancialSummary {
  directExpensesCLP: number;
  contingencyCLP: number;
  totalBudgetCLP: number;
  
  // Por categoría
  byCategory: Record<ExpenseCategory, number>;
  byCategoryPct: Record<ExpenseCategory, number>;
  
  // Por fuente asignada en gastos
  bySource: Record<ExpenseFundingSource, number>;
  bySourcePct: Record<ExpenseFundingSource, number>;
  
  // Fuentes de financiamiento proyectadas / confirmadas
  totalProjectedFundingCLP: number;
  publicFundingCLP: number;
  ownContributionCLP: number;
  thirdPartyContributionCLP: number;
  boxOfficeProjectedCLP: number;
  sponsorshipCLP: number;
  
  // Brecha y cobertura
  financialGapCLP: number; // Déficit o superávit (Financiamiento - Presupuesto)
  coveragePct: number; // Porcentaje de cobertura del presupuesto
  
  // Break-even (Punto de Equilibrio de Taquilla)
  ticketPrice: number;
  fixedCostsToCoverWithTicketsCLP: number;
  ticketsNeededForBreakEven: number;
  capacityUtilizationNeededPct: number;
  
  // Indicadores Culturales
  feesRatioPct: number; // % Honorarios vs Total (Clave para fondos concursables, norma Fondart suele sugerir 40%-60%)
  productionRatioPct: number;
  costPerAudienceMemberCLP: number;
  
  // Viability Score
  viabilityScore: number;
  viabilityStatus: 'optima' | 'viable_con_observaciones' | 'en_riesgo' | 'critica';
  recommendations: Array<{
    type: 'success' | 'warning' | 'danger' | 'info';
    message: string;
    action?: string;
  }>;
}

export function formatCLP(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '$ 0';
  return `$ ${Math.round(amount).toLocaleString('es-CL')}`;
}

export function formatPct(value: number): string {
  if (isNaN(value)) return '0%';
  return `${(value).toFixed(1)}%`;
}

export function calculateProjectFinances(project: Project): FinancialSummary {
  // Sumar todos los gastos de todas las etapas y subetapas
  let directExpensesCLP = 0;
  
  const byCategory: Record<ExpenseCategory, number> = {
    honorarios: 0,
    produccion: 0,
    tecnica_equipos: 0,
    difusion_marketing: 0,
    logistica_traslados: 0,
    espacios_salas: 0,
    imprevistos: 0,
  };

  const bySource: Record<ExpenseFundingSource, number> = {
    fondo_solicitado: 0,
    aporte_propio_pecuniario: 0,
    aporte_propio_valorizado: 0,
    aporte_terceros_pecuniario: 0,
    aporte_terceros_valorizado: 0,
    taquilla_esperada: 0,
    auspicio_privado: 0,
  };

  project.stages.forEach(stage => {
    stage.substages.forEach(sub => {
      sub.expenses.forEach(exp => {
        const itemTotal = (exp.unitCostCLP || 0) * (exp.quantity || 0);
        directExpensesCLP += itemTotal;
        
        if (byCategory[exp.category] !== undefined) {
          byCategory[exp.category] += itemTotal;
        } else {
          byCategory.produccion += itemTotal;
        }

        if (bySource[exp.fundingSource] !== undefined) {
          bySource[exp.fundingSource] += itemTotal;
        } else {
          bySource.fondo_solicitado += itemTotal;
        }
      });
    });
  });

  const contingencyRate = (project.contingencyPct || 5) / 100;
  const contingencyCLP = Math.round(directExpensesCLP * contingencyRate);
  byCategory.imprevistos += contingencyCLP;
  const totalBudgetCLP = directExpensesCLP + contingencyCLP;

  // Porcentajes por categoría
  const byCategoryPct: Record<ExpenseCategory, number> = {
    honorarios: totalBudgetCLP > 0 ? (byCategory.honorarios / totalBudgetCLP) * 100 : 0,
    produccion: totalBudgetCLP > 0 ? (byCategory.produccion / totalBudgetCLP) * 100 : 0,
    tecnica_equipos: totalBudgetCLP > 0 ? (byCategory.tecnica_equipos / totalBudgetCLP) * 100 : 0,
    difusion_marketing: totalBudgetCLP > 0 ? (byCategory.difusion_marketing / totalBudgetCLP) * 100 : 0,
    logistica_traslados: totalBudgetCLP > 0 ? (byCategory.logistica_traslados / totalBudgetCLP) * 100 : 0,
    espacios_salas: totalBudgetCLP > 0 ? (byCategory.espacios_salas / totalBudgetCLP) * 100 : 0,
    imprevistos: totalBudgetCLP > 0 ? (byCategory.imprevistos / totalBudgetCLP) * 100 : 0,
  };

  const bySourcePct: Record<ExpenseFundingSource, number> = {
    fondo_solicitado: totalBudgetCLP > 0 ? (bySource.fondo_solicitado / totalBudgetCLP) * 100 : 0,
    aporte_propio_pecuniario: totalBudgetCLP > 0 ? (bySource.aporte_propio_pecuniario / totalBudgetCLP) * 100 : 0,
    aporte_propio_valorizado: totalBudgetCLP > 0 ? (bySource.aporte_propio_valorizado / totalBudgetCLP) * 100 : 0,
    aporte_terceros_pecuniario: totalBudgetCLP > 0 ? (bySource.aporte_terceros_pecuniario / totalBudgetCLP) * 100 : 0,
    aporte_terceros_valorizado: totalBudgetCLP > 0 ? (bySource.aporte_terceros_valorizado / totalBudgetCLP) * 100 : 0,
    taquilla_esperada: totalBudgetCLP > 0 ? (bySource.taquilla_esperada / totalBudgetCLP) * 100 : 0,
    auspicio_privado: totalBudgetCLP > 0 ? (bySource.auspicio_privado / totalBudgetCLP) * 100 : 0,
  };

  // Calcular financiamiento proyectado desde FundingRegime
  const regime = project.fundingRegime;
  let publicFundingCLP = 0;
  let ownContributionCLP = 0;
  let thirdPartyContributionCLP = 0;
  let sponsorshipCLP = 0;

  if (regime.type === 'fondos_publicos' || regime.type === 'mixto') {
    publicFundingCLP = regime.requestedAmountCLP || 0;
  }

  regime.confirmedSources.forEach(src => {
    if (src.category === 'aporte_propio') {
      ownContributionCLP += src.amountCLP;
    } else if (src.category === 'aporte_tercero') {
      thirdPartyContributionCLP += src.amountCLP;
    } else if (src.category === 'auspicio') {
      sponsorshipCLP += src.amountCLP;
    } else if (src.category === 'fondos_publicos' && regime.type !== 'fondos_publicos' && regime.type !== 'mixto') {
      publicFundingCLP += src.amountCLP;
    }
  });

  const ticketPrice = regime.averageTicketPriceCLP || 0;
  const expectedTickets = regime.expectedTicketSalesCount || 0;
  const boxOfficeProjectedCLP = ticketPrice * expectedTickets;

  const totalProjectedFundingCLP = 
    publicFundingCLP + 
    ownContributionCLP + 
    thirdPartyContributionCLP + 
    sponsorshipCLP + 
    boxOfficeProjectedCLP;

  const financialGapCLP = totalProjectedFundingCLP - totalBudgetCLP;
  const coveragePct = totalBudgetCLP > 0 ? (totalProjectedFundingCLP / totalBudgetCLP) * 100 : 0;

  // Break-even
  const nonBoxOfficeFunding = publicFundingCLP + ownContributionCLP + thirdPartyContributionCLP + sponsorshipCLP;
  const fixedCostsToCoverWithTicketsCLP = Math.max(0, totalBudgetCLP - nonBoxOfficeFunding);
  const ticketsNeededForBreakEven = ticketPrice > 0 
    ? Math.ceil(fixedCostsToCoverWithTicketsCLP / ticketPrice) 
    : 0;

  const targetCapacity = Math.max(1, regime.targetAudienceCapacity || 1);
  const capacityUtilizationNeededPct = Math.min(100, (ticketsNeededForBreakEven / targetCapacity) * 100);

  // Ratios culturales
  const feesRatioPct = totalBudgetCLP > 0 ? (byCategory.honorarios / totalBudgetCLP) * 100 : 0;
  const productionRatioPct = totalBudgetCLP > 0 ? ((byCategory.produccion + byCategory.tecnica_equipos) / totalBudgetCLP) * 100 : 0;
  const totalAudience = Math.max(1, regime.targetAudienceCapacity || 1);
  const costPerAudienceMemberCLP = Math.round(totalBudgetCLP / totalAudience);

  // Viability Score (0 - 100)
  let score = 0;
  const recommendations: Array<{
    type: 'success' | 'warning' | 'danger' | 'info';
    message: string;
    action?: string;
  }> = [];

  // Dimensión 1: Cobertura financiera (max 40 pts)
  if (coveragePct >= 100) {
    score += 40;
    recommendations.push({
      type: 'success',
      message: `Presupuesto 100% cubierto (${formatPct(coveragePct)}). Equilibrio financiero asegurado.`
    });
  } else if (coveragePct >= 80) {
    score += 28;
    recommendations.push({
      type: 'warning',
      message: `Cobertura al ${formatPct(coveragePct)}. Existe una brecha de ${formatCLP(Math.abs(financialGapCLP))}.`,
      action: 'Buscar co-financiamiento o auspicio local para cerrar el déficit.'
    });
  } else if (coveragePct >= 50) {
    score += 15;
    recommendations.push({
      type: 'danger',
      message: `Cobertura crítica del ${formatPct(coveragePct)}. Déficit de ${formatCLP(Math.abs(financialGapCLP))}.`,
      action: 'Reajustar presupuesto o incorporar venta anticipada / fondo complementario.'
    });
  } else {
    score += 5;
    recommendations.push({
      type: 'danger',
      message: `Cobertura insuficiente (${formatPct(coveragePct)}). Alto riesgo de insolvencia.`,
      action: 'Reestructurar el modelo económico o reducir escala del proyecto.'
    });
  }

  // Dimensión 2: Proporción de Honorarios (max 20 pts)
  if (feesRatioPct >= 35 && feesRatioPct <= 65) {
    score += 20;
    recommendations.push({
      type: 'success',
      message: `Honorarios en rango virtuoso (${formatPct(feesRatioPct)}). Cumple estándares éticos y criterios Fondart/Fondo Música.`
    });
  } else if (feesRatioPct < 35) {
    score += 10;
    recommendations.push({
      type: 'warning',
      message: `Honorarios representan solo el ${formatPct(feesRatioPct)} del presupuesto total.`,
      action: 'Verificar si el equipo artístico y técnico está recibiendo remuneraciones dignas.'
    });
  } else {
    score += 10;
    recommendations.push({
      type: 'warning',
      message: `Honorarios superan el ${formatPct(feesRatioPct)} del total. Puede haber desbalance en gastos técnicos/producción.`,
      action: 'Asegurar que los recursos de escenografía, sonido y difusión no queden desprotegidos.'
    });
  }

  // Dimensión 3: Viabilidad de Taquilla / Break-Even (max 20 pts)
  if (regime.type === 'autogestion' || regime.type === 'mixto') {
    if (capacityUtilizationNeededPct <= 60) {
      score += 20;
      recommendations.push({
        type: 'success',
        message: `Punto de equilibrio alcanzable: solo requiere ${ticketsNeededForBreakEven} entradas vendidas (${formatPct(capacityUtilizationNeededPct)} del aforo).`
      });
    } else if (capacityUtilizationNeededPct <= 85) {
      score += 12;
      recommendations.push({
        type: 'warning',
        message: `Punto de equilibrio exige el ${formatPct(capacityUtilizationNeededPct)} de la capacidad (${ticketsNeededForBreakEven} tickets).`,
        action: 'Reforzar campaña de preventa o ajustar precio promedio de entrada.'
      });
    } else {
      score += 4;
      recommendations.push({
        type: 'danger',
        message: `Punto de equilibrio crítico: se requiere ${formatPct(capacityUtilizationNeededPct)} de ocupación para no perder dinero.`,
        action: 'Riesgo alto: diversificar ingresos con auspicios o reducir costos fijos.'
      });
    }
  } else {
    // Fondos públicos no dependen estrictamente de venta de taquilla
    score += 20;
    recommendations.push({
      type: 'info',
      message: 'Proyecto respaldado primordialmente por financiamiento institucional o asignación concursable.'
    });
  }

  // Dimensión 4: Coherencia de Etapas y Planificación (max 20 pts)
  const completedOrPlannedStages = project.stages.length;
  let totalTasks = 0;
  project.stages.forEach(s => s.substages.forEach(sub => totalTasks += sub.tasks.length));

  if (completedOrPlannedStages >= 3 && totalTasks >= 6) {
    score += 20;
  } else if (completedOrPlannedStages >= 2 && totalTasks >= 3) {
    score += 12;
    recommendations.push({
      type: 'info',
      message: 'Estructura de trabajo en desarrollo: se recomienda detallar más tareas operativas y de mediación.'
    });
  } else {
    score += 5;
    recommendations.push({
      type: 'warning',
      message: 'Estructura de trabajo incompleta. Faltan etapas o tareas críticas para validar el cronograma.'
    });
  }

  // Clamping score 0-100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  let viabilityStatus: 'optima' | 'viable_con_observaciones' | 'en_riesgo' | 'critica' = 'optima';
  if (finalScore >= 80) viabilityStatus = 'optima';
  else if (finalScore >= 65) viabilityStatus = 'viable_con_observaciones';
  else if (finalScore >= 45) viabilityStatus = 'en_riesgo';
  else viabilityStatus = 'critica';

  return {
    directExpensesCLP,
    contingencyCLP,
    totalBudgetCLP,
    byCategory,
    byCategoryPct,
    bySource,
    bySourcePct,
    totalProjectedFundingCLP,
    publicFundingCLP,
    ownContributionCLP,
    thirdPartyContributionCLP,
    boxOfficeProjectedCLP,
    sponsorshipCLP,
    financialGapCLP,
    coveragePct,
    ticketPrice,
    fixedCostsToCoverWithTicketsCLP,
    ticketsNeededForBreakEven,
    capacityUtilizationNeededPct,
    feesRatioPct,
    productionRatioPct,
    costPerAudienceMemberCLP,
    viabilityScore: finalScore,
    viabilityStatus,
    recommendations,
  };
}
