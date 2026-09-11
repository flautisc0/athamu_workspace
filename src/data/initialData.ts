import {
  Obra,
  Lead,
  ProjectRD,
  TeamMember,
  Venue,
  InventoryItem,
  FinanceRecord,
  CreativeLog,
  StandardRider,
  EventSchedule,
  ArtistAvailability
} from '../types';

/**
 * ============================================================================
 * DATOS EDITABLES - ATHA PRODUCCIONES (CHILE)
 * Modifique los arreglos a continuación para agregar o editar información inicial.
 * La aplicación almacena los cambios en localStorage automáticamente.
 * ============================================================================
 */

// 1. CATÁLOGO DE OBRAS (Mínimo 8-11 obras chilenas realistas)
export const INITIAL_OBRAS: Obra[] = [
  {
    id: 'obra-01',
    title: 'La Memoria de las Aguas',
    discipline: 'Danza',
    format: 'Caja Negra / Sala Principal',
    duration: '65 min',
    targetAudience: '+14 años',
    status: 'En gira',
    synopsis: 'Pieza coreográfica contemporánea que investiga la relación entre la sequía en la cuenca del Río Aconcagua, el cuerpo femenino y los rituales ancestrales de rogativa de lluvia en la zona central de Chile.',
    castTeam: {
      direction: 'Jo Schultz',
      cast: ['Catalina Valenzuela', 'Ignacio Araya', 'Tamara Gómez', 'Matías Cárdenas', 'Fernanda Sepúlveda'],
      music: 'Nicolás Ortiz (Diseño sonoro en vivo)',
      technical: 'Antonia Fernández (Diseño de iluminación & espacio)'
    },
    technicalRider: {
      minStageWidthMeters: 10,
      minStageDepthMeters: 9,
      lighting: 'Parrilla DMX 24 canales, 12 fresneles 1kW, 8 elipsoidales ETC Source Four 36°, 4 varas LED RGBW.',
      sound: 'Sistema PA estéreo L-Acoustics o d&b, 4 monitores de piso, 2 micros ambientales Shure KSM137, interfaz Apollo x8.',
      loadInHours: 6,
      crewRequired: 4
    },
    economics: {
      feeCLP: 3800000,
      ticketSplitEstimatedCLP: 5200000,
      productionCostCLP: 8900000
    },
    premiereDate: '12 de Octubre 2024 (Teatro Biobío)',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Premio Círculo de Críticos de Arte de Chile (Mención Danza)',
      'Seleccionada para Festival Internacional Santiago a Mil 2025',
      'Elenco de 5 intérpretes + músico en vivo y técnico residente'
    ],
    notes: 'Disponible para giras nacionales e internacionales. Adaptable a espacios patrimoniales con piso linóleo propio.'
  },
  {
    id: 'obra-02',
    title: 'Cordillera Eléctrica',
    discipline: 'Música',
    format: 'Sala Grande / Concierto Electroacústico',
    duration: '80 min',
    targetAudience: 'Todo espectador',
    status: 'En repertorio',
    synopsis: 'Ensamble de cuerdas folclóricas chilenas (charango, cuatro, tiple) fusionado con sintetizadores análogos modulares y grabaciones de campo del altiplano y la Patagonia chilena.',
    castTeam: {
      direction: 'Nicolás Ortiz',
      cast: ['Nicolás Ortiz', 'Camila Rivas (Charango & Tiple)', 'Javier Mancilla (Cello)', 'Paz Troncoso (Percusión latinoamericana)'],
      music: 'Composición original de Nicolás Ortiz & Ensamble ATHA',
      technical: 'Tomás Verdugo (Ingeniero FOH)'
    },
    technicalRider: {
      minStageWidthMeters: 8,
      minStageDepthMeters: 6,
      lighting: 'Iluminación cálida teatral, 6 móviles Wash, niebla ligera constante.',
      sound: 'Consola digital Midas M32 o Allen&Heath SQ6, 8 líneas directas DI Radial, 4 micros DPA 4099.',
      loadInHours: 4,
      crewRequired: 3
    },
    economics: {
      feeCLP: 2900000,
      ticketSplitEstimatedCLP: 4500000,
      productionCostCLP: 6200000
    },
    premiereDate: '24 de Noviembre 2024 (GAM Sala A1)',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Gira financiada por Fondo de la Música 2024',
      'Álbum disponible en vinilo y plataformas digitales con más de 180k reproducciones',
      'Rider liviano y altamente transportable para festivales de formato medio'
    ],
    notes: 'Cuenta con visuales reactivas sincronizadas vía MIDI/TouchDesigner.'
  },
  {
    id: 'obra-03',
    title: 'Los Nadies del Salitre',
    discipline: 'Teatro',
    format: 'Sala Grande / Escenario a la Italiana',
    duration: '90 min',
    targetAudience: '+14 años',
    status: 'En repertorio',
    synopsis: 'Drama histórico-poético sobre las familias obreras de la pampa salitrera de Tarapacá en 1907. Una reconstrucción coral basada en testimonios orales, cartas y canciones obreras recopiladas en archivos de Iquique y Antofagasta.',
    castTeam: {
      direction: 'Francisco Pérez',
      cast: ['Rodrigo Soto', 'Daniela Lhorente', 'Esteban Cerda', 'Paulina Eguiluz', 'Alonso Quintero'],
      music: 'Nicolás Ortiz & Coro Popular',
      technical: 'Antonia Fernández (Dirección de arte y técnica)'
    },
    technicalRider: {
      minStageWidthMeters: 12,
      minStageDepthMeters: 10,
      lighting: 'Escenario teatral completo, 16 fresneles, 12 recortes, 6 perfiles LED, ciclorama blanco de fondo.',
      sound: '5 micrófonos inalámbricos diadema Sennheiser EW-D, ambientación de sala 5.1 surround.',
      loadInHours: 8,
      crewRequired: 5
    },
    economics: {
      feeCLP: 5500000,
      ticketSplitEstimatedCLP: 7800000,
      productionCostCLP: 14500000
    },
    premiereDate: '15 de Enero 2024 (Matucana 100)',
    image: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Temporada agotada en Matucana 100 con 14 funciones consecutivas',
      'Premio Mejor Montaje Teatral Regional en FONDART',
      'Escenografía modular que se pliega en 1 camión de 5 toneladas'
    ],
    notes: 'Requiere vara motorizada para el izamiento del telón de yute de 10 metros.'
  },
  {
    id: 'obra-04',
    title: 'Bitácora del Viento Sur',
    discipline: 'Interdisciplinar',
    format: 'Espacio Público / Domo Inmersivo',
    duration: '50 min',
    targetAudience: 'Familiar',
    status: 'En gira',
    synopsis: 'Instalación performática al aire libre con marionetas gigantes de tela liviana, acrobacia en tela aérea y relatos orales del archipiélago de Chiloé y Magallanes.',
    castTeam: {
      direction: 'Jo Schultz & Francisco Pérez',
      cast: ['Belén Carmona', 'Gaspar Henríquez', 'Loreto Díaz', 'Simón Barraza'],
      music: 'Nicolás Ortiz (Banda de bronces y percusión)',
      technical: 'Antonia Fernández & Equipo Rigging ATHA'
    },
    technicalRider: {
      minStageWidthMeters: 14,
      minStageDepthMeters: 12,
      lighting: 'Estructura truss autónoma 4x4m, luminarias IP65 para intemperie, generador 25kVA.',
      sound: 'Sistema de audio perimetral de alta dispersión para 600 personas.',
      loadInHours: 7,
      crewRequired: 6
    },
    economics: {
      feeCLP: 4200000,
      ticketSplitEstimatedCLP: 6000000,
      productionCostCLP: 9500000
    },
    premiereDate: '03 de Febrero 2024 (Plaza Sotomayor, Valparaíso)',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Más de 12.000 espectadores en gira por 6 comunas de la Región de Los Lagos',
      'No requiere sala cerrada, totalmente adaptable a parques y costaneras',
      'Taller de mediación comunitaria previo a cada función'
    ],
    notes: 'Cuenta con seguro contra accidentes y certificado SEC para instalación eléctrica autónoma.'
  },
  {
    id: 'obra-05',
    title: 'Volcánica: Rituales del Fuego',
    discipline: 'Danza',
    format: 'Caja Negra',
    duration: '70 min',
    targetAudience: '+14 años',
    status: 'En producción',
    synopsis: 'Solo de danza y percusión en vivo inspirado en la tectónica de placas y el cordón de fuego andino. Una experiencia física visceral de resistencia y transformación mineral.',
    castTeam: {
      direction: 'Jo Schultz',
      cast: ['Jo Schultz (Intérprete solista)'],
      music: 'Álvaro Pacheco (Percusión acústica & electrónica)',
      technical: 'Antonia Fernández (Espacio escénico de ceniza volcánica)'
    },
    technicalRider: {
      minStageWidthMeters: 9,
      minStageDepthMeters: 8,
      lighting: 'Piso negro mate, linóleo de alta densidad, 8 tubos LED Titan Astera, 4 luces de recorte cenital.',
      sound: 'Sistema cuadrafónico inmersivo con subwoofer reforzado.',
      loadInHours: 5,
      crewRequired: 3
    },
    economics: {
      feeCLP: 2800000,
      ticketSplitEstimatedCLP: 3900000,
      productionCostCLP: 5100000
    },
    premiereDate: 'Mayo 2025 (Parque Cultural de Valparaíso)',
    image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Residencia de creación en PCDV Valparaíso y Nave Santiago',
      'Formato unipersonal con alta viabilidad de exportación internacional',
      'Uso de sensores de movimiento que modulan el sonido en tiempo real'
    ],
    notes: 'Utiliza carbón vegetal desactivado inocuo sobre el piso escénico. Requiere protocolo de aspirado post-función.'
  },
  {
    id: 'obra-06',
    title: 'Frecuencia Maule: Crónicas de la Niebla',
    discipline: 'Música',
    format: 'Íntimo / Concierto Teatralizado',
    duration: '60 min',
    targetAudience: 'Todo espectador',
    status: 'Estreno',
    synopsis: 'Homenaje musical y narrativo a las estaciones de radio AM rurales del Valle Central chileno en las décadas de los 70 y 80, integrando cuentería campesina, tonadas y radioteatro en vivo.',
    castTeam: {
      direction: 'Francisco Pérez & Nicolás Ortiz',
      cast: ['Héctor Morales (Narrador / Locutor)', 'María José Quintanilla (Voz invitada)', 'Trío de Guitarras del Maule'],
      music: 'Arreglos de Nicolás Ortiz sobre recopilación de Margot Loyola',
      technical: 'Felipe Canales'
    },
    technicalRider: {
      minStageWidthMeters: 8,
      minStageDepthMeters: 5,
      lighting: 'Ambiente nostálgico ámbar, lámparas de tungsteno vintage funcionales, 4 perfiles.',
      sound: '6 micrófonos Shure 55SH Serie II (vintage look), mesa analógica con procesador de válvulas.',
      loadInHours: 3.5,
      crewRequired: 2
    },
    economics: {
      feeCLP: 3200000,
      ticketSplitEstimatedCLP: 4800000,
      productionCostCLP: 5800000
    },
    premiereDate: '28 de Marzo 2025 (Teatro Regional del Maule)',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Co-producción con el Teatro Regional del Maule',
      'Incluye exposición itinerante de radios antiguas en el foyer del teatro',
      'Transmisión radial simultánea para comunidades rurales sin acceso digital'
    ],
    notes: 'Listo para programar en la Red de Salas de Teatro de Chile.'
  },
  {
    id: 'obra-07',
    title: 'Antígona en el Desierto',
    discipline: 'Teatro',
    format: 'Espacio no convencional / Sitio Específico',
    duration: '85 min',
    targetAudience: '+16 años',
    status: 'En producción',
    synopsis: 'Reescritura del clásico de Sófocles situada en una salitrera abandonada del desierto de Atacama, explorando las búsquedas de las mujeres de Calama y la memoria de los cuerpos que el viento no deja olvidar.',
    castTeam: {
      direction: 'Francisco Pérez',
      cast: ['Claudia Di Girolamo', 'Francisco Melo', 'Ignacia Baeza', 'Gabriel Urzúa'],
      music: 'Nicolás Ortiz (Composición para chelo y quena procesada)',
      technical: 'Antonia Fernández (Diseño de antorchas y luz de descarga solar)'
    },
    technicalRider: {
      minStageWidthMeters: 15,
      minStageDepthMeters: 15,
      lighting: 'Iluminación basada en proyectores LED autónomos a batería y lámparas de sodio.',
      sound: 'Sistema de audio distribuido con microfonía omnidireccional resistente al polvo y viento.',
      loadInHours: 8,
      crewRequired: 6
    },
    economics: {
      feeCLP: 6800000,
      ticketSplitEstimatedCLP: 9500000,
      productionCostCLP: 18000000
    },
    premiereDate: 'Septiembre 2025 (Desierto de Atacama / Centro Cultural Baquedano)',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Proyecto apoyado por Fondo Bicentenario de Creación Artística',
      'Equipo interdisciplinario con arqueólogos y agrupaciones de memoria de Antofagasta',
      'Documental del proceso creativo en coproducción con TVN y UCHILE'
    ],
    notes: 'Requiere logística de traslados 4x4 y carpas de producción para condiciones de intemperie desértica.'
  },
  {
    id: 'obra-08',
    title: 'Festival Umbral de las Artes',
    discipline: 'Festival',
    format: 'Multi-sala / Espacio Urbano',
    duration: '3 días continuos',
    targetAudience: 'Todo espectador',
    status: 'I+D',
    synopsis: 'Festival bienal curado y producido integralmente por ATHA Producciones que reúne a más de 20 agrupaciones escénicas independientes de las regiones de Valparaíso, O\'Higgins y Maule con cruces tecnológicos y música popular.',
    castTeam: {
      direction: 'Equipo Directivo ATHA (Pérez, Schultz, Fernández, Ortiz)',
      cast: ['Más de 85 artistas y creadores convocados'],
      music: 'Programación de 12 bandas y ensambles acústicos',
      technical: 'Equipo Técnico Central ATHA (18 profesionales técnicos)'
    },
    technicalRider: {
      minStageWidthMeters: 18,
      minStageDepthMeters: 14,
      lighting: '3 escenarios simultáneos con riders homologados tipo festival.',
      sound: 'Sistemas line-array principales para 2500 personas por escenario.',
      loadInHours: 24,
      crewRequired: 22
    },
    economics: {
      feeCLP: 28000000,
      ticketSplitEstimatedCLP: 42000000,
      productionCostCLP: 55000000
    },
    premiereDate: 'Enero 2026 (Parque Quinta Normal & Matucana)',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Modelo de gestión asociativo con 4 salas de Santiago poniente',
      'Plataforma de vinculación para programadores de Mercartes y Santiago a Mil',
      '100% compensación de huella de carbono y gestión de residuos'
    ],
    notes: 'En etapa de postulación a Fondart Nacional Trayectoria y auspicios privados bajo Ley de Donaciones Culturales.'
  },
  {
    id: 'obra-09',
    title: 'Geografía del Gesto',
    discipline: 'Danza',
    format: 'Caja Negra / Formato Medio',
    duration: '55 min',
    targetAudience: '+12 años',
    status: 'En repertorio',
    synopsis: 'Investigación física sobre los movimientos laborales tradicionales de Chile: la cosecha del trigo a hoz, la tejeduría a telar mapuche y la boga de los pescadores artesanales de Calbuco.',
    castTeam: {
      direction: 'Jo Schultz',
      cast: ['Claudio Puebla', 'Paula Sacur', 'Francisca Silva', 'David Dinamarca'],
      music: 'Nicolás Ortiz (Fusión cuerdas y samples de oficios)',
      technical: 'Antonia Fernández'
    },
    technicalRider: {
      minStageWidthMeters: 10,
      minStageDepthMeters: 8,
      lighting: 'Parrilla teatral básica, 10 focos PAR LED, 6 recortes.',
      sound: 'Sistema estéreo de buena calidad, 2 micrófonos inalámbricos de solapa.',
      loadInHours: 4,
      crewRequired: 2
    },
    economics: {
      feeCLP: 2600000,
      ticketSplitEstimatedCLP: 3500000,
      productionCostCLP: 4700000
    },
    premiereDate: 'Agosto 2024 (Centro Cultural GAM)',
    image: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80',
    dossierHighlights: [
      'Obra altamente solicitada por colegios artísticos y liceos municipales',
      'Incluye cuaderno pedagógico descargable elaborado por el Ministerio de las Culturas',
      'Fácil montaje en gimnasios acondicionados o teatros provinciales'
    ],
    notes: 'Apta para itinerancias escolares y festivales universitarios.'
  }
];

