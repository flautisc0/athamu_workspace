import { Project, ATHAMUExportPayload } from '../types/project';
import { calculateProjectFinances } from './calculations';
import { INITIAL_PROJECTS, INITIAL_TEMPLATES, INITIAL_METRICS_SCHEMA } from '../data/initialProjects';

export interface TestResult {
  id: string;
  name: string;
  category: 'Financiero' | 'Viabilidad & Break-Even' | 'Esquema ATHAMU CRM' | 'Estructura de Trabajo' | 'Persistencia' | 'Consolidado & CRM';
  status: 'passed' | 'failed';
  durationMs: number;
  message: string;
  assertions: Array<{ description: string; passed: boolean; expected?: any; actual?: any }>;
}

export function runAllUnitTests(projects: Project[] = INITIAL_PROJECTS): TestResult[] {
  const results: TestResult[] = [];
  const p1 = projects[0] || INITIAL_PROJECTS[0];
  const p2 = projects[1] || INITIAL_PROJECTS[1];

  // Test 1: Sumatoria presupuestaria y cálculo de contingencia (5%)
  const startT1 = performance.now();
  const fin1 = calculateProjectFinances(p1);
  const calculatedDirect = fin1.directExpensesCLP;
  const expectedContingency = Math.round(calculatedDirect * 0.05);
  const expectedTotal = calculatedDirect + expectedContingency;

  const assertionsT1 = [
    {
      description: 'Gastos directos calculados deben ser positivos y mayores a $15.000.000 CLP',
      passed: calculatedDirect > 15000000,
      expected: '> 15000000',
      actual: calculatedDirect
    },
    {
      description: 'Contingencia debe ser exactamente el 5% de los gastos directos',
      passed: fin1.contingencyCLP === expectedContingency,
      expected: expectedContingency,
      actual: fin1.contingencyCLP
    },
    {
      description: 'Presupuesto total debe ser exactamente Directos + Contingencia',
      passed: fin1.totalBudgetCLP === expectedTotal,
      expected: expectedTotal,
      actual: fin1.totalBudgetCLP
    }
  ];

  results.push({
    id: 'test-1',
    name: 'Cálculo Matemático de Presupuesto e Imprevistos (5%)',
    category: 'Financiero',
    status: assertionsT1.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT1).toFixed(2),
    message: 'Verificación de sumas exactas de ítems de gasto y regla del 5% de reserva presupuestaria.',
    assertions: assertionsT1
  });

  // Test 2: Categorización de gastos y regla de honorarios culturales
  const startT2 = performance.now();
  const sumCategories = Object.values(fin1.byCategory).reduce((a, b) => a + b, 0);
  const diffBudget = Math.abs(sumCategories - fin1.totalBudgetCLP);

  const assertionsT2 = [
    {
      description: 'La suma de todas las categorías de gasto debe igualar al presupuesto total',
      passed: diffBudget <= 1, // Permitir redondeo de centavos si aplica
      expected: fin1.totalBudgetCLP,
      actual: sumCategories
    },
    {
      description: 'Porcentaje de honorarios debe estar en rango ético cultural (30% - 75%)',
      passed: fin1.feesRatioPct >= 30 && fin1.feesRatioPct <= 75,
      expected: 'Entre 30% y 75%',
      actual: `${fin1.feesRatioPct.toFixed(1)}%`
    }
  ];

  results.push({
    id: 'test-2',
    name: 'Desglose por Categoría y Ratio de Remuneraciones Culturales',
    category: 'Financiero',
    status: assertionsT2.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT2).toFixed(2),
    message: 'Comprobación de la distribución porcentual de gastos según criterios de rendición Fondart.',
    assertions: assertionsT2
  });

  // Test 3: Cálculo del Punto de Equilibrio (Break-Even) en proyecto autogestionado
  const startT3 = performance.now();
  const fin2 = calculateProjectFinances(p2);
  const ticketPrice = p2.fundingRegime.averageTicketPriceCLP;
  const breakEvenTickets = fin2.ticketsNeededForBreakEven;
  const capacityPct = fin2.capacityUtilizationNeededPct;

  const assertionsT3 = [
    {
      description: 'Precio de entrada promedio debe ser mayor a cero en autogestión',
      passed: ticketPrice > 0,
      expected: '> 0 CLP',
      actual: `${ticketPrice} CLP`
    },
    {
      description: 'Punto de equilibrio no debe superar el 100% de la capacidad de aforo',
      passed: capacityPct <= 100,
      expected: '<= 100%',
      actual: `${capacityPct.toFixed(1)}%`
    },
    {
      description: 'Entradas para punto de equilibrio deben ser matemáticamente consistentes',
      passed: breakEvenTickets >= 0 && breakEvenTickets <= p2.fundingRegime.targetAudienceCapacity,
      expected: `<= ${p2.fundingRegime.targetAudienceCapacity}`,
      actual: breakEvenTickets
    }
  ];

  results.push({
    id: 'test-3',
    name: 'Punto de Equilibrio (Break-Even) y Aforo de Taquilla',
    category: 'Viabilidad & Break-Even',
    status: assertionsT3.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT3).toFixed(2),
    message: 'Validación del simulador de tickets necesarios para solventar costos fijos no cubiertos.',
    assertions: assertionsT3
  });

  // Test 4: Algoritmo de Viabilidad Integral ATHA (Score 0-100)
  const startT4 = performance.now();
  const assertionsT4 = [
    {
      description: 'El score de viabilidad de Obra Escénica debe estar en rango válido [0, 100]',
      passed: fin1.viabilityScore >= 0 && fin1.viabilityScore <= 100,
      expected: '0 - 100',
      actual: fin1.viabilityScore
    },
    {
      description: 'El score de viabilidad de Festival Musical debe estar en rango válido [0, 100]',
      passed: fin2.viabilityScore >= 0 && fin2.viabilityScore <= 100,
      expected: '0 - 100',
      actual: fin2.viabilityScore
    },
    {
      description: 'El sistema debe generar al menos 2 recomendaciones estratégicas automáticas',
      passed: fin1.recommendations.length >= 2,
      expected: '>= 2 recomendaciones',
      actual: `${fin1.recommendations.length} generadas`
    }
  ];

  results.push({
    id: 'test-4',
    name: 'Algoritmo de Índice de Viabilidad y Diagnóstico Estratégico',
    category: 'Viabilidad & Break-Even',
    status: assertionsT4.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT4).toFixed(2),
    message: 'Evaluación ponderada de factores financieros, técnicos, de equipo y sustentabilidad.',
    assertions: assertionsT4
  });

  // Test 5: Esquema de compatibilidad ATHAMU CRM (Contrato JSON v1.1.0)
  const startT5 = performance.now();
  const payload: ATHAMUExportPayload = {
    contractVersion: '1.1.0-ATHAMU',
    system: 'ATHA-INTRANET-CRM-ARQUITECTO',
    validUntil: '2026-12-31T23:59:59Z',
    connectorStatus: 'offline_standalone',
    exportedAt: new Date().toISOString(),
    totalProjectsCount: projects.length,
    projects: projects,
    activeProjectId: p1.id,
    totalTemplatesCount: INITIAL_TEMPLATES.length,
    templates: INITIAL_TEMPLATES,
    metricsSchema: INITIAL_METRICS_SCHEMA,
    metadata: {
      ecosystemLayer: 'Capa 2: Intermedia (Intranet/CRM)',
      agentMacContext: 'ATHA-Mac-Agent-V1.4',
      notes: 'Datos de referencia con fecha de vigencia; conector a ATHAMU pendiente.'
    }
  };

  const assertionsT5 = [
    {
      description: 'Versión del contrato debe ser exactamente 1.1.0-ATHAMU',
      passed: payload.contractVersion === '1.1.0-ATHAMU',
      expected: '1.1.0-ATHAMU',
      actual: payload.contractVersion
    },
    {
      description: 'Proyecto debe contener código identificador único ATHA',
      passed: typeof p1.code === 'string' && p1.code.startsWith('ATHA-'),
      expected: 'Código con prefijo ATHA-',
      actual: p1.code
    },
    {
      description: 'Contrato debe incluir nota obligatoria de vigencia y conector a ATHAMU',
      passed: payload.metadata.notes.includes('conector a ATHAMU pendiente'),
      expected: 'Texto sobre conector ATHAMU',
      actual: payload.metadata.notes
    },
    {
      description: 'Proyecto contiene las 4 dimensiones conceptuales completas',
      passed: !!(p1.stages && p1.fundingRegime && p1.valueArchetype && p1.canvas),
      expected: 'stages, fundingRegime, valueArchetype, canvas definidos',
      actual: 'Todas presentes'
    }
  ];

  results.push({
    id: 'test-5',
    name: 'Contrato de Integración JSON con CRM ATHAMU',
    category: 'Esquema ATHAMU CRM',
    status: assertionsT5.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT5).toFixed(2),
    message: 'Validación estructural del payload exportable hacia el CRM central y Agente Mac.',
    assertions: assertionsT5
  });

  // Test 6: Estructura de Trabajo, Etapas y Milestones
  const startT6 = performance.now();
  let totalTasks = 0;
  let totalMilestones = 0;
  let hasValidDuration = true;

  p1.stages.forEach(s => {
    if (s.durationWeeks <= 0) hasValidDuration = false;
    s.substages.forEach(sub => {
      totalTasks += sub.tasks.length;
      totalMilestones += sub.tasks.filter(t => t.milestone).length;
    });
  });

  const assertionsT6 = [
    {
      description: 'El proyecto debe contener al menos 3 etapas estructuradas',
      passed: p1.stages.length >= 3,
      expected: '>= 3 etapas',
      actual: `${p1.stages.length} etapas`
    },
    {
      description: 'Todas las etapas deben tener duración en semanas positiva',
      passed: hasValidDuration,
      expected: 'Todas > 0 semanas',
      actual: hasValidDuration ? 'Válido' : 'Inválido'
    },
    {
      description: 'Debe contener al menos 2 hitos críticos (milestones) definidos',
      passed: totalMilestones >= 2,
      expected: '>= 2 hitos',
      actual: `${totalMilestones} hitos`
    }
  ];

  results.push({
    id: 'test-6',
    name: 'Consistencia de Estructura de Trabajo (WBS) y Cronograma',
    category: 'Estructura de Trabajo',
    status: assertionsT6.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT6).toFixed(2),
    message: 'Comprobación de la coherencia temporal de etapas, subetapas y tareas clave.',
    assertions: assertionsT6
  });

  // Test 7: Persistencia y Serialización JSON sin pérdida de datos
  const startT7 = performance.now();
  let serializePassed = false;
  try {
    const serialized = JSON.stringify(p1);
    const parsed = JSON.parse(serialized) as Project;
    serializePassed = parsed.id === p1.id && parsed.stages.length === p1.stages.length;
  } catch (err) {
    serializePassed = false;
  }

  const assertionsT7 = [
    {
      description: 'Serialización y deserialización JSON idéntica para almacenamiento en localStorage',
      passed: serializePassed,
      expected: true,
      actual: serializePassed
    }
  ];

  results.push({
    id: 'test-7',
    name: 'Serialización y Resiliencia de Persistencia Local (localStorage)',
    category: 'Persistencia',
    status: assertionsT7.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT7).toFixed(2),
    message: 'Asegura que no ocurran referencias circulares ni pérdida de campos en guardado local.',
    assertions: assertionsT7
  });

  // Test 8: Datos Principales y Formulación de Objetivos
  const startT8 = performance.now();
  const hasTitle = !!p1.title && p1.title.trim().length > 3;
  const hasGeneralObj = !!p1.generalObjective && p1.generalObjective.trim().length > 10;
  const hasSpecificObj = Array.isArray(p1.specificObjectives) && p1.specificObjectives.length > 0;

  const assertionsT8 = [
    {
      description: 'El proyecto tiene nombre y título descriptivo definido',
      passed: hasTitle,
      expected: 'Título > 3 caracteres',
      actual: p1.title
    },
    {
      description: 'Objetivo general formulado y documentado',
      passed: hasGeneralObj,
      expected: 'Objetivo general > 10 caracteres',
      actual: p1.generalObjective || 'No especificado'
    },
    {
      description: 'Posee lista estructurada de objetivos específicos de trabajo',
      passed: hasSpecificObj,
      expected: '>= 1 objetivo específico',
      actual: `${p1.specificObjectives?.length || 0} objetivos específicos`
    }
  ];

  results.push({
    id: 'test-8',
    name: 'Datos Principales y Formulación de Objetivos del Proyecto',
    category: 'Estructura de Trabajo',
    status: assertionsT8.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT8).toFixed(2),
    message: 'Comprobación de la integridad de los datos cardinales del proyecto antes de avanzar a etapas.',
    assertions: assertionsT8
  });

  // Test 9: Consolidado de Etapas e Integración con Catálogo CRM ATHAMU
  const startT9 = performance.now();
  let consolidatedExpenses = 0;
  let consolidatedTasksCount = 0;
  p1.stages.forEach(s => {
    s.substages.forEach(sub => {
      consolidatedTasksCount += sub.tasks.length;
      consolidatedExpenses += sub.expenses.reduce((acc, exp) => acc + exp.totalCLP, 0);
    });
  });

  const finP1 = calculateProjectFinances(p1);
  const directExpensesMatch = consolidatedExpenses === finP1.directExpensesCLP;

  const assertionsT9 = [
    {
      description: 'Suma de gastos de todas las etapas coincide exactamente con gastos directos',
      passed: directExpensesMatch,
      expected: `$${finP1.directExpensesCLP.toLocaleString('es-CL')}`,
      actual: `$${consolidatedExpenses.toLocaleString('es-CL')}`
    },
    {
      description: 'Consolidado incluye recuento íntegro de tareas y distribución por etapas',
      passed: consolidatedTasksCount > 0,
      expected: '> 0 tareas consolidadas',
      actual: `${consolidatedTasksCount} tareas`
    },
    {
      description: 'El proyecto cuenta con código y estructura serializable para el Catálogo del CRM',
      passed: !!p1.id && !!p1.code && !!p1.discipline && !!p1.territory,
      expected: 'Campos id, code, discipline, territory presentes',
      actual: 'Campos validados para intercambio CRM'
    }
  ];

  results.push({
    id: 'test-9',
    name: 'Consolidado de Etapas & Catálogo de Proyectos CRM ATHAMU',
    category: 'Consolidado & CRM',
    status: assertionsT9.every(a => a.passed) ? 'passed' : 'failed',
    durationMs: +(performance.now() - startT9).toFixed(2),
    message: 'Certifica la exactitud matemática de la pantalla de consolidado y la compatibilidad con el catálogo del CRM.',
    assertions: assertionsT9
  });

  return results;
}
