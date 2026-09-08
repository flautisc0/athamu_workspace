import { Project, ProjectTemplate, MetricsSchema } from '../types/project';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'atha-prj-001',
    code: 'ATHA-ESC-2026-001',
    title: 'Obra Escénica: La Memoria de los Cuerpos',
    subtitle: 'Estreno en Santiago (Matucana 100) e itinerancia en Centro Cultural Baquedano (Rancagua)',
    discipline: 'Artes Escénicas (Teatro/Danza/Circo)',
    territory: 'Interregional (Santiago ↔ Rancagua)',
    status: 'en_produccion',
    leadProducer: 'Valeria Mansilla (ATHA Producciones)',
    artisticDirector: 'Rodrigo Canales Morales',
    durationWeeks: 24,
    startDate: '2026-04-06',
    endDate: '2026-09-20',
    description: 'Montaje de teatro físico y memoria territorial que investiga las rutas obreras y memorias campesinas entre la cuenca de Rancagua y los cordones industriales de Santiago. Proyecto concebido bajo arquetipo de ciclo circular con diseño escénico desmontable de roble y fierro recuperado, registro documental patrimonial y gira interregional articulada con mediación en liceos técnicos.',
    generalObjective: 'Diseñar, montar y estrenar una obra de teatro físico y memoria territorial interregional entre Santiago y Rancagua, garantizando altos estándares técnicos, viabilidad financiera y mediación con comunidades escolares.',
    specificObjectives: [
      'Investigar memorias campesinas y obreras del eje Santiago-Rancagua para consolidar la dramaturgia.',
      'Construir una propuesta escenográfica circular desmontable con materiales recuperados que permita itinerancia técnica eficiente.',
      'Ejecutar una temporada de estreno en Matucana 100 y funciones itinerantes en el Centro Cultural Baquedano de Rancagua.',
      'Implementar cuadernillos pedagógicos y coloquios de mediación con al menos 400 estudiantes de liceos públicos.'
    ],
    contingencyPct: 5,
    operator: {
      id: 'op-valeria-mansilla',
      name: 'Valeria Mansilla',
      role: 'lead_producer',
      email: 'valeria.mansilla@athaproducciones.cl',
      territory: 'Santiago'
    },
    fundingRegimeStage: 'postulacion_adjudicada',
    referenceAt: '2026-09-08T06:00:00Z',
    referenceBaseline: 'Tabulador ATHA Producciones & Fondart Nacional 2026',
    scenarios: [
      {
        id: 'sc-base',
        name: 'Escenario Base (80% Taquilla + 100% Fondart)',
        probability: 'alta',
        ticketSalesRate: 0.78,
        totalIncomeCLP: 33400000,
        totalExpensesCLP: 30850000,
        netMarginCLP: 2550000,
        breakEvenTickets: 580,
        riskLevel: 'bajo'
      },
      {
        id: 'sc-optimista',
        name: 'Escenario Favorable (100% Taquilla + 2 Funciones Extra)',
        probability: 'media',
        ticketSalesRate: 1.0,
        totalIncomeCLP: 35500000,
        totalExpensesCLP: 31200000,
        netMarginCLP: 4300000,
        breakEvenTickets: 580,
        riskLevel: 'minimo'
      },
      {
        id: 'sc-estres',
        name: 'Escenario Estresado (50% Taquilla sin aporte CC Baquedano)',
        probability: 'baja',
        ticketSalesRate: 0.50,
        totalIncomeCLP: 29800000,
        totalExpensesCLP: 30850000,
        netMarginCLP: -1050000,
        breakEvenTickets: 580,
        riskLevel: 'alto',
        contingencyPlan: 'Activación de reserva de contingencia presupuestaria (5% = $1.542.500 CLP) y renegociación de bolos de gira técnica.'
      }
    ],
    stages: [
      {
        id: 'stage-1',
        code: 'ET-01',
        name: 'Etapa 1: Investigación, Dramaturgia y Pre-producción',
        stageType: 'preproduccion',
        apartados: [
          'Investigación Dramatúrgica Territorial',
          'Archivo Sonoro Testimonial Rancagua-Santiago',
          'Diseño Escenográfico Circular & Modelado Técnico'
        ],
        durationWeeks: 8,
        startWeek: 1,
        status: 'completada',
        objective: 'Consolidar dramaturgia final, archivo sonoro testimonial en Rancagua y Santiago, diseño escenográfico y cierre de contratos del equipo.',
        substages: [
          {
            id: 'sub-1-1',
            name: 'Investigación Dramatúrgica y Archivo Territorial',
            description: 'Recolección de testimonios y entrevistas en Rancagua y Santiago.',
            tasks: [
              { id: 't-1', title: 'Entrevistas a extrabajadores textiles y ferroviarios en Rancagua', role: 'Dramaturgo', completed: true, milestone: false },
              { id: 't-2', title: 'Entrega del texto dramático preliminar visado por dirección', role: 'Dramaturgo', completed: true, milestone: true },
              { id: 't-3', title: 'Audiciones y selección de 4 intérpretes escénicos', role: 'Dirección Artística', completed: true, milestone: false },
            ],
            expenses: [
              { id: 'exp-1', name: 'Honorarios Dramaturgia e Investigación Territorial', category: 'honorarios', unitCostCLP: 2800000, quantity: 1, totalCLP: 2800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Dramaturgo Principal' },
              { id: 'exp-2', name: 'Honorarios Asistente de Investigación y Archivo Sonoro', category: 'honorarios', unitCostCLP: 1200000, quantity: 1, totalCLP: 1200000, fundingSource: 'fondo_solicitado', providerOrRole: 'Investigador Local Rancagua' },
              { id: 'exp-3', name: 'Viáticos y Traslados de Terreno (Santiago ↔ Rancagua)', category: 'logistica_traslados', unitCostCLP: 350000, quantity: 2, totalCLP: 700000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'ATHA Producciones' }
            ]
          },
          {
            id: 'sub-1-2',
            name: 'Diseño Escenográfico Circular y Modelado Técnico',
            description: 'Concepción de escenografía modular reutilizable para itinerancia.',
            tasks: [
              { id: 't-4', title: 'Diseño de planos escenográficos en madera y fierro reciclado', role: 'Diseñador Escénico', completed: true, milestone: false },
              { id: 't-5', title: 'Simulación de transporte y embalaje para flete interregional', role: 'Jefe Técnico', completed: true, milestone: true }
            ],
            expenses: [
              { id: 'exp-4', name: 'Honorarios Diseño Escénico e Iluminación Integral', category: 'honorarios', unitCostCLP: 2500000, quantity: 1, totalCLP: 2500000, fundingSource: 'fondo_solicitado', providerOrRole: 'Diseñador Escénico' },
              { id: 'exp-5', name: 'Materiales Prototipo Escenográfico y Maqueta', category: 'produccion', unitCostCLP: 450000, quantity: 1, totalCLP: 450000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'Taller Escenotécnico' }
            ]
          }
        ]
      },
      {
        id: 'stage-2',
        code: 'ET-02',
        name: 'Etapa 2: Residencia, Ensayos y Construcción Escenotécnica',
        stageType: 'produccion',
        apartados: [
          'Residencia Escénica & Ensayos Coreográficos',
          'Construcción Escenotécnica en Madera Recuperada',
          'Composición y Espacialización Sonora 5.1'
        ],
        durationWeeks: 10,
        startWeek: 9,
        status: 'en_progreso',
        objective: 'Período de ensayos intensivos (60 horas), construcción de escenografía y confección de vestuario de época reestructurado.',
        substages: [
          {
            id: 'sub-2-1',
            name: 'Proceso de Ensayos y Creación Coreográfica',
            tasks: [
              { id: 't-6', title: 'Ciclo de ensayos en Sala de Creación Matucana 100', role: 'Elenco y Dirección', completed: true, milestone: false },
              { id: 't-7', title: 'Composición de banda sonora original electroacústica', role: 'Compositor Sonoro', completed: false, milestone: true },
              { id: 't-8', title: 'Ensayo abierto con estudiantes de mediación escolar', role: 'Producción Ejecutiva', completed: false, milestone: false }
            ],
            expenses: [
              { id: 'exp-6', name: 'Honorarios Elenco (4 Intérpretes x 2.5 meses)', category: 'honorarios', unitCostCLP: 1200000, quantity: 4, totalCLP: 4800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Actores/Bailarines Profesionales' },
              { id: 'exp-7', name: 'Honorarios Dirección Escénica', category: 'honorarios', unitCostCLP: 3200000, quantity: 1, totalCLP: 3200000, fundingSource: 'fondo_solicitado', providerOrRole: 'Director Artístico' },
              { id: 'exp-8', name: 'Honorarios Composición Musical y Espacialización Sonora', category: 'honorarios', unitCostCLP: 1800000, quantity: 1, totalCLP: 1800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Compositor' },
              { id: 'exp-9', name: 'Arriendo Sala de Ensayos climatizada con piso de danza', category: 'espacios_salas', unitCostCLP: 1500000, quantity: 1, totalCLP: 1500000, fundingSource: 'aporte_terceros_valorizado', providerOrRole: 'Matucana 100 (Cofinanciamiento)' }
            ]
          },
          {
            id: 'sub-2-2',
            name: 'Realización de Escenografía, Vestuario y Adquisición Técnica',
            tasks: [
              { id: 't-9', title: 'Construcción de módulos estructurales desmontables', role: 'Constructor Escénico', completed: false, milestone: true },
              { id: 't-10', title: 'Confección y teñido textil ecológico para vestuarios', role: 'Diseñadora de Vestuario', completed: false, milestone: false }
            ],
            expenses: [
              { id: 'exp-10', name: 'Materiales de Construcción Escenográfica (Maderas recuperadas y perfiles)', category: 'produccion', unitCostCLP: 2400000, quantity: 1, totalCLP: 2400000, fundingSource: 'fondo_solicitado', providerOrRole: 'Taller Maestranza' },
              { id: 'exp-11', name: 'Confección y Realización de Vestuarios (4 personajes)', category: 'produccion', unitCostCLP: 1600000, quantity: 1, totalCLP: 1600000, fundingSource: 'fondo_solicitado', providerOrRole: 'Vestuarista Teatral' },
              { id: 'exp-12', name: 'Alquiler de Micrófonos DPA inalámbricos y Proyector láser', category: 'tecnica_equipos', unitCostCLP: 1800000, quantity: 1, totalCLP: 1800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Proveedor Audiovisual' }
            ]
          }
        ]
      },
      {
        id: 'stage-3',
        code: 'ET-03',
        name: 'Etapa 3: Estreno, Temporada Santiago y Gira en Rancagua',
        stageType: 'exhibicion_gira',
        apartados: [
          'Temporada Oficial Matucana 100 (Santiago)',
          'Itinerancia Interregional Rancagua (CC Baquedano)',
          'Programa de Mediación Territorial & Cuadernillo Pedagógico'
        ],
        durationWeeks: 4,
        startWeek: 19,
        status: 'pendiente',
        objective: 'Temporada de 8 funciones en Santiago, 4 funciones en Rancagua y 4 jornadas de mediación con comunidades locales.',
        substages: [
          {
            id: 'sub-3-1',
            name: 'Temporada Oficial y Difusión de Medios',
            tasks: [
              { id: 't-11', title: 'Montaje técnico y puesta a punto de luces en sala', role: 'Jefe Técnico', completed: false, milestone: true },
              { id: 't-12', title: 'Función de Estreno a prensa y comunidades invitadas', role: 'Producción y RRPP', completed: false, milestone: true },
              { id: 't-13', title: 'Campaña de prensa en medios culturales y redes sociales', role: 'Encargada de Comunicaciones', completed: false, milestone: false }
            ],
            expenses: [
              { id: 'exp-13', name: 'Campaña Digital, Pauta en Redes y Diseño Gráfico de Cartelería', category: 'difusion_marketing', unitCostCLP: 1400000, quantity: 1, totalCLP: 1400000, fundingSource: 'fondo_solicitado', providerOrRole: 'Agencia de Difusión Cultural' },
              { id: 'exp-14', name: 'Producción Ejecutiva de Temporada y Boletería', category: 'honorarios', unitCostCLP: 1800000, quantity: 1, totalCLP: 1800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Productora Ejecutiva ATHA' },
              { id: 'exp-15', name: 'Técnico de Sonido e Iluminación por Funciones (12 bolos)', category: 'honorarios', unitCostCLP: 80000, quantity: 24, totalCLP: 1920000, fundingSource: 'fondo_solicitado', providerOrRole: 'Técnicos de Temporada' }
            ]
          },
          {
            id: 'sub-3-2',
            name: 'Itinerancia y Mediación en Rancagua / O\'Higgins',
            tasks: [
              { id: 't-14', title: 'Flete de escenografía y traslado del elenco a Rancagua', role: 'Logística ATHA', completed: false, milestone: false },
              { id: 't-15', title: 'Conversatorios post-función y taller de mediación con liceos', role: 'Mediador Cultural', completed: false, milestone: true }
            ],
            expenses: [
              { id: 'exp-16', name: 'Camión de Carga Cerrado para Escenografía Santiago-Rancagua-Santiago', category: 'logistica_traslados', unitCostCLP: 650000, quantity: 2, totalCLP: 1300000, fundingSource: 'fondo_solicitado', providerOrRole: 'Transportes Rancagua' },
              { id: 'exp-17', name: 'Alojamiento y Alimentación Elenco en Rancagua (4 días)', category: 'logistica_traslados', unitCostCLP: 950000, quantity: 1, totalCLP: 950000, fundingSource: 'aporte_terceros_pecuniario', providerOrRole: 'Convenio Centro Cultural Baquedano' },
              { id: 'exp-18', name: 'Honorarios Mediación y Cuadernillo Pedagógico Territorial', category: 'honorarios', unitCostCLP: 800000, quantity: 1, totalCLP: 800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Mediador Escénico' }
            ]
          }
        ]
      },
      {
        id: 'stage-4',
        code: 'ET-04',
        name: 'Etapa 4: Post-producción, Archivo Vivo y Rendición Fondart',
        stageType: 'postproduccion_cierre',
        apartados: [
          'Archivo Vivo Digital Documental',
          'Rendición Financiera Plataforma Fondart',
          'Cierre Contable ATHA Producciones'
        ],
        durationWeeks: 2,
        startWeek: 23,
        status: 'pendiente',
        objective: 'Desmontaje, reembalaje de escenografía para bodega de archivo, entrega de registro 4K a CEDOC y rendición de cuentas pública.',
        substages: [
          {
            id: 'sub-4-1',
            name: 'Registro Documental y Cierre Administrativo',
            tasks: [
              { id: 't-16', title: 'Edición y masterización de teaser y registro multi-cámara 4K', role: 'Realizador Audiovisual', completed: false, milestone: true },
              { id: 't-17', title: 'Rendición financiera en plataforma Fondart y carpeta contable', role: 'Administración ATHA', completed: false, milestone: true }
            ],
            expenses: [
              { id: 'exp-19', name: 'Registro Audiovisual Multicámara 4K y Cápsulas de Mediación', category: 'produccion', unitCostCLP: 1500000, quantity: 1, totalCLP: 1500000, fundingSource: 'fondo_solicitado', providerOrRole: 'Cámara Documental' },
              { id: 'exp-20', name: 'Honorarios Contador y Asesoría de Rendición Financiera Fondart', category: 'honorarios', unitCostCLP: 750000, quantity: 1, totalCLP: 750000, fundingSource: 'fondo_solicitado', providerOrRole: 'Contador Auditor' }
            ]
          }
        ]
      }
    ],
    fundingRegime: {
      type: 'fondos_publicos',
      publicFundCategory: 'Fondo de Artes Escénicas',
      requestedAmountCLP: 26500000,
      cofinancingRequiredPct: 15,
      targetAudienceCapacity: 1400, // 12 funciones x 120 promedio
      expectedTicketSalesCount: 1100,
      averageTicketPriceCLP: 6000,
      confirmedSources: [
        {
          id: 'src-1',
          name: 'Fondo Nacional de Fomento de las Artes Escénicas (Mincap)',
          type: 'pecuniario',
          category: 'fondos_publicos',
          amountCLP: 26500000,
          verified: true,
          notes: 'Monto solicitado en línea de Creación y Producción de Obras Teatrales'
        },
        {
          id: 'src-2',
          name: 'Aporte Propio ATHA Producciones (Equipos y Logística)',
          type: 'pecuniario',
          category: 'aporte_propio',
          amountCLP: 1150000,
          verified: true,
          notes: 'Recursos operacionales disponibles en cuenta corriente'
        },
        {
          id: 'src-3',
          name: 'Coproducción Centro Cultural Matucana 100 (Sala y Luces)',
          type: 'valorizado',
          category: 'aporte_tercero',
          amountCLP: 1500000,
          verified: true,
          notes: 'Arriendo de sala de ensayo valorizada mediante carta de compromiso'
        },
        {
          id: 'src-4',
          name: 'Centro Cultural Baquedano Rancagua (Hospedaje y Difusión)',
          type: 'pecuniario',
          category: 'aporte_tercero',
          amountCLP: 950000,
          verified: true,
          notes: 'Aporte pecuniario directo para viáticos de gira'
        },
        {
          id: 'src-5',
          name: 'Estimación de Taquilla Compartida (50% Sala / 50% Compañía)',
          type: 'pecuniario',
          category: 'taquilla',
          amountCLP: 3300000,
          verified: false,
          notes: '1.100 entradas x $6.000 x 50% split'
        }
      ]
    },
    valueArchetype: {
      type: 'ciclo_circular',
      description: 'Modelo de ciclo circular centrado en la reutilización de escenografía modular, generación de archivo vivo documental y activación de repertorio itinerante entre Santiago y Rancagua.',
      strategicAxes: [
        'Ecodiseño escénico desmontable con materiales nobles recuperados',
        'Archivo vivo digital para el Centro de Documentación de Artes Escénicas',
        'Itinerancia regional coordinada que optimiza la inversión de ensayos',
        'Formación de audiencias con enfoque en liceos de comunas mineras y agrícolas'
      ],
      circularElements: {
        sceneryReusePct: 85,
        digitalArchive: true,
        regionalTouring: true,
        repertoryRevival: true
      },
      ecosystemElements: {
        communityPartnersCount: 3,
        venuesInvolved: ['Matucana 100 (Santiago)', 'CC Baquedano (Rancagua)', 'Teatro Municipal de Rengo'],
        territoryImpact: 'Conexión cultural y mediación entre cuenca de O\'Higgins y Región Metropolitana',
        audiencesTarget: 'Público general teatral, estudiantes secundarios y agrupaciones de memoria histórica'
      }
    },
    canvas: {
      artisticProposal: 'Obra teatral contemporánea que combina danza, testimonios orales y diseño inmersivo para reflexionar sobre los vínculos identitarios entre trabajadores de la minería, campo e industria central de Chile.',
      targetAudiences: 'Comunidades escolares de Rancagua/Rengo, público habitual de artes escénicas en Santiago (20-65 años), investigadores de memoria social y patrimonio inmaterial.',
      territorialAllies: 'Centro Cultural Matucana 100, Corporación de Cultura y las Artes de Rancagua, Archivo Nacional Histórico, Red de Salas de Teatro de Chile.',
      criticalResources: 'Equipo de 4 actores-bailarines de alto rendimiento físico, módulo escenográfico desmontable en madera recuperada, equipamiento sonoro multicanal, movilidad para gira.',
      keyActivities: 'Investigación testimonial, ensayos intensivos, temporada oficial en Santiago, transporte e itinerancia en Rancagua, mediación y cuadernillo docente.',
      valuePropositionATHA: 'Producción profesional con estándar técnico de sala metropolitana, integrada a la descentralización real y al retorno de valor social en la Región de O\'Higgins.',
      mediationAndAudiences: 'Cuadernillos pedagógicos impresos y descargables, coloquios post-función con sociólogos y elenco, ensayos abiertos a liceos públicos de Rancagua.',
      territorialImpact: 'Descentralización artística efectiva: un montaje concebido desde su origen para circular fuera del circuito exclusivo de la capital, rescatando memorias locales.',
      riskMitigation: 'Contingencia del 5% presupuestada, diseño escénico preparado para variaciones de dimensiones de escenario en salas regionales, plan de difusión cruzada entre ambas regiones.'
    },
    updatedAt: '2026-09-07T14:30:00Z',
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'atha-prj-002',
    code: 'ATHA-MUS-2026-002',
    title: 'Festival Sonora Valle Central — Edición IV',
    subtitle: 'Encuentro autogestionado de música independiente, artes visuales y gastronomía local',
    discipline: 'Música en Vivo / Conciertos',
    territory: 'Rancagua / Región de O\'Higgins',
    status: 'en_evaluacion',
    leadProducer: 'Ignacio Silva (ATHA Producciones)',
    artisticDirector: 'Camila Garrido Pavez',
    durationWeeks: 16,
    startDate: '2026-08-01',
    endDate: '2026-11-28',
    description: 'Cuarta edición del festival de música autogestionado más representativo del Valle Central. Reúne a 10 agrupaciones musicales emergentes de O\'Higgins y Santiago, feria de diseño local, talleres de formación para bandas y una estrategia de sustentabilidad basada en ticketera transparente, auspicios comunitarios y barra gastronómica.',
    generalObjective: 'Consolidar la cuarta edición del Festival Sonora Valle Central como el hito de música independiente y encuentro comunitario de la Región de O\'Higgins, con modelo de autofinanciamiento sostenible.',
    specificObjectives: [
      'Convocar y contratar a 10 agrupaciones musicales (6 regionales de O\'Higgins y 4 nacionales invitadas) con honorarios justos.',
      'Habilitar el Parque Comunal de Rancagua con infraestructura técnica de sonido profesional, seguridad certificada y feria de economías creativas.',
      'Alcanzar una asistencia mínima de 800 espectadores mediante preventa digital escalonada y alianzas con medios locales.',
      'Desarrollar un plan de gestión de residuos y reciclaje junto a cooperativas de la zona con cero huella en el espacio público.'
    ],
    contingencyPct: 5,
    operator: {
      id: 'op-ignacio-silva',
      name: 'Ignacio Silva',
      role: 'lead_producer',
      email: 'ignacio.silva@athaproducciones.cl',
      territory: 'Rancagua'
    },
    fundingRegimeStage: 'ejecucion_concursable',
    referenceAt: '2026-09-08T06:00:00Z',
    referenceBaseline: 'Tarifario Técnico y Artístico Rancagua 2026',
    stages: [
      {
        id: 'st-fest-1',
        code: 'ET-01',
        name: 'Etapa 1: Convocatoria, Curaduría Musical y Permisos',
        durationWeeks: 6,
        startWeek: 1,
        status: 'completada',
        objective: 'Selección de line-up de 10 bandas (6 regionales, 4 nacionales), permisos municipales y acuerdos de locación.',
        substages: [
          {
            id: 'sub-fest-1-1',
            name: 'Curaduría Artística y Acuerdos de Cachet',
            tasks: [
              { id: 'tf-1', title: 'Cierre de bases de convocatoria y llamado a bandas', role: 'Curaduría Musical', completed: true, milestone: true },
              { id: 'tf-2', title: 'Firma de cartas de compromiso con las 10 bandas seleccionadas', role: 'Producción Artística', completed: true, milestone: false },
              { id: 'tf-3', title: 'Gestión de auspicio con cervecerías artesanales de Machalí/Rancagua', role: 'Producción Comercial', completed: true, milestone: false }
            ],
            expenses: [
              { id: 'ef-1', name: 'Honorarios Curaduría Musical y Coordinación de Bandas', category: 'honorarios', unitCostCLP: 1500000, quantity: 1, totalCLP: 1500000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'Curador Musical' },
              { id: 'ef-2', name: 'Gestión Legal, Contratos y Permisos SEC / Delegación Presidencial', category: 'honorarios', unitCostCLP: 800000, quantity: 1, totalCLP: 800000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'Asesor Jurídico' }
            ]
          },
          {
            id: 'sub-fest-1-2',
            name: 'Locación y Autorizaciones Municipales',
            tasks: [
              { id: 'tf-4', title: 'Aprobación uso de espacio en Parque Comunal Rancagua', role: 'Producción General', completed: true, milestone: true },
              { id: 'tf-5', title: 'Contratación de seguro de responsabilidad civil para eventos masivos', role: 'Administración ATHA', completed: true, milestone: false }
            ],
            expenses: [
              { id: 'ef-3', name: 'Garantías y Permisos Municipales para Espectáculos Públicos', category: 'logistica_traslados', unitCostCLP: 650000, quantity: 1, totalCLP: 650000, fundingSource: 'taquilla_esperada', providerOrRole: 'Municipalidad de Rancagua' },
              { id: 'ef-4', name: 'Póliza de Seguro de Responsabilidad Civil (Aforo 1.000 pax)', category: 'produccion', unitCostCLP: 450000, quantity: 1, totalCLP: 450000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'Compañía de Seguros' }
            ]
          }
        ]
      },
      {
        id: 'st-fest-2',
        code: 'ET-02',
        name: 'Etapa 2: Pre-venta, Campaña Visual y Técnica de Escenario',
        durationWeeks: 6,
        startWeek: 7,
        status: 'en_progreso',
        objective: 'Lanzamiento de venta de entradas por tramos, reserva de equipamiento de sonido Line-Array, iluminación y generadores.',
        substages: [
          {
            id: 'sub-fest-2-1',
            name: 'Venta Anticipada de Tickets y Difusión Viral',
            tasks: [
              { id: 'tf-6', title: 'Habilitación de plataforma ticketera (Early Bird / Preventa 1)', role: 'Comunicaciones ATHA', completed: true, milestone: true },
              { id: 'tf-7', title: 'Diseño de identidad visual, afiches serigrafiados y reel promocional', role: 'Diseñador Gráfico', completed: true, milestone: false },
              { id: 'tf-8', title: 'Alianzas con radios universitarias e influencers culturales de la región', role: 'RRPP ATHA', completed: false, milestone: false }
            ],
            expenses: [
              { id: 'ef-5', name: 'Diseño de Identidad Visual, Merchandising y Motion Graphics', category: 'difusion_marketing', unitCostCLP: 900000, quantity: 1, totalCLP: 900000, fundingSource: 'taquilla_esperada', providerOrRole: 'Estudio de Diseño Regional' },
              { id: 'ef-6', name: 'Pauta en Redes (Instagram, TikTok) y Prensa Local', category: 'difusion_marketing', unitCostCLP: 750000, quantity: 1, totalCLP: 750000, fundingSource: 'taquilla_esperada', providerOrRole: 'Ads Manager' }
            ]
          },
          {
            id: 'sub-fest-2-2',
            name: 'Reserva de Técnica, Sonido y Logística de Recinto',
            tasks: [
              { id: 'tf-9', title: 'Rider técnico consolidado de las 10 bandas', role: 'Jefe Técnico', completed: true, milestone: false },
              { id: 'tf-10', title: 'Arriendo de escenario Layher 10x8m y torre de control de sonido', role: 'Producción Técnica', completed: false, milestone: true }
            ],
            expenses: [
              { id: 'ef-7', name: 'Arriendo Sistema de Sonido Line-Array y Consolas Digitales', category: 'tecnica_equipos', unitCostCLP: 2800000, quantity: 1, totalCLP: 2800000, fundingSource: 'taquilla_esperada', providerOrRole: 'AudioPro O\'Higgins' },
              { id: 'ef-8', name: 'Iluminación Escénica, Pantalla LED y Generador Silencioso 100 kVA', category: 'tecnica_equipos', unitCostCLP: 1900000, quantity: 1, totalCLP: 1900000, fundingSource: 'taquilla_esperada', providerOrRole: 'Generadores y Luces Chile' },
              { id: 'ef-9', name: 'Estructura Escenario Modular Layher con Techo Certificado', category: 'produccion', unitCostCLP: 1400000, quantity: 1, totalCLP: 1400000, fundingSource: 'aporte_terceros_valorizado', providerOrRole: 'Convenio Espacio Parque' }
            ]
          }
        ]
      },
      {
        id: 'st-fest-3',
        code: 'ET-03',
        name: 'Etapa 3: Montaje, Jornada del Festival y Operación en Vivo',
        durationWeeks: 2,
        startWeek: 13,
        status: 'pendiente',
        objective: 'Jornada festival con 12 horas continuas de música, 800 asistentes esperados, feria gastronómica y seguridad integral.',
        substages: [
          {
            id: 'sub-fest-3-1',
            name: 'Cachets Artísticos y Operación de Escenario',
            tasks: [
              { id: 'tf-11', title: 'Prueba de sonido (Soundcheck) escalonada de bandas', role: 'Stage Manager', completed: false, milestone: true },
              { id: 'tf-12', title: 'Presentación en vivo de las 10 bandas según grilla horaria', role: 'Dirección Artística', completed: false, milestone: true }
            ],
            expenses: [
              { id: 'ef-10', name: 'Cachet Artístico Bandas Regionales (6 agrupaciones x $450.000)', category: 'honorarios', unitCostCLP: 450000, quantity: 6, totalCLP: 2700000, fundingSource: 'taquilla_esperada', providerOrRole: 'Bandas Locales' },
              { id: 'ef-11', name: 'Cachet Artístico Bandas Invitadas Nacionales (4 bandas x $750.000)', category: 'honorarios', unitCostCLP: 750000, quantity: 4, totalCLP: 3000000, fundingSource: 'taquilla_esperada', providerOrRole: 'Bandas Nacionales Headliners' },
              { id: 'ef-12', name: 'Honorarios Stage Manager, Técnicos de Sonido y Roadies (6 personas)', category: 'honorarios', unitCostCLP: 180000, quantity: 6, totalCLP: 1080000, fundingSource: 'taquilla_esperada', providerOrRole: 'Staff Técnico Festival' }
            ]
          },
          {
            id: 'sub-fest-3-2',
            name: 'Seguridad, Aseo, Ambulancia y Logística de Recinto',
            tasks: [
              { id: 'tf-13', title: 'Coordinación de guardias certificados OS-10 y control de acceso', role: 'Jefe de Seguridad', completed: false, milestone: true },
              { id: 'tf-14', title: 'Plan de reciclaje y gestión de residuos con cooperativa local', role: 'Coordinador Ambiental', completed: false, milestone: false }
            ],
            expenses: [
              { id: 'ef-13', name: 'Seguridad Privada Acreditada OS-10 (10 guardias x 12 hrs)', category: 'produccion', unitCostCLP: 80000, quantity: 10, totalCLP: 800000, fundingSource: 'taquilla_esperada', providerOrRole: 'Empresa Seguridad Rancagua' },
              { id: 'ef-14', name: 'Ambulancia de Primeros Auxilios con Paramédico y Enfermero', category: 'produccion', unitCostCLP: 450000, quantity: 1, totalCLP: 450000, fundingSource: 'taquilla_esperada', providerOrRole: 'Servicio de Rescate Médico' },
              { id: 'ef-15', name: 'Baños Químicos Móviles (6 estándar + 2 inclusivos) y Limpieza', category: 'produccion', unitCostCLP: 680000, quantity: 1, totalCLP: 680000, fundingSource: 'taquilla_esperada', providerOrRole: 'Sanitarios del Maule' }
            ]
          }
        ]
      },
      {
        id: 'st-fest-4',
        code: 'ET-04',
        name: 'Etapa 4: Desmontaje, Balance Financiero y Aftermovie',
        durationWeeks: 2,
        startWeek: 15,
        status: 'pendiente',
        objective: 'Desarme y entrega del parque, liquidación de boletería, pagos a proveedores y entrega de cápsula aftermovie.',
        substages: [
          {
            id: 'sub-fest-4-1',
            name: 'Liquidación y Retribución Comunitaria',
            tasks: [
              { id: 'tf-15', title: 'Cuadratura final de ingresos por boletería y barra gastronómica', role: 'Administración ATHA', completed: false, milestone: true },
              { id: 'tf-16', title: 'Publicación del Aftermovie oficial y fotos en alta resolución', role: 'Comunicaciones ATHA', completed: false, milestone: false }
            ],
            expenses: [
              { id: 'ef-16', name: 'Edición Aftermovie Oficial y Registro Fotográfico Profesional', category: 'produccion', unitCostCLP: 850000, quantity: 1, totalCLP: 850000, fundingSource: 'taquilla_esperada', providerOrRole: 'Colectivo Audiovisual O\'Higgins' },
              { id: 'ef-17', name: 'Cuota de Asociación y Derechos de Autor (SCD Chile por música en vivo)', category: 'honorarios', unitCostCLP: 600000, quantity: 1, totalCLP: 600000, fundingSource: 'taquilla_esperada', providerOrRole: 'SCD Sociedad Chilena del Derecho de Autor' }
            ]
          }
        ]
      }
    ],
    fundingRegime: {
      type: 'autogestion',
      requestedAmountCLP: 0,
      cofinancingRequiredPct: 0,
      targetAudienceCapacity: 950, // Capacidad máxima del recinto
      expectedTicketSalesCount: 800,
      averageTicketPriceCLP: 15000,
      confirmedSources: [
        {
          id: 'src-f-1',
          name: 'Venta de Entradas Preventa y General (800 tickets x $15.000 prom)',
          type: 'pecuniario',
          category: 'taquilla',
          amountCLP: 12000000,
          verified: false,
          notes: 'Ticketera online con liquidación quincenal'
        },
        {
          id: 'src-f-2',
          name: 'Concesión y Porcentaje de Barra de Cervecerías y Foodtrucks',
          type: 'pecuniario',
          category: 'aporte_propio',
          amountCLP: 2500000,
          verified: true,
          notes: '5 puestos gastronómicos pagan derecho de piso + 10% de ventas'
        },
        {
          id: 'src-f-3',
          name: 'Auspicio Privado Cervecería Artesanal Machalí & Tienda de Instrumentos',
          type: 'pecuniario',
          category: 'auspicio',
          amountCLP: 1800000,
          verified: true,
          notes: 'Branding en escenario, vasos reutilizables y redes'
        },
        {
          id: 'src-f-4',
          name: 'Aporte de Capital Semilla Inicial ATHA Producciones',
          type: 'pecuniario',
          category: 'aporte_propio',
          amountCLP: 2000000,
          verified: true,
          notes: 'Caja chica y anticipos de riders técnicos'
        },
        {
          id: 'src-f-5',
          name: 'Convenio Espacio Parque Comunal (Municipalidad de Rancagua)',
          type: 'valorizado',
          category: 'aporte_tercero',
          amountCLP: 1400000,
          verified: true,
          notes: 'Exención de arriendo de suelo valorizada por patrocinio cultural'
        }
      ]
    },
    valueArchetype: {
      type: 'red_ecosistema',
      description: 'Arquetipo de red y ecosistema cultural: plataforma colaborativa donde interactúan músicos emergentes, emprendedores gastronómicos, técnicos locales y públicos de la región, retroalimentando la economía creativa local.',
      strategicAxes: [
        'Articulación de bandas de O\'Higgins con artistas de Santiago',
        'Fomento de la cadena de proveedores locales (audio, seguridad, gráfica, gastronomía)',
        'Estrategia de sustentabilidad sin dependencia de subvención estatal',
        'Generación de empleo cultural directo para más de 45 personas'
      ],
      circularElements: {
        sceneryReusePct: 40,
        digitalArchive: true,
        regionalTouring: false,
        repertoryRevival: false
      },
      ecosystemElements: {
        communityPartnersCount: 8,
        venuesInvolved: ['Parque Comunal Rancagua', 'Espacio Cultural El Manzanal', 'Estudios de Grabación El Valle'],
        territoryImpact: 'Polo de desarrollo musical descentralizado para la juventud de la Región de O\'Higgins',
        audiencesTarget: 'Jóvenes y adultos jóvenes (18-40 años), familias melómanas y comunidad creativa'
      }
    },
    canvas: {
      artisticProposal: 'Experiencia festivalera al aire libre de música independiente que visibiliza la fuerza creadora del Valle Central en diálogo con la escena alternativa nacional.',
      targetAudiences: 'Público juvenil, universitario y adulto de Rancagua, Machalí, Graneros, San Fernando y asistentes atraídos desde Santiago por la propuesta al aire libre.',
      territorialAllies: 'Cerveceros artesanales de Machalí, Red de Músicos de O\'Higgins, Municipalidad de Rancagua, Tiendas de vinilos y luthería local.',
      criticalResources: 'Sistema de audio profesional de alta definición para música en vivo, escenario techado certificado, cartelera atractiva de bandas y sistema expedito de ticketera.',
      keyActivities: 'Curaduría musical, campaña comunicacional de preventa, montaje técnico simultáneo, operación de festival de 12 horas, liquidación y desmontaje sustentable.',
      valuePropositionATHA: 'Control integral de la producción que garantiza cumplimiento horario riguroso, sonido de primer nivel y un entorno seguro y agradable para el público y los artistas.',
      mediationAndAudiences: 'Charla previa gratuita "Cómo autogestionar el primer disco" para bandas escolares de Rancagua impartida por los músicos invitados.',
      territorialImpact: 'Consolidación de una plaza musical alternativa fuera del centralismo de Santiago, reteniendo el gasto cultural dentro de la economía local.',
      riskMitigation: 'Venta escalonada de entradas con meta mínima para cubrir costos fijos 3 semanas antes del evento, póliza de seguros ante inclemencias meteorológicas.'
    },
    updatedAt: '2026-09-07T18:00:00Z',
    createdAt: '2026-04-10T11:00:00Z'
  },
  {
    id: 'atha-prj-003',
    code: 'ATHA-MED-2026-003',
    title: 'Laboratorio Territorial: Rutas del Cobre y la Semilla',
    subtitle: 'Residencia artística, mediación en liceos y creación audiovisual comunitaria en el Valle del Cachapoal',
    discipline: 'Gestión Cultural & Mediación',
    territory: 'Interregional (Santiago ↔ Rancagua)',
    status: 'en_evaluacion',
    leadProducer: 'Camila Garrido Pavez (ATHA Producciones)',
    artisticDirector: 'Esteban Pizarro Fuentes',
    durationWeeks: 12,
    startDate: '2026-09-01',
    endDate: '2026-11-24',
    description: 'Residencia de arte colaborativo que vincula a creadores contemporáneos de Santiago con estudiantes de liceos técnico-agrícolas y mineros de Rancagua y Machalí. Culmina en una exposición interactiva, fanzine impreso y microdocumental testimonial.',
    generalObjective: 'Articular un laboratorio interdisciplinario de mediación artística y creación audiovisual comunitaria que ponga en valor el diálogo territorial entre la cuenca minera y agrícola del Cachapoal.',
    specificObjectives: [
      'Coordinar residencias creativas con 3 artistas contemporáneos en 2 liceos técnicos de Machalí y Rancagua.',
      'Desarrollar talleres formativos de registro testimonial con al menos 60 jóvenes estudiantes.',
      'Producir y editar una serie microdocumental de 3 cápsulas y una edición impresa de 500 fanzines patrimoniales.',
      'Inaugurar una muestra interactiva abierta a la comunidad vecinal y escolar en la Casa de la Cultura de Rancagua.'
    ],
    contingencyPct: 5,
    operator: {
      id: 'op-camila-garrido',
      name: 'Camila Garrido Pavez',
      role: 'lead_producer',
      email: 'camila.garrido@athaproducciones.cl',
      territory: 'Rancagua'
    },
    fundingRegimeStage: 'en_formulacion',
    referenceAt: '2026-09-08T06:00:00Z',
    referenceBaseline: 'Bases FNDR 8% O\'Higgins & Red Mediación RM-Cachapoal',
    scenarios: [
      {
        id: 'sc-med-base',
        name: 'Escenario Base (100% FNDR + Aporte Municipal Rancagua)',
        probability: 'alta',
        ticketSalesRate: 1.0,
        totalIncomeCLP: 16200000,
        totalExpensesCLP: 15400000,
        netMarginCLP: 800000,
        riskLevel: 'bajo'
      },
      {
        id: 'sc-med-estres',
        name: 'Escenario Ajustado (Reducción 20% Fondo Regional)',
        probability: 'media',
        ticketSalesRate: 1.0,
        totalIncomeCLP: 13360000,
        totalExpensesCLP: 13200000,
        netMarginCLP: 160000,
        riskLevel: 'medio',
        contingencyPlan: 'Reducción de tiraje de fanzines impresos a formato digital y ajuste de jornadas de traslado.'
      }
    ],
    stages: [
      {
        id: 'st-med-1',
        code: 'ET-01',
        name: 'Etapa 1: Preproducción, Acuerdos Escolares y Curaduría',
        stageType: 'preproduccion',
        apartados: [
          'Convenios con Comunidades Escolares Machalí/Rancagua',
          'Convocatoria y Selección de Artistas Residentes',
          'Diseño de Metodologías Pedagógicas Participativas'
        ],
        durationWeeks: 4,
        startWeek: 1,
        status: 'completada',
        objective: 'Firmar acuerdos con 2 liceos técnicos, seleccionar a 3 artistas en residencia y diseñar pauta de trabajo en terreno.',
        substages: [
          {
            id: 'sub-med-1-1',
            name: 'Coordinación Interinstitucional y Terreno',
            tasks: [
              { id: 'tm-1', title: 'Firma de convenio con DAEM Rancagua y Dirección de Liceos', role: 'Producción Ejecutiva', completed: true, milestone: true },
              { id: 'tm-2', title: 'Diseño de carpetas pedagógicas y consentimiento informado', role: 'Mediador Cultural', completed: true, milestone: false }
            ],
            expenses: [
              { id: 'exm-1', name: 'Honorarios Coordinación General y Mediación Territorial', category: 'honorarios', unitCostCLP: 1600000, quantity: 1, totalCLP: 1600000, fundingSource: 'fondo_solicitado', providerOrRole: 'Mediador Principal' },
              { id: 'exm-2', name: 'Traslados Santiago-Rancagua para reuniones de coordinación', category: 'logistica_traslados', unitCostCLP: 280000, quantity: 1, totalCLP: 280000, fundingSource: 'aporte_propio_pecuniario', providerOrRole: 'ATHA Producciones' }
            ]
          }
        ]
      },
      {
        id: 'st-med-2',
        code: 'ET-02',
        name: 'Etapa 2: Laboratorio de Creación en Aula y Registro Testimonial',
        stageType: 'produccion',
        apartados: [
          'Talleres de Grabación Sonora y Fotografía Estenopeica',
          'Recolección de Memoria Oral Campesina y Minera',
          'Edición de Cápsulas Documentales'
        ],
        durationWeeks: 5,
        startWeek: 5,
        status: 'en_progreso',
        objective: '10 sesiones de creación con estudiantes, registro de 30 testimonios y montaje de piezas audiovisuales.',
        substages: [
          {
            id: 'sub-med-2-1',
            name: 'Talleres en Liceos y Registro Audiovisual',
            tasks: [
              { id: 'tm-3', title: 'Implementación de 10 módulos de taller en horario escolar', role: 'Artistas Residentes', completed: true, milestone: false },
              { id: 'tm-4', title: 'Grabación de entrevistas a familias agrícolas y mineras', role: 'Documentalista', completed: false, milestone: true }
            ],
            expenses: [
              { id: 'exm-3', name: 'Honorarios 3 Artistas Residentes (Talleres de Fotografía y Sonido)', category: 'honorarios', unitCostCLP: 1200000, quantity: 3, totalCLP: 3600000, fundingSource: 'fondo_solicitado', providerOrRole: 'Artistas Residentes' },
              { id: 'exm-4', name: 'Kits de Materiales de Creación para 60 Estudiantes', category: 'produccion', unitCostCLP: 35000, quantity: 60, totalCLP: 2100000, fundingSource: 'fondo_solicitado', providerOrRole: 'Librería Técnica O\'Higgins' },
              { id: 'exm-5', name: 'Honorarios Realizador Documental y Sonidista Directo', category: 'honorarios', unitCostCLP: 1800000, quantity: 1, totalCLP: 1800000, fundingSource: 'fondo_solicitado', providerOrRole: 'Cineasta Regional' }
            ]
          }
        ]
      },
      {
        id: 'st-med-3',
        code: 'ET-03',
        name: 'Etapa 3: Exposición Itinerante, Fanzine y Rendición FNDR',
        stageType: 'exhibicion_gira',
        apartados: [
          'Muestra Comunitaria en Casa de la Cultura Rancagua',
          'Impresión de Fanzine Colectivo (500 ejemplares)',
          'Cierre Contable y Certificación de Asistencia Escolar'
        ],
        durationWeeks: 3,
        startWeek: 10,
        status: 'pendiente',
        objective: 'Montaje de muestra abierta a la comunidad, distribución de publicaciones y carpeta de rendición aprobada.',
        substages: [
          {
            id: 'sub-med-3-1',
            name: 'Exposición y Socialización Comunitaria',
            tasks: [
              { id: 'tm-5', title: 'Inauguración de la muestra interactiva con familias y autoridades', role: 'Producción General', completed: false, milestone: true },
              { id: 'tm-6', title: 'Entrega final de rendición financiera al Gobierno Regional O\'Higgins', role: 'Administración ATHA', completed: false, milestone: true }
            ],
            expenses: [
              { id: 'exm-6', name: 'Impresión Offset Fanzine de Memorias (500 ejemplares a dos tintas)', category: 'difusion_marketing', unitCostCLP: 1200000, quantity: 1, totalCLP: 1200000, fundingSource: 'fondo_solicitado', providerOrRole: 'Imprenta Regional' },
              { id: 'exm-7', name: 'Montaje Museográfico y Dispositivos de Escucha Interactivos', category: 'produccion', unitCostCLP: 1500000, quantity: 1, totalCLP: 1500000, fundingSource: 'fondo_solicitado', providerOrRole: 'Taller de Museografía' },
              { id: 'exm-8', name: 'Honorarios Asesoría Contable para FNDR 8%', category: 'honorarios', unitCostCLP: 650000, quantity: 1, totalCLP: 650000, fundingSource: 'fondo_solicitado', providerOrRole: 'Contador Auditor' }
            ]
          }
        ]
      }
    ],
    fundingRegime: {
      type: 'mixto',
      publicFundCategory: 'FNDR 8% O\'Higgins / RM',
      requestedAmountCLP: 12450000,
      cofinancingRequiredPct: 10,
      targetAudienceCapacity: 600,
      expectedTicketSalesCount: 0,
      averageTicketPriceCLP: 0,
      confirmedSources: [
        {
          id: 'src-m-1',
          name: 'FNDR 8% Comunitario Gobierno Regional de O\'Higgins',
          type: 'pecuniario',
          category: 'fondos_publicos',
          amountCLP: 12450000,
          verified: false,
          notes: 'Fondo concursable en postulación fase técnica'
        },
        {
          id: 'src-m-2',
          name: 'Convenio de Espacios Culturales y Salas DAEM Rancagua',
          type: 'valorizado',
          category: 'aporte_tercero',
          amountCLP: 1800000,
          verified: true,
          notes: 'Salas de clases, biblioteca y Casa de la Cultura'
        },
        {
          id: 'src-m-3',
          name: 'Aporte ATHA Producciones (Equipos audiovisuales y gestión)',
          type: 'pecuniario',
          category: 'aporte_propio',
          amountCLP: 1150000,
          verified: true,
          notes: 'Caja operacional comprometida'
        }
      ]
    },
    valueArchetype: {
      type: 'cadena_lineal',
      description: 'Modelo secuencial de formación e impacto social con entrega de producto editorial y archivo público digital.',
      strategicAxes: [
        'Formación de pensamiento crítico en juventudes técnico-profesionales',
        'Valorización del patrimonio inmaterial minero y campesino del Cachapoal',
        'Vinculación directa entre creadores de Santiago y comunidades de O\'Higgins'
      ],
      circularElements: {
        sceneryReusePct: 30,
        digitalArchive: true,
        regionalTouring: false,
        repertoryRevival: false
      },
      ecosystemElements: {
        communityPartnersCount: 5,
        venuesInvolved: ['Liceo Técnico Diego Portales', 'Casa de la Cultura Rancagua', 'Centro Cultural Machalí'],
        territoryImpact: 'Fortalecimiento de la identidad local en jóvenes en riesgo de exclusión cultural',
        audiencesTarget: 'Comunidad escolar, familias de trabajadores mineros y público general'
      }
    },
    canvas: {
      artisticProposal: 'Laboratorio de creación colectiva que rescata memorias orales de la cuenca minera y agrícola mediante fotografía estenopeica y paisaje sonoro.',
      targetAudiences: 'Estudiantes de enseñanza media técnico-profesional, docentes de historia y artes, y vecinos de Rancagua y Machalí.',
      territorialAllies: 'DAEM Rancagua, Corporación Cultural de Rancagua, Centro Cultural Machalí, Liceos Técnicos Municipales.',
      criticalResources: 'Mediadores culturales especializados, equipamiento de registro audiovisual, materiales de taller e imprenta para el fanzine.',
      keyActivities: '10 talleres intensivos en aula, recolección de testimonios comunitarios, diseño editorial del fanzine, muestra pública interactiva.',
      valuePropositionATHA: 'Metodología rigurosa de mediación que garantiza la participación protagónica de los estudiantes con altos estándares estéticos y éticos.',
      mediationAndAudiences: 'Publicación impresa de 500 fanzines distribuidos en bibliotecas públicas y versión digital con acceso QR a paisajes sonoros.',
      territorialImpact: 'Descentralización del acceso a prácticas de arte contemporáneo en liceos municipales de la Región de O\'Higgins.',
      riskMitigation: 'Plan pedagógico adaptable a calendario de paros o contingencias escolares; convenio formalizado con DAEM para respaldo institucional.'
    },
    updatedAt: '2026-09-08T05:30:00Z',
    createdAt: '2026-05-15T09:00:00Z'
  }
];

export const INITIAL_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tmpl-comun-01',
    code: 'TMPL-ESC-CIRCULAR-01',
    name: 'Montaje Teatral & Gira Interregional (Fondart)',
    description: 'Estructura recomendada para producciones escénicas con diseño circular desmontable, residencia en Santiago, itinerancia en Rancagua y rendición Fondart.',
    discipline: 'Artes Escénicas (Teatro/Danza/Circo)',
    scope: 'comun',
    archetype: 'ciclo_circular',
    suggestedDurationWeeks: 24,
    baseCostRangeCLP: {
      min: 22000000,
      max: 36000000,
      typical: 28500000,
      currency: 'CLP'
    },
    recommendedFundingType: 'fondos_publicos',
    tags: ['Fondart', 'Teatro', 'Itinerancia', 'Santiago-Rancagua', 'Circular'],
    referenceAt: '2026-09-08T06:00:00Z',
    suggestedStages: [
      {
        code: 'ET-01',
        name: 'Preproducción, Dramaturgia e Investigación Territorial',
        stageType: 'preproduccion',
        durationWeeks: 8,
        apartados: ['Investigación Dramatúrgica', 'Diseño Escénico Modular', 'Cierre de Cartas de Compromiso'],
        typicalTasks: ['Entrega de texto dramático', 'Diseño de escenografía reciclable', 'Contratos y cartas de sala']
      },
      {
        code: 'ET-02',
        name: 'Residencia, Ensayos y Construcción Escenotécnica',
        stageType: 'produccion',
        durationWeeks: 10,
        apartados: ['Ensayos de Elenco (60 hrs)', 'Construcción Escenográfica', 'Composición Sonora'],
        typicalTasks: ['Ensayos en sala técnica', 'Fabricación de módulos de escenografía', 'Composición de banda sonora']
      },
      {
        code: 'ET-03',
        name: 'Temporada Oficial y Gira Regional (Santiago ↔ Rancagua)',
        stageType: 'exhibicion_gira',
        durationWeeks: 4,
        apartados: ['Temporada Santiago', 'Gira Regional O\'Higgins', 'Mediación Escolar'],
        typicalTasks: ['Estreno oficial', 'Flete interregional', 'Funciones de itinerancia y coloquios']
      },
      {
        code: 'ET-04',
        name: 'Archivo Vivo, Cierre Contable y Rendición',
        stageType: 'postproduccion_cierre',
        durationWeeks: 2,
        apartados: ['Archivo Vivo Digital', 'Rendición Plataforma Fondart', 'Cierre Administrativo ATHA'],
        typicalTasks: ['Registro audiovisual 4K', 'Rendición de cuentas Fondart', 'Evaluación de impacto']
      }
    ]
  },
  {
    id: 'tmpl-comun-02',
    code: 'TMPL-MUS-FESTIVAL-02',
    name: 'Festival Musical & Red Ecosistémica Comunitaria',
    description: 'Plantilla integral para eventos musicales autogestionados al aire libre con múltiples bandas, feria local, técnica de gran escala y ticketera.',
    discipline: 'Música en Vivo / Conciertos',
    scope: 'comun',
    archetype: 'red_ecosistema',
    suggestedDurationWeeks: 16,
    baseCostRangeCLP: {
      min: 16000000,
      max: 30000000,
      typical: 22000000,
      currency: 'CLP'
    },
    recommendedFundingType: 'autogestion',
    tags: ['Festival', 'Música en Vivo', 'Autogestión', 'Taquilla', 'Ecosistema'],
    referenceAt: '2026-09-08T06:00:00Z',
    suggestedStages: [
      {
        code: 'ET-01',
        name: 'Curaduría Artística, Permisos y Locación',
        stageType: 'preproduccion',
        durationWeeks: 6,
        apartados: ['Curaduría de Bandas', 'Permisos Municipales y Delegación', 'Seguros Masivos'],
        typicalTasks: ['Cierre de bases y convocatoria', 'Firma de contratos de cachet', 'Permiso de uso de espacio público']
      },
      {
        code: 'ET-02',
        name: 'Campaña de Venta de Entradas y Reserva Técnica',
        stageType: 'produccion',
        durationWeeks: 6,
        apartados: ['Preventa de Tickets', 'Reserva Sonido Line-Array', 'Identidad Visual y Medios'],
        typicalTasks: ['Lanzamiento de ticketera online', 'Consolidación de rider técnico', 'Pauta publicitaria regional']
      },
      {
        code: 'ET-03',
        name: 'Montaje, Jornada del Festival y Operación en Vivo',
        stageType: 'exhibicion_gira',
        durationWeeks: 2,
        apartados: ['Operación de Escenario', 'Seguridad OS-10 y Salud', 'Feria y Barra Gastronómica'],
        typicalTasks: ['Montaje de estructura Layher', 'Soundchecks y conciertos', 'Operación de accesos y seguridad']
      },
      {
        code: 'ET-04',
        name: 'Desmontaje, Balance Financiero y Aftermovie',
        stageType: 'postproduccion_cierre',
        durationWeeks: 2,
        apartados: ['Cuadratura de Boletería', 'Desarme y Limpieza de Recinto', 'Entrega de Aftermovie'],
        typicalTasks: ['Liquidación a bandas y proveedores', 'Publicación de video oficial', 'Balance financiero final']
      }
    ]
  },
  {
    id: 'tmpl-op-01',
    code: 'TMPL-OP-VALERIA-01',
    name: 'Residencia Escolar & Mediación Territorial',
    description: 'Plantilla personal de Valeria Mansilla para programas de co-creación en liceos técnicos y comunidades del Valle Central financiado por FNDR o Donaciones.',
    discipline: 'Gestión Cultural & Mediación',
    scope: 'operador',
    operatorId: 'op-valeria-mansilla',
    operatorName: 'Valeria Mansilla',
    archetype: 'cadena_lineal',
    suggestedDurationWeeks: 12,
    baseCostRangeCLP: {
      min: 10000000,
      max: 18000000,
      typical: 14000000,
      currency: 'CLP'
    },
    recommendedFundingType: 'mixto',
    tags: ['Mediación', 'Escuelas', 'Cachapoal', 'FNDR', 'Valeria'],
    referenceAt: '2026-09-08T06:00:00Z',
    suggestedStages: [
      {
        code: 'ET-01',
        name: 'Vinculación Institucional y Diseño Pedagógico',
        stageType: 'preproduccion',
        durationWeeks: 4,
        apartados: ['Convenio DAEM y Liceos', 'Selección de Artistas', 'Diseño de Cuadernillo'],
        typicalTasks: ['Firma de convenios escolares', 'Convocatoria a creadores', 'Diseño metodológico']
      },
      {
        code: 'ET-02',
        name: 'Talleres en Aula y Laboratorio Creativo',
        stageType: 'produccion',
        durationWeeks: 5,
        apartados: ['Sesiones con Estudiantes', 'Registro Testimonial', 'Kits de Materiales'],
        typicalTasks: ['Ejecución de 10 talleres', 'Grabación documental', 'Supervisión pedagógica']
      },
      {
        code: 'ET-03',
        name: 'Muestra Pública, Fanzine y Rendición FNDR',
        stageType: 'exhibicion_gira',
        durationWeeks: 3,
        apartados: ['Exposición Comunitaria', 'Impresión de Publicación', 'Rendición de Fondos'],
        typicalTasks: ['Inauguración abierta', 'Distribución de fanzines', 'Cierre contable']
      }
    ]
  },
  {
    id: 'tmpl-op-02',
    code: 'TMPL-OP-IGNACIO-02',
    name: 'Ciclo de Sesiones Musicales En Vivo & Registro 4K',
    description: 'Plantilla personal de Ignacio Silva para ciclos acústicos y sesiones en directo en espacios no convencionales de la Región de O\'Higgins.',
    discipline: 'Música en Vivo / Conciertos',
    scope: 'operador',
    operatorId: 'op-ignacio-silva',
    operatorName: 'Ignacio Silva',
    archetype: 'ciclo_circular',
    suggestedDurationWeeks: 8,
    baseCostRangeCLP: {
      min: 6000000,
      max: 12000000,
      typical: 8500000,
      currency: 'CLP'
    },
    recommendedFundingType: 'mixto',
    tags: ['Sesiones En Vivo', 'Música', 'Audiovisual', 'Rancagua', 'Ignacio'],
    referenceAt: '2026-09-08T06:00:00Z',
    suggestedStages: [
      {
        code: 'ET-01',
        name: 'Selección de Artistas y Acuerdos de Espacio',
        stageType: 'preproduccion',
        durationWeeks: 3,
        apartados: ['Curaduría de 4 Artistas', 'Permisos de Locación Patrimonial', 'Plan de Grabación'],
        typicalTasks: ['Confirmación de bandas', 'Inspección técnica de locación', 'Contratos de cesión']
      },
      {
        code: 'ET-02',
        name: 'Jornadas de Rodaje y Grabación Multitrack',
        stageType: 'produccion',
        durationWeeks: 2,
        apartados: ['Montaje de Luces y Cámaras', 'Grabación en Directo con Público Reducido'],
        typicalTasks: ['Rodaje de sesiones en vivo', 'Registro de audio multipista', 'Catering de producción']
      },
      {
        code: 'ET-03',
        name: 'Mezcla, Masterización y Lanzamiento Digital',
        stageType: 'postproduccion_cierre',
        durationWeeks: 3,
        apartados: ['Mezcla de Audio', 'Colorización 4K', 'Distribución en YouTube/Spotify'],
        typicalTasks: ['Master de audio estéreo', 'Edición de video definitiva', 'Campaña de estreno']
      }
    ]
  }
];

export const INITIAL_METRICS_SCHEMA: MetricsSchema = {
  version: '1.1.0-ATHAMU',
  title: 'Esquema de Métricas y Viabilidad Cultural ATHA Producciones',
  description: 'Diccionario de métricas estandarizadas para evaluación presupuestaria, equilibrios territoriales y arquetipos de valor en proyectos artísticos interregionales (Santiago ↔ Rancagua).',
  currency: 'CLP',
  metrics: [
    {
      key: 'totalDirectCostCLP',
      name: 'Costo Directo Total',
      category: 'financiero',
      type: 'currency_clp',
      unit: 'CLP',
      description: 'Suma de todos los ítems de gasto directos en honorarios, producción, técnica, difusión, logística y salas.',
      targetRange: { min: 1000000, max: 100000000 }
    },
    {
      key: 'contingencyCLP',
      name: 'Reserva de Contingencia Imprevistos',
      category: 'financiero',
      type: 'currency_clp',
      unit: 'CLP',
      description: 'Monto de seguridad calculado según el porcentaje de contingencia (estándar ATHA: 5%).',
      targetRange: { optimal: '5% del costo directo' }
    },
    {
      key: 'totalBudgetWithContingencyCLP',
      name: 'Presupuesto Total Consolidado',
      category: 'financiero',
      type: 'currency_clp',
      unit: 'CLP',
      description: 'Costo directo total más reserva de contingencia presupuestada.'
    },
    {
      key: 'totalConfirmedFundingCLP',
      name: 'Financiamiento Total Comprometido',
      category: 'financiero',
      type: 'currency_clp',
      unit: 'CLP',
      description: 'Suma de aportes propios, fondos solicitados/adjudicados, aportes de terceros y taquilla estimada.'
    },
    {
      key: 'financingGapCLP',
      name: 'Brecha de Financiamiento (Déficit / Superávit)',
      category: 'financiero',
      type: 'currency_clp',
      unit: 'CLP',
      description: 'Diferencia entre presupuesto total y financiamiento confirmado. Un valor positivo indica déficit pendiente de cobertura.',
      targetRange: { max: 0, optimal: 0 }
    },
    {
      key: 'publicFundCoveragePct',
      name: 'Cobertura por Fondos Públicos Concursables',
      category: 'financiero',
      type: 'percentage',
      unit: '%',
      description: 'Porcentaje del presupuesto cubierto por Fondart, Fondo de la Música o FNDR.',
      targetRange: { min: 0, max: 85 }
    },
    {
      key: 'selfManagementCoveragePct',
      name: 'Tasa de Autonomía / Autogestión',
      category: 'financiero',
      type: 'percentage',
      unit: '%',
      description: 'Porcentaje cubierto por taquilla, auspicios privados y aportes propios de la productora.',
      targetRange: { min: 15, max: 100 }
    },
    {
      key: 'breakEvenTicketsCount',
      name: 'Tickets para Punto de Equilibrio',
      category: 'financiero',
      type: 'number',
      unit: 'entradas',
      description: 'Cantidad de entradas que deben venderse para cubrir la brecha financiera al precio promedio estipulado.'
    },
    {
      key: 'breakEvenOccupancyPct',
      name: 'Ocupación de Sala para Punto de Equilibrio',
      category: 'financiero',
      type: 'percentage',
      unit: '%',
      description: 'Porcentaje del aforo total que representa el punto de equilibrio. Si supera el 85%, el proyecto está en zona de riesgo.',
      targetRange: { max: 85, optimal: 65 }
    },
    {
      key: 'financialViabilityIndex',
      name: 'Índice de Viabilidad Económica ATHA',
      category: 'financiero',
      type: 'number',
      unit: 'puntos (0-100)',
      description: 'Puntaje ponderado que evalúa cobertura de brecha, respaldo de contingencia, coherencia de taquilla y diversidad de fuentes.',
      targetRange: { min: 70, max: 100, optimal: 85 }
    },
    {
      key: 'territoryScope',
      name: 'Alcance Territorial',
      category: 'territorial',
      type: 'enum',
      description: 'Categorización territorial del proyecto: Santiago (RM), Rancagua / O\'Higgins, o Interregional (Santiago ↔ Rancagua).'
    },
    {
      key: 'venuesInvolvedCount',
      name: 'Recintos y Salas Involucradas',
      category: 'territorial',
      type: 'number',
      unit: 'espacios',
      description: 'Cantidad de centros culturales, teatros o espacios públicos activados en la temporada.'
    },
    {
      key: 'interregionalBridgesCount',
      name: 'Puentes de Articulación Interregional',
      category: 'territorial',
      type: 'number',
      unit: 'conexiones',
      description: 'Instancias formales de intercambio entre creadores de la Región Metropolitana y la Región de O\'Higgins.'
    },
    {
      key: 'communityPartnersCount',
      name: 'Socios Comunitarios e Institucionales',
      category: 'territorial',
      type: 'number',
      unit: 'entidades',
      description: 'Liceos, juntas vecinales, cooperativas o municipalidades formalmente involucradas.'
    },
    {
      key: 'archetypeModel',
      name: 'Modelo de Arquetipo de Valor',
      category: 'arquetipo',
      type: 'enum',
      description: 'Modelo estratégico de entrega de valor: Cadena Lineal, Ciclo Circular o Red Ecosistémica.'
    },
    {
      key: 'sceneryReusePct',
      name: 'Porcentaje de Reutilización Escenográfica / Insumos',
      category: 'arquetipo',
      type: 'percentage',
      unit: '%',
      description: 'Grado de aprovechamiento de materiales nobles, escenografías modulares o equipamiento amortizable.',
      targetRange: { min: 0, max: 100, optimal: 75 }
    },
    {
      key: 'circularityIndex',
      name: 'Índice de Circularidad Cultural',
      category: 'arquetipo',
      type: 'number',
      unit: 'puntos (0-100)',
      description: 'Medición de archivo vivo, itinerancia regional, reestreno y ecodiseño escénico.'
    },
    {
      key: 'totalDurationWeeks',
      name: 'Duración Total en Semanas',
      category: 'operacional',
      type: 'weeks',
      unit: 'semanas',
      description: 'Horizonte temporal desde el inicio de la investigación hasta el cierre contable y rendición.',
      targetRange: { min: 6, max: 52 }
    },
    {
      key: 'stagesCount',
      name: 'Cantidad de Etapas Operacionales',
      category: 'operacional',
      type: 'number',
      unit: 'etapas',
      description: 'Etapas del ciclo de vida del proyecto (preproducción, producción, exhibición, postproducción/cierre).'
    },
    {
      key: 'criticalMilestonesCount',
      name: 'Hitos Críticos de Control',
      category: 'operacional',
      type: 'number',
      unit: 'hitos',
      description: 'Puntos de control sin los cuales el proyecto no puede avanzar de fase (cierre de contratos, estreno, rendición).'
    }
  ]
};