// 2. EQUIPO DIRECTIVO Y FUNDADORES (Los 4 socios fundadores de ATHA)
export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'team-01',
    name: 'Francisco Pérez',
    role: 'Socio Fundador',
    title: 'Director General & Productor Ejecutivo',
    bio: 'Actor y Gestor Cultural de la Universidad de Chile con más de 16 años liderando festivales y montajes teatrales en Chile y el Cono Sur. Especialista en financiamiento cultural (FONDART, Ley de Donaciones), convenios con teatros públicos y alianzas internacionales.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    email: 'francisco@athaproducciones.cl',
    phone: '+56 9 8452 1190',
    location: 'Santiago, Chile',
    activeProjects: ['Los Nadies del Salitre', 'Antígona en el Desierto', 'Festival Umbral de las Artes', 'Radar Cultural'],
    discipline: 'Teatro & Gestión Cultural'
  },
  {
    id: 'team-02',
    name: 'Jo Schultz',
    role: 'Socia Fundadora',
    title: 'Directora Creativa & Coreógrafa',
    bio: 'Bailarina, coreógrafa y máster en Artes Escénicas de la Universidad Católica. Ha dirigido piezas premiadas internacionalmente en festivales de Alemania, España y Brasil. Su sello integra la dramaturgia del cuerpo con debates ecológicos y territorio.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    email: 'jo.schultz@athaproducciones.cl',
    phone: '+56 9 9341 8722',
    location: 'Valparaíso / Santiago',
    activeProjects: ['La Memoria de las Aguas', 'Volcánica: Rituales del Fuego', 'Geografía del Gesto', 'Proyecto Aurora'],
    discipline: 'Danza Contemporánea & Performance'
  },
  {
    id: 'team-03',
    name: 'Antonia Fernández',
    role: 'Socia Fundadora',
    title: 'Directora de Producción Técnica & Iluminación',
    bio: 'Diseñadora teatral y master en tecnología lumínica de la Universidad de Chile. Ha sido jefa técnica en recintos como Matucana 100 y Teatro Biobío. Supervisa el cumplimiento de riders, logística de transportes, seguridad escénica y sostenibilidad técnica de ATHA.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    email: 'antonia@athaproducciones.cl',
    phone: '+56 9 7619 4401',
    location: 'Santiago, Chile',
    activeProjects: ['Riders Estándar ATHA', 'Inventario Backline', 'Planificación Giras 2025', 'Proyecto Aurora'],
    discipline: 'Diseño Escénico, Rigging & Técnica'
  },
  {
    id: 'team-04',
    name: 'Nicolás Ortiz',
    role: 'Socio Fundador',
    title: 'Director Musical & Curaduría Sonora',
    bio: 'Compositor, multi-instrumentista e ingeniero acústico de la Universidad Austral de Chile. Experto en diseño sonoro inmersivo, sintetizadores análogos y rescate organológico latinoamericano. Responsable de la identidad sonora de todas las producciones de la casa.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    email: 'nicolas@athaproducciones.cl',
    phone: '+56 9 6183 9934',
    location: 'Concepción / Santiago',
    activeProjects: ['ATHAMU', 'Tiny Patio Concerts', 'Cordillera Eléctrica', 'Frecuencia Maule'],
    discipline: 'Música, Acústica & Diseño Sonoro'
  }
];

// 3. PROYECTOS I+D (Iniciativas con porcentaje de avance y roadmap)
export const INITIAL_RD_PROJECTS: ProjectRD[] = [
  {
    id: 'rd-01',
    code: 'RD-ATHAMU',
    title: 'ATHAMU: Plataforma Sonoro-Escénica & IA',
    progress: 74,
    phase: 'Fase Beta & Pruebas en Vivo',
    description: 'Investigación tecnológica aplicada a la creación escénica: desarrollo de un sistema modular que captura parámetros biométricos (frecuencia cardíaca, aceleración) de los intérpretes en escena y modula texturas sonoras y luminarias en tiempo real sin latencia perceptible.',
    teamLead: 'Nicolás Ortiz & Antonia Fernández',
    budgetCLP: 18500000,
    spentCLP: 13900000,
    milestoneUpcoming: 'Prueba de estrés en escenario real con 4 bailarinas en Centro Nave (Abril 2025)',
    tags: ['Música', 'Sensores OSC/MIDI', 'Software Libre', 'FONDART Innovación'],
    updatedAt: '02/03/2025'
  },
  {
    id: 'rd-02',
    code: 'RD-TINYPATIO',
    title: 'Tiny Patio Concerts: Sesiones Íntimas Acústicas',
    progress: 88,
    phase: 'Fase de Rodaje Temporada 2',
    description: 'Ciclo audiovisual y escénico de conciertos de pequeño formato acústico en patios patrimoniales y azoteas de Santiago y Valparaíso. Modelo sustentable de financiamiento con micro-audiencias (máximo 40 personas) y registro cinematográfico 4K en cinta de audio análoga.',
    teamLead: 'Francisco Pérez & Nicolás Ortiz',
    budgetCLP: 9200000,
    spentCLP: 8100000,
    milestoneUpcoming: 'Lanzamiento de capítulo 4 con cantante invitada Pascuala Ilabaca (Marzo 2025)',
    tags: ['Música Acústica', 'Streaming Hi-Fi', 'Patrimonio', 'Micro-audiencias'],
    updatedAt: '05/03/2025'
  },
  {
    id: 'rd-03',
    code: 'RD-AURORA',
    title: 'Proyecto Aurora: Laboratorio Inmersivo de Danza y Luz',
    progress: 45,
    phase: 'Prototipado de Escenografía Reactiva',
    description: 'Laboratorio de cruce transdisciplinario entre danza contemporánea, proyecciones volumétricas sobre niebla criogénica y sistemas de sonido espacializado ambisonics de 16 canales. Explora la percepción óptica de los fenómenos de auroras y magnetósfera austral.',
    teamLead: 'Jo Schultz & Antonia Fernández',
    budgetCLP: 24000000,
    spentCLP: 10800000,
    milestoneUpcoming: 'Construcción de domo geodésico transportable de 10 metros de diámetro (Junio 2025)',
    tags: ['Danza Inmersiva', 'Ambisonics', 'Luz Volumétrica', 'I+D Escénico'],
    updatedAt: '28/02/2025'
  },
  {
    id: 'rd-04',
    code: 'RD-RADAR',
    title: 'Radar Cultural: Mapeo de Salas y Nuevos Públicos',
    progress: 62,
    phase: 'Integración de Datos & Mapeo Regional',
    description: 'Herramienta de inteligencia de datos territoriales orientada al ecosistema escénico chileno: cruza aforos, perfil socioeconómico comunal, costo de traslados logísticos y programación histórica de salas para optimizar la toma de decisiones al fijar fechas de giras fuera de la RM.',
    teamLead: 'Francisco Pérez',
    budgetCLP: 7800000,
    spentCLP: 4900000,
    milestoneUpcoming: 'Integración del catastro de 35 centros culturales municipales de las regiones Maule, Ñuble y Biobío',
    tags: ['Gestión Cultural', 'Datos Abiertos', 'Descentralización', 'Giras'],
    updatedAt: '01/03/2025'
  }
];

// 4. CRM / LEADS DE SALAS, FESTIVALES, PROGRAMADORES Y PROVEEDORES CHILENOS
export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-01',
    name: 'Rodrigo Bazaes / Carla Romero',
    organization: 'Centro Cultural GAM (Gabriela Mistral)',
    type: 'sala',
    status: 'negociacion',
    city: 'Santiago (Barrio Lastarria)',
    email: 'programacion@gam.cl',
    phone: '+56 2 2566 5500',
    notes: 'Negociando temporada de 12 funciones de "La Memoria de las Aguas" en Sala A1 para Agosto 2025. Enviado dossier técnico actualizado.',
    lastContactDate: '01/03/2025',
    estimatedValueCLP: 7600000,
    assignedTo: 'Francisco Pérez'
  },
  {
    id: 'lead-02',
    name: 'Cristóbal Gumucio / Macarena Ovalle',
    organization: 'Centro Cultural Matucana 100',
    type: 'sala',
    status: 'cerrado',
    city: 'Estación Central, Santiago',
    email: 'teatro@m100.cl',
    phone: '+56 2 2964 9240',
    notes: 'Convenio marco firmado para re-estreno de "Los Nadies del Salitre" en Teatro Principal. Fechas reservadas: 14 al 24 de Noviembre.',
    lastContactDate: '26/02/2025',
    estimatedValueCLP: 5500000,
    assignedTo: 'Francisco Pérez'
  },
  {
    id: 'lead-03',
    name: 'Francisca Peró',
    organization: 'Teatro Biobío (TBB)',
    type: 'sala',
    status: 'cerrado',
    city: 'Concepción, Región del Biobío',
    email: 'direccion@teatrobiobio.cl',
    phone: '+56 41 262 6000',
    notes: 'Excelente relación histórica. Confirmada participación en temporada de Danza Sur 2025 con dos montajes del catálogo.',
    lastContactDate: '18/02/2025',
    estimatedValueCLP: 8400000,
    assignedTo: 'Jo Schultz'
  },
  {
    id: 'lead-04',
    name: 'Erick Fuentes',
    organization: 'Parque Cultural de Valparaíso (Ex Cárcel)',
    type: 'sala',
    status: 'negociacion',
    city: 'Valparaíso (Cerro Cárcel)',
    email: 'artesescenicas@pcdv.cl',
    phone: '+56 32 235 9400',
    notes: 'Conversaciones para residencia técnica de "Volcánica: Rituales del Fuego" en el Teatro del Parque Cultural durante Abril.',
    lastContactDate: '03/03/2025',
    estimatedValueCLP: 3200000,
    assignedTo: 'Antonia Fernández'
  },
  {
    id: 'lead-05',
    name: 'Carmen Romero / Martín Erazo',
    organization: 'Fundación Teatro a Mil (Fitam)',
    type: 'festival',
    status: 'contactado',
    city: 'Santiago / Giras Regionales',
    email: 'curaduria@teatroamil.cl',
    phone: '+56 2 2482 9300',
    notes: 'Presentado el dossier de "Bitácora del Viento Sur" para el circuito de calle y espacios públicos del festival 2026.',
    lastContactDate: '20/02/2025',
    estimatedValueCLP: 12000000,
    assignedTo: 'Francisco Pérez'
  },
  {
    id: 'lead-06',
    name: 'Rodrigo Osorio / Pamela López',
    organization: 'Teatro Municipal de Las Condes',
    type: 'sala',
    status: 'contactado',
    city: 'Las Condes, Santiago',
    email: 'programacion@tmlc.cl',
    phone: '+56 2 2940 7100',
    notes: 'Enviada propuesta para ciclo de música contemporánea de cámara con "Cordillera Eléctrica". A la espera de respuesta curatorial.',
    lastContactDate: '15/02/2025',
    estimatedValueCLP: 4200000,
    assignedTo: 'Nicolás Ortiz'
  },
  {
    id: 'lead-07',
    name: 'Cristina Abarca',
    organization: 'Festival Fluvial Valdivia',
    type: 'festival',
    status: 'negociacion',
    city: 'Valdivia, Región de Los Ríos',
    email: 'cristina@fluvial.cl',
    phone: '+56 63 222 1090',
    notes: 'Interés en albergar showcase de "ATHAMU" y concierto de cierre en el escenario flotante del Río Calle-Calle.',
    lastContactDate: '02/03/2025',
    estimatedValueCLP: 3800000,
    assignedTo: 'Nicolás Ortiz'
  },
  {
    id: 'lead-08',
    name: 'Claudio Valenzuela (Iluminación)',
    organization: 'Luminotecnia & Escenarios Chile SpA',
    type: 'proveedor',
    status: 'cerrado',
    city: 'Santiago / Renca',
    email: 'contacto@luminotecnia.cl',
    phone: '+56 9 7821 3344',
    notes: 'Proveedor recurrente de trusses y focos móviles robóticos con tarifa preferencial para ATHA de 25% descuento.',
    lastContactDate: '27/02/2025',
    estimatedValueCLP: 1900000,
    assignedTo: 'Antonia Fernández'
  }
];

// 5. SALAS Y VENUES
export const INITIAL_VENUES: Venue[] = [
  {
    id: 'venue-01',
    name: 'Centro Gabriela Mistral (GAM) - Sala A1',
    city: 'Santiago',
    region: 'Metropolitana',
    capacity: 272,
    stageType: 'Caja Negra Italiana (Boca: 14m, Fondo: 11m, Alto: 7m)',
    contactPerson: 'Carla Romero (Jefa de Sala)',
    contactEmail: 'sala.a1@gam.cl',
    status: 'Activo / Convenio',
    specs: 'Parrilla completa motorizada, consola GrandMA2 Light, sistema Meyer Sound LINA.'
  },
  {
    id: 'venue-02',
    name: 'Matucana 100 - Teatro Principal',
    city: 'Estación Central',
    region: 'Metropolitana',
    capacity: 520,
    stageType: 'Proscenio Clásico de Madera (Boca: 12m, Fondo: 12m, Alto: 9m)',
    contactPerson: 'Gonzalo Miranda (Jefe Técnico)',
    contactEmail: 'tecnica@m100.cl',
    status: 'Activo / Convenio',
    specs: 'Consola Yamaha CL5 con RIO3224, 36 dimmers de 2.4kW, excelente acústica natural.'
  },
  {
    id: 'venue-03',
    name: 'Teatro Biobío (TBB) - Sala Principal',
    city: 'Concepción',
    region: 'Biobío',
    capacity: 1200,
    stageType: 'Gran Escenario Modular (Boca: 18m, Fondo: 16m, Alto: 12m con foso de orquesta)',
    contactPerson: 'Eduardo Sepúlveda (Director de Escenario)',
    contactEmail: 'tecnica@teatrobiobio.cl',
    status: 'Activo / Convenio',
    specs: 'Estándar internacional de nivel de ópera, audio d&b audiotechnik serie V, acústica variable.'
  },
  {
    id: 'venue-04',
    name: 'Parque Cultural de Valparaíso - Teatro del Parque',
    city: 'Valparaíso',
    region: 'Valparaíso',
    capacity: 307,
    stageType: 'Teatro Moderno de Pendiente Rápida (Boca: 11m, Fondo: 10m)',
    contactPerson: 'Loreto Silva (Coordinadora Técnica)',
    contactEmail: 'teatro@pcdv.cl',
    status: 'Activo / Convenio',
    specs: 'Piso de danza amortiguado Harlequin propio, microfonía inalámbrica Shure Axient Digital.'
  },
  {
    id: 'venue-05',
    name: 'Teatro del Lago - Espacio Tronador',
    city: 'Frutillar',
    region: 'Los Lagos',
    capacity: 1188,
    stageType: 'Cámara Acústica de Madera de Alerce',
    contactPerson: 'Matías Schmidt (Curador Técnico)',
    contactEmail: 'produccion@teatrodellago.cl',
    status: 'En prospección',
    specs: 'Aislación sonora certificada europea, piano de cola Steinway & Sons D-274 disponible en sala.'
  },
  {
    id: 'venue-06',
    name: 'Teatro Municipal de Las Condes',
    city: 'Las Condes, Santiago',
    region: 'Metropolitana',
    capacity: 874,
    stageType: 'Escenario Mecatrónico de 3 Plataformas Hidráulicas',
    contactPerson: 'Hernán Quintanilla',
    contactEmail: 'escenario@tmlc.cl',
    status: 'En prospección',
    specs: 'Proyección láser 4K Christie 25.000 lúmenes, sistema de traducción simultánea para festivales.'
  }
];

// 6. INVENTARIO Y BACKLINE PROPIO DE ATHA PRODUCCIONES
export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-01',
    code: 'ATH-AUD-01',
    name: 'Consola Digital Midas M32R con Flight Case & Rótula',
    category: 'Audio / Backline',
    condition: 'Excelente',
    status: 'Disponible',
    location: 'Bodega Central Providencia, Rack A2',
    valueCLP: 3400000
  },
  {
    id: 'inv-02',
    code: 'ATH-AUD-02',
    name: 'Sistema Inalámbrico Shure QLXD24/SM58 (4 Canales con Antenas Paleta)',
    category: 'Audio / Backline',
    condition: 'Excelente',
    status: 'Asignado en gira',
    assignedToWork: 'La Memoria de las Aguas',
    location: 'En tránsito a Concepción',
    valueCLP: 4200000
  },
  {
    id: 'inv-03',
    code: 'ATH-LGT-01',
    name: 'Kit 8 Tubos Inalámbricos LED Astera Titan Tubes con Charging Box',
    category: 'Iluminación',
    condition: 'Operativo',
    status: 'Asignado en gira',
    assignedToWork: 'Volcánica: Rituales del Fuego',
    location: 'En ensayo Parque Cultural Valparaíso',
    valueCLP: 6100000
  },
  {
    id: 'inv-04',
    code: 'ATH-LGT-02',
    name: 'Consola Chamsys QuickQ 20 con Maletín y Monitor Táctil',
    category: 'Iluminación',
    condition: 'Excelente',
    status: 'Disponible',
    location: 'Bodega Central Providencia, Armario DMX',
    valueCLP: 2100000
  },
  {
    id: 'inv-05',
    code: 'ATH-ESC-01',
    name: 'Piso Linóleo Reversible Danza Negro/Gris (6 Rollos de 2x15m = 180m²)',
    category: 'Estructura / Escenario',
    condition: 'Operativo',
    status: 'En bodega central',
    location: 'Bodega Central Providencia, Tarima 01',
    valueCLP: 2900000
  },
  {
    id: 'inv-06',
    code: 'ATH-VID-01',
    name: 'Proyector Láser Optoma ZU820T 8800 Lúmenes WUXGA con Lente Corto',
    category: 'Video / Proyección',
    condition: 'Excelente',
    status: 'Disponible',
    location: 'Bodega Central Providencia, Sala Climatizada',
    valueCLP: 5500000
  },
  {
    id: 'inv-07',
    code: 'ATH-AUD-03',
    name: 'Set de 4 Monitores In-Ear Shure PSM300 con Auriculares SE215',
    category: 'Audio / Backline',
    condition: 'En mantención',
    status: 'En bodega central',
    location: 'Servicio Técnico Providencia (Reemplazo antena receptor 2)',
    valueCLP: 1800000
  },
  {
    id: 'inv-08',
    code: 'ATH-CAB-01',
    name: 'Manguera Multipar Digital Cat6 Ethercon Neutrik 70m con Carretel de Acero',
    category: 'Cables & DMX',
    condition: 'Excelente',
    status: 'Disponible',
    location: 'Bodega Central Providencia, Carrete 03',
    valueCLP: 650000
  }
];

// 7. RENDICIONES Y FINANZAS POR PROYECTO
export const INITIAL_FINANCES: FinanceRecord[] = [
  {
    id: 'fin-01',
    projectId: 'obra-01',
    projectName: 'La Memoria de las Aguas',
    type: 'Gasto',
    category: 'Honorarios',
    amountCLP: 1800000,
    date: '28/02/2025',
    status: 'Aprobado',
    invoiceRef: 'BHE-4491 (Elenco de Danza Febrero)',
    responsible: 'Jo Schultz'
  },
  {
    id: 'fin-02',
    projectId: 'obra-01',
    projectName: 'La Memoria de las Aguas',
    type: 'Gasto',
    category: 'Traslados/Viáticos',
    amountCLP: 520000,
    date: '02/03/2025',
    status: 'Rendido',
    invoiceRef: 'Factura E-9921 (Arriendo Minibús Santiago-Concepción)',
    responsible: 'Francisco Pérez'
  },
  {
    id: 'fin-03',
    projectId: 'obra-03',
    projectName: 'Los Nadies del Salitre',
    type: 'Ingreso',
    category: 'Honorarios',
    amountCLP: 4500000,
    date: '15/02/2025',
    status: 'Aprobado',
    invoiceRef: 'Factura ATHA #102 a Corporación M100',
    responsible: 'Francisco Pérez'
  },
  {
    id: 'fin-04',
    projectId: 'rd-01',
    projectName: 'ATHAMU: Plataforma Sonoro-Escénica',
    type: 'Gasto',
    category: 'Técnica & Arriendo',
    amountCLP: 840000,
    date: '20/02/2025',
    status: 'Rendido',
    invoiceRef: 'Factura 1109 (Placas Arduino, Sensores IMU y microcontroladores)',
    responsible: 'Nicolás Ortiz'
  },
  {
    id: 'fin-05',
    projectId: 'obra-05',
    projectName: 'Volcánica: Rituales del Fuego',
    type: 'Gasto',
    category: 'Escenografía & Vestuario',
    amountCLP: 630000,
    date: '25/02/2025',
    status: 'Pendiente',
    invoiceRef: 'Boleta de compra insumos textileros y carbón vegetal certificado',
    responsible: 'Antonia Fernández'
  },
  {
    id: 'fin-06',
    projectId: 'obra-02',
    projectName: 'Cordillera Eléctrica',
    type: 'Ingreso',
    category: 'Difusión & Prensa',
    amountCLP: 2900000,
    date: '01/03/2025',
    status: 'Aprobado',
    invoiceRef: 'Transferencia Fondo de la Música (Convenio 2024)',
    responsible: 'Nicolás Ortiz'
  }
];

// 8. DIARIO DE PROCESO (Bitácora creativa por obra)
export const INITIAL_CREATIVE_LOGS: CreativeLog[] = [
  {
    id: 'log-01',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    date: '03 de Marzo 2025',
    author: 'Jo Schultz',
    phase: 'Ensayo general',
    title: 'Ajuste de tempo en el tercer cuadro de rogativa',
    entry: 'Durante la pasada técnica con el piso linóleo húmedo notamos que la transición hacia el suelo de las tres bailarinas requería 12 compases adicionales para evitar resbalones y permitir que la reverberación del chelo de Nicolás se extinga de manera orgánica. Se fijó la marcación con cinta blanca fluorescente en los laterales.',
    tags: ['Coreografía', 'Seguridad', 'Sonido en vivo']
  },
  {
    id: 'log-02',
    obraId: 'obra-03',
    obraTitle: 'Los Nadies del Salitre',
    date: '24 de Febrero 2025',
    author: 'Francisco Pérez',
    phase: 'Dramaturgia / Partitura',
    title: 'Incorporación del monólogo de la cantora obrera',
    entry: 'Revisamos con Daniela Lhorente el poema rescatado de los diarios anarquistas de Tarapacá de 1907. Decidimos que no se musicalizará con guitarras sino que se dirá a capella con el solo murmullo de un fuelle de forja accionado por los otros actores desde la penumbra.',
    tags: ['Dramaturgia', 'Voz', 'Atmósfera']
  },
  {
    id: 'log-03',
    obraId: 'obra-07',
    obraTitle: 'Antígona en el Desierto',
    date: '18 de Febrero 2025',
    author: 'Antonia Fernández',
    phase: 'Puesta técnica',
    title: 'Pruebas de temperatura de color al atardecer en terreno',
    entry: 'Viajamos a Baquedano con Nicolás para medir la curva lumínica entre las 19:45 y las 20:30 hrs. El contraste cromático con los cerros ocres demanda luminarias cálidas de 2700K para que los rostros no se tornen cenicientos ante la cámara documental. Aprobamos el set autónomo de baterías LiFePO4.',
    tags: ['Iluminación', 'Terreno', 'Atacama']
  },
  {
    id: 'log-04',
    obraId: 'rd-01',
    obraTitle: 'ATHAMU: I+D Sonoro',
    date: '01 de Marzo 2025',
    author: 'Nicolás Ortiz',
    phase: 'Concepto',
    title: 'Reducción de latencia del sensor de muñeca a 8 milisegundos',
    entry: 'Logramos compilar el protocolo WiFi UDP directo a Max/MSP sin pasar por el router comercial. La bailarina siente que la resonancia del bombo responde a la inercia instantánea de su brazo, logrando la sensación de un instrumento invisible adherido a la piel.',
    tags: ['I+D', 'Sensores', 'Max/MSP']
  }
];

// 9. RIDERS TÉCNICOS ESTÁNDAR REUTILIZABLES
export const INITIAL_STANDARD_RIDERS: StandardRider[] = [
  {
    id: 'rider-01',
    title: 'Rider Técnico ATHA - Danza Contemporánea (Sala Estándar)',
    category: 'Danza & Teatro Físico',
    version: 'v3.2 (2025)',
    description: 'Ficha técnica homologada para las producciones coreográficas de ATHA. Diseñada para garantizar la seguridad articular de los bailarines y un ambiente lumínico de alta fidelidad.',
    keySpecs: [
      'Piso: Cámara negra a la italiana con linóleo de danza homologado (Harlequin o Rosco) sin clavos ni desniveles.',
      'Dimensiones mínimas: Boca 10m x Fondo 9m x Altura libre 6.5m.',
      'Sonido: PA estéreo de alta gama (L-Acoustics, d&b o Meyer), 4 monitores de piso coaxiales en líneas independientes.',
      'Iluminación: Parrilla DMX con 24 circuitos independientes, 12 fresneles 1kW, 8 recortes 36° y 4 varas LED wash.',
      'Camarines: Climatizados con duchas con agua caliente, percheros y espejo con luz neutra para mínimo 6 personas.',
      'Tiempo de montaje: 6 horas previas al primer ensayo general.'
    ],
    pdfFileTitle: 'RIDER_ATHA_DANZA_ESTANDAR_2025.pdf',
    technicalDirector: 'Antonia Fernández (antonia@athaproducciones.cl)'
  },
  {
    id: 'rider-02',
    title: 'Rider Técnico ATHA - Concierto Electroacústico & Cámara',
    category: 'Música en Vivo',
    version: 'v2.8 (2025)',
    description: 'Optimizado para ensambles acústicos que integran electrónica en vivo, requiriendo bajo piso de ruido, alimentación eléctrica estabilizada y monitoreo in-ear.',
    keySpecs: [
      'Mesa FOH: Consola digital Midas M32, Behringer Wing o Allen&Heath SQ con mínimo 24 canales y 8 envíos auxiliares.',
      'Monitoreo: 4 envíos estéreo para transmisores In-Ear personales + 2 monitores de piso para percusión.',
      'Microfonía: 4 micrófonos de instrumento DPA 4099 con clips para cuerdas, 2 Neumann KM184, 4 cajas directas activas Radial J48.',
      'Electricidad: Línea de 220V dedicada con tierra de protección independiente para instrumentos análogos.',
      'Tarima: 4 tarimas de 2x1m alfombradas a 40cm de altura para cuerdas y percusión.',
      'Prueba de sonido: Mínimo 90 minutos con sala cerrada y climatizada.'
    ],
    pdfFileTitle: 'RIDER_ATHA_MUSICA_CAMARA_2025.pdf',
    technicalDirector: 'Nicolás Ortiz (nicolas@athaproducciones.cl)'
  },
  {
    id: 'rider-03',
    title: 'Rider Técnico ATHA - Teatro de Gran Formato & Giras',
    category: 'Teatro',
    version: 'v4.0 (2025)',
    description: 'Especificación para montajes con escenografía de volumen y elenco coral de más de 6 actores.',
    keySpecs: [
      'Espacio escénico: Mínimo 12m de ancho por 10m de profundidad libre de patas y aforos.',
      'Maquinaria: Mínimo 4 varas de tramoya contrapesadas o motorizadas con capacidad mínima de carga de 250 kg cada una.',
      'Audio inalámbrico: 6 a 8 diademas color carne micro-omnidireccionales con gestión de frecuencias libre de interferencias.',
      'Luces: Consola GrandMA o Chamsys con protocolo sACN/ArtNet, 16 focos LED RGBW y 12 luminarias halógenas de recorte.',
      'Personal de sala requerido: 1 maquinista jefe de escenario, 1 luminotécnico de sala, 1 operador de audio residente.'
    ],
    pdfFileTitle: 'RIDER_ATHA_TEATRO_GRAN_FORMATO_2025.pdf',
    technicalDirector: 'Antonia Fernández (antonia@athaproducciones.cl)'
  }
];

// 10. PLANIFICACIÓN Y CALENDARIO DE ENSAYOS Y FUNCIONES
export const INITIAL_SCHEDULE: EventSchedule[] = [
  {
    id: 'evt-01',
    title: 'Ensayo General con Pasada de Luces',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    type: 'Ensayo',
    date: '2025-03-10',
    timeStart: '10:00',
    timeEnd: '14:30',
    venue: 'Centro GAM - Sala A1',
    castCount: 5,
    status: 'Confirmado'
  },
  {
    id: 'evt-02',
    title: 'Montaje de Parrilla DMX & Ajuste de Varás',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    type: 'Montaje técnico',
    date: '2025-03-09',
    timeStart: '08:30',
    timeEnd: '17:00',
    venue: 'Centro GAM - Sala A1',
    castCount: 2,
    status: 'Confirmado'
  },
  {
    id: 'evt-03',
    title: 'Ensayo Italiano y Coreográfico',
    obraId: 'obra-03',
    obraTitle: 'Los Nadies del Salitre',
    type: 'Ensayo',
    date: '2025-03-11',
    timeStart: '15:00',
    timeEnd: '19:00',
    venue: 'Bodega Central Providencia (Sala Ensayos)',
    castCount: 6,
    status: 'Confirmado'
  },
  {
    id: 'evt-04',
    title: 'Función Estreno Temporada 2025',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    type: 'Función / Estreno',
    date: '2025-03-12',
    timeStart: '20:00',
    timeEnd: '21:30',
    venue: 'Centro GAM - Sala A1',
    castCount: 6,
    status: 'Confirmado'
  },
  {
    id: 'evt-05',
    title: 'Prueba Acústica y Grabación Tiny Patio #04',
    obraId: 'rd-02',
    obraTitle: 'Tiny Patio Concerts',
    type: 'Ensayo',
    date: '2025-03-14',
    timeStart: '16:00',
    timeEnd: '21:00',
    venue: 'Azotea Patrimonial Barrio Concha y Toro',
    castCount: 4,
    status: 'Pendiente'
  },
  {
    id: 'evt-06',
    title: 'Reunión de Coordinación Técnica Gira Sur',
    obraId: 'obra-01',
    obraTitle: 'La Memoria de las Aguas',
    type: 'Reunión de producción',
    date: '2025-03-15',
    timeStart: '11:00',
    timeEnd: '13:00',
    venue: 'Oficina Central ATHA (Zoom / Presencial)',
    castCount: 4,
    status: 'Confirmado'
  }
];

// 11. DISPONIBILIDAD DE ARTISTAS (Para la Calculadora de Estrenos & Vista de Artista)
export const INITIAL_ARTISTS_AVAILABILITY: ArtistAvailability[] = [
  {
    id: 'art-01',
    artistName: 'Catalina Valenzuela',
    role: 'Bailarina Principal (Danza Contemporánea)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    timeSlots: {
      lunes: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      martes: ['Mañana (09:00 - 13:00)'],
      miercoles: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      jueves: ['Tarde (14:30 - 18:30)'],
      viernes: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      sabado: ['Mañana (10:00 - 14:00)']
    },
    notes: 'Los martes en la tarde imparte docencia en el Departamento de Danza U. Chile.'
  },
  {
    id: 'art-02',
    artistName: 'Ignacio Araya',
    role: 'Intérprete Escénico & Acróbata',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    timeSlots: {
      lunes: ['Tarde (14:30 - 18:30)'],
      martes: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      miercoles: ['Tarde (14:30 - 18:30)'],
      jueves: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      viernes: ['Tarde (14:30 - 18:30)'],
      sabado: ['Mañana (10:00 - 14:00)']
    },
    notes: 'Disponible preferentemente jornadas de tarde. Reside en Providencia.'
  },
  {
    id: 'art-03',
    artistName: 'Daniela Lhorente',
    role: 'Actriz Protagónica',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
    timeSlots: {
      lunes: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      martes: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      miercoles: ['Mañana (09:00 - 13:00)'],
      jueves: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      viernes: ['Mañana (09:00 - 13:00)'],
      sabado: []
    },
    notes: 'Bloqueo de sábados por rodaje audiovisual los fines de semana.'
  },
  {
    id: 'art-04',
    artistName: 'Rodrigo Soto',
    role: 'Actor & Dramaturgo',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
    timeSlots: {
      lunes: ['Tarde (14:30 - 18:30)'],
      martes: ['Tarde (14:30 - 18:30)'],
      miercoles: ['Tarde (14:30 - 18:30)'],
      jueves: ['Tarde (14:30 - 18:30)'],
      viernes: ['Mañana (09:00 - 13:00)', 'Tarde (14:30 - 18:30)'],
      sabado: ['Mañana (10:00 - 14:00)']
    },
    notes: 'Mañanas de Lunes a Jueves dedicadas a dirección de tesis.'
  }
];

// 12. HISTORIA Y MISIÓN DE F.A.S.E PRODUCCIONES
export const FASE_ABOUT_INFO = {
  name: 'F.A.S.E',
  legalName: 'F.A.S.E Producciones & Gestión Escénica SpA',
  rut: '77.892.410-K',
  founded: 'Valparaíso / Santiago, 2018',
  tagline: 'Creación, producción técnica, articulación escénica y circulación de artes vivas',
  mission: 'Diseñar, articular y hacer circular obras de teatro, danza, música e interdisciplina con alto estándar estético y técnico en Chile y el mundo, estructurando el ciclo productivo en fases claras: Creación, Producción, Circulación y Rendición.',
  vision: 'Consolidar F.A.S.E como la plataforma y productora referente en profesionalización, innovación tecnológica y sostenibilidad para las artes escénicas de Chile e Iberoamérica.',
  values: [
    'Rigor Técnico y Seguridad Escénica',
    'Investigación Creativa y Riesgo Artístico',
    'Descentralización Territorial Activa',
    'Condiciones Laborales Dignas y Transparentes',
    'Sostenibilidad y Circulación Inteligente'
  ],
  stats: {
    totalObras: 9,
    funcionesRealizadas: 142,
    espectadoresHistoricos: 58400,
    regionesVisitadas: 11,
    premiosNacionales: 5
  },
  contact: {
    address: 'Av. Providencia 1208, Of. 402, Santiago / Espacio Taller Cerro Alegre, Valparaíso',
    email: 'contacto@plataformafase.cl',
    phone: '+56 2 2840 9100',
    web: 'www.plataformafase.cl'
  }
};

// Aliases for convenient imports
export const initialObras = INITIAL_OBRAS;
export const initialTeam = INITIAL_TEAM;
export const initialRDProjects = INITIAL_RD_PROJECTS;
export const initialLeads = INITIAL_LEADS;
export const initialVenues = INITIAL_VENUES;
export const initialInventory = INITIAL_INVENTORY;
export const initialFinances = INITIAL_FINANCES;
export const initialProcessLogs = INITIAL_CREATIVE_LOGS;
export const initialRiders = INITIAL_STANDARD_RIDERS;
export const initialEvents = INITIAL_SCHEDULE;
export const initialArtists = INITIAL_ARTISTS_AVAILABILITY;
export const initialAboutInfo = FASE_ABOUT_INFO;

export const defaultUserProfile = {
  id: 'user-01',
  name: 'Francisco Pérez',
  email: 'francisco@athaproducciones.cl',
  role: 'Director General & Productor Ejecutivo',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  provider: 'google' as const
};

export const initialReminders = [
  {
    id: 'rem-1',
    title: 'Ensayo General Mañana',
    message: 'Pasada técnica completa en GAM Sala A1 a las 10:00 hrs.',
    type: 'ensayo',
    date: '2025-03-16',
    read: false
  },
  {
    id: 'rem-2',
    title: 'Rendición FONDART Línea Circulación',
    message: 'Vence plazo de carga de boletas de honorarios en plataforma MINCAP.',
    type: 'finanzas',
    date: '2025-03-22',
    read: false
  }
];

