<?php
/**
 * Seeder de datos iniciales para SQLite (/tmp/atha_crm.db)
 * Sincroniza el catálogo cultural F.A.S.E / ATHA Producciones
 */

$db = new PDO('sqlite:/tmp/atha_crm.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Asegurar esquema
$schema = file_get_contents(__DIR__ . '/schema_sqlite.sql');
$db->exec($schema);

$adminUser = 'usr_fase_1';

// 1. Projects (Obras e I+D)
$projectsCount = (int)$db->query("SELECT COUNT(*) FROM projects")->fetchColumn();
if ($projectsCount === 0) {
    $stmt = $db->prepare("INSERT INTO projects (
        id, owner_id, title, description, status, budget_range, year, category,
        image_url, location, is_public, kind, discipline, format, duration,
        target_audience, premiere_date, dossier_highlights, notes, progress, phase,
        team_lead, spent_clp, fee_clp, ticket_split_clp, production_cost_clp
    ) VALUES (
        :id, :owner_id, :title, :description, :status, :budget_range, :year, :category,
        :image_url, :location, :is_public, :kind, :discipline, :format, :duration,
        :target_audience, :premiere_date, :dossier_highlights, :notes, :progress, :phase,
        :team_lead, :spent_clp, :fee_clp, :ticket_split_clp, :production_cost_clp
    )");

    $obras = [
        [
            'id' => 'obra-01',
            'owner_id' => $adminUser,
            'title' => 'La Memoria de las Aguas',
            'description' => 'Pieza coreográfica contemporánea que investiga la relación entre la sequía en la cuenca del Río Aconcagua, el cuerpo femenino y los rituales ancestrales de rogativa de lluvia en la zona central de Chile.',
            'status' => 'En gira',
            'budget_range' => '$8.000.000 - $12.000.000 CLP',
            'year' => 2024,
            'category' => 'danza',
            'image_url' => 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
            'location' => 'Santiago / Valparaíso / Biobío',
            'is_public' => 1,
            'kind' => 'obra',
            'discipline' => 'Danza',
            'format' => 'Caja Negra / Sala Principal',
            'duration' => '65 min',
            'target_audience' => '+14 años',
            'premiere_date' => '12 de Octubre 2024 (Teatro Biobío)',
            'dossier_highlights' => 'Premio Círculo de Críticos de Arte de Chile (Mención Danza); Seleccionada Festival Stgo a Mil 2025; Elenco de 5 intérpretes + música en vivo',
            'notes' => 'Disponible para giras nacionales e internacionales. Adaptable a espacios patrimoniales.',
            'progress' => 100,
            'phase' => 'Distribución y Gira',
            'team_lead' => 'Jo Schultz',
            'spent_clp' => 8900000,
            'fee_clp' => 3800000,
            'ticket_split_clp' => 5200000,
            'production_cost_clp' => 8900000
        ],
        [
            'id' => 'obra-02',
            'owner_id' => $adminUser,
            'title' => 'Canto a la Cordillera Invisible',
            'description' => 'Concierto escénico inmersivo con sintetizadores análogos, aerófonos andinos procesados en tiempo real y mapping reactivo sobre textiles de telar mapuche y atacameño.',
            'status' => 'En gira',
            'budget_range' => '$5.000.000 - $9.000.000 CLP',
            'year' => 2023,
            'category' => 'musica',
            'image_url' => 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
            'location' => 'Santiago / Antofagasta',
            'is_public' => 1,
            'kind' => 'obra',
            'discipline' => 'Música & Nuevos Medios',
            'format' => 'Concierto Inmersivo 4.1 / Escenario 360°',
            'duration' => '55 min',
            'target_audience' => 'Todo espectador',
            'premiere_date' => '22 de Marzo 2024 (GAM)',
            'dossier_highlights' => 'Sonido cuadrafónico 4.1 reactivo; Mapping generativo en TouchDesigner; 4 músicos multiinstrumentistas en escena',
            'notes' => 'Requiere sistema de amplificación multi-canal. Rider técnico de alta fidelidad.',
            'progress' => 100,
            'phase' => 'Distribución',
            'team_lead' => 'Nicolás Ortiz',
            'spent_clp' => 6400000,
            'fee_clp' => 3200000,
            'ticket_split_clp' => 4500000,
            'production_cost_clp' => 6400000
        ],
        [
            'id' => 'obra-03',
            'owner_id' => $adminUser,
            'title' => 'Bitácora del Desarraigo',
            'description' => 'Tragicomedia documental basada en cartas reales de familias migrantes en puertos del norte de Chile (Iquique, Tocopilla y Valparaíso) entre 1920 y 2022.',
            'status' => 'Temporada',
            'budget_range' => '$10.000.000 - $14.000.000 CLP',
            'year' => 2024,
            'category' => 'teatro',
            'image_url' => 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
            'location' => 'Valparaíso / Santiago',
            'is_public' => 1,
            'kind' => 'obra',
            'discipline' => 'Teatro Documental',
            'format' => 'Teatro a la Italiana / Escenario Frontal',
            'duration' => '80 min',
            'target_audience' => '+12 años',
            'premiere_date' => '5 de Mayo 2024 (Parque Cultural de Valparaíso)',
            'dossier_highlights' => 'Coproducción Fondart Trayectoria 2023; 6 actores con banda sonora ejecutada en vivo; Escenografía modular metálica',
            'notes' => 'Temporada confirmada en Matucana 100 para Noviembre.',
            'progress' => 95,
            'phase' => 'Temporada Activa',
            'team_lead' => 'Francisco Pérez',
            'spent_clp' => 11200000,
            'fee_clp' => 4200000,
            'ticket_split_clp' => 6800000,
            'production_cost_clp' => 11200000
        ],
        [
            'id' => 'obra-04',
            'owner_id' => $adminUser,
            'title' => 'Frecuencias del Viento Sur',
            'description' => 'Instalación coreográfica para espacios abiertos y plazas públicas, con estructuras neumáticas sonoras activadas por el viento patagónico y bailarines.',
            'status' => 'En creación',
            'budget_range' => '$7.000.000 CLP',
            'year' => 2025,
            'category' => 'interdisciplinar',
            'image_url' => 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80',
            'location' => 'Punta Arenas / Coyhaique',
            'is_public' => 1,
            'kind' => 'obra',
            'discipline' => 'Interdisciplinar / Espacio Público',
            'format' => 'Sitio Específico / Aire Libre',
            'duration' => '45 min',
            'target_audience' => 'Familiar / Todo público',
            'premiere_date' => 'Enero 2025 (Cielos del Infinito)',
            'dossier_highlights' => 'Estructuras inflables con captación de viento; Participación ciudadana abierta en el diseño sonoro',
            'notes' => 'En etapa de residencia técnica en Magallanes.',
            'progress' => 60,
            'phase' => 'Residencia de Creación',
            'team_lead' => 'Jo Schultz',
            'spent_clp' => 4200000,
            'fee_clp' => 2800000,
            'ticket_split_clp' => 0,
            'production_cost_clp' => 7000000
        ]
    ];

    foreach ($obras as $o) {
        $stmt->execute($o);
    }
}

// 2. Leads (Salas, Festivales, Programadores)
$leadsCount = (int)$db->query("SELECT COUNT(*) FROM leads")->fetchColumn();
if ($leadsCount === 0) {
    $stmt = $db->prepare("INSERT INTO leads (
        id, owner_id, name, organization, email, phone, source, kind, status, score, value, notes, last_contact_at
    ) VALUES (
        :id, :owner_id, :name, :organization, :email, :phone, :source, :kind, :status, :score, :value, :notes, :last_contact_at
    )");

    $leads = [
        [
            'id' => 'lead-01',
            'owner_id' => $adminUser,
            'name' => 'Marcela Trujillo',
            'organization' => 'Teatro Biobío (Concepción)',
            'email' => 'programacion@teatrobiobio.cl',
            'phone' => '+56 41 262 5500',
            'source' => 'Festival CHEC 2024',
            'kind' => 'sala',
            'status' => 'negotiating',
            'score' => '94%',
            'value' => '$7.600.000 CLP (2 funciones)',
            'notes' => 'Interés confirmado en La Memoria de las Aguas para temporada de primavera. Enviar rider técnico actualizado.',
            'last_contact_at' => date('Y-m-d H:i:s', strtotime('-2 days'))
        ],
        [
            'id' => 'lead-02',
            'owner_id' => $adminUser,
            'name' => 'Rodrigo Canales',
            'organization' => 'Fundación Teatro a Mil',
            'email' => 'programacion.nacional@teatroamil.cl',
            'phone' => '+56 2 2482 9300',
            'source' => 'Invitación directa curaduría',
            'kind' => 'festival',
            'status' => 'won',
            'score' => '98%',
            'value' => '$11.400.000 CLP (Gira 3 regiones)',
            'notes' => 'Contrato firmado para Santiago a Mil 2025. Funciones en GAM y extensión a San Antonio.',
            'last_contact_at' => date('Y-m-d H:i:s', strtotime('-5 days'))
        ],
        [
            'id' => 'lead-03',
            'owner_id' => $adminUser,
            'name' => 'Elena Solar',
            'organization' => 'Parque Cultural de Valparaíso (PCDV)',
            'email' => 'artes.escenicas@pcdv.cl',
            'phone' => '+56 32 265 9500',
            'source' => 'Mesa de Red de Salas',
            'kind' => 'sala',
            'status' => 'qualified',
            'score' => '88%',
            'value' => '$4.200.000 CLP',
            'notes' => 'Propuesta presentada para Bitácora del Desarraigo en Teatro del Parque. Visita técnica realizada.',
            'last_contact_at' => date('Y-m-d H:i:s', strtotime('-1 week'))
        ],
        [
            'id' => 'lead-04',
            'owner_id' => $adminUser,
            'name' => 'Gonzalo Moraga',
            'organization' => 'Teatro Municipal de Antofagasta',
            'email' => 'cultura@antofagastacultura.cl',
            'phone' => '+56 55 289 2870',
            'source' => 'Catálogo Digital ATHA',
            'kind' => 'sala',
            'status' => 'new',
            'score' => '76%',
            'value' => '$3.800.000 CLP',
            'notes' => 'Solicitud de dossier técnico para Canto a la Cordillera Invisible.',
            'last_contact_at' => date('Y-m-d H:i:s', strtotime('-3 days'))
        ]
    ];

    foreach ($leads as $l) {
        $stmt->execute($l);
    }
}

// 3. Venues (Salas y Teatros de Chile)
$venuesCount = (int)$db->query("SELECT COUNT(*) FROM venues")->fetchColumn();
if ($venuesCount === 0) {
    $stmt = $db->prepare("INSERT INTO venues (
        id, name, city, region, capacity, stage_type, contact_person, contact_email, contact_phone, status, specs, lat, lng
    ) VALUES (
        :id, :name, :city, :region, :capacity, :stage_type, :contact_person, :contact_email, :contact_phone, :status, :specs, :lat, :lng
    )");

    $venues = [
        [
            'id' => 'ven-01',
            'name' => 'Teatro Biobío (Sala Principal)',
            'city' => 'Concepción',
            'region' => 'Región del Biobío',
            'capacity' => 1200,
            'stage_type' => 'Proscenio Italiano (Boca 16m x 12m profundidad)',
            'contact_person' => 'Carlos Henríquez (Director Técnico)',
            'contact_email' => 'tecnica@teatrobiobio.cl',
            'contact_phone' => '+56 41 262 5520',
            'status' => 'Activo / Convenio',
            'specs' => 'Sonido d&b audiotechnik KSL, Consola DiGiCo SD12, Iluminación GrandMA3 full-size, 32 barras contrapesadas motorizadas.',
            'lat' => -36.8347,
            'lng' => -73.0645
        ],
        [
            'id' => 'ven-02',
            'name' => 'Centro Cultural Gabriela Mistral (GAM - Sala A1)',
            'city' => 'Santiago',
            'region' => 'Región Metropolitana',
            'capacity' => 280,
            'stage_type' => 'Caja Negra Modular Multiformato',
            'contact_person' => 'Loreto Vivanco',
            'contact_email' => 'espacios@gam.cl',
            'contact_phone' => '+56 2 2566 5500',
            'status' => 'Activo / Convenio',
            'specs' => 'Piso linóleo Harlequin reversible, Parrilla DMX completa con focos LED ETC y robóticas Robe Robin DL4S.',
            'lat' => -33.4398,
            'lng' => -70.6403
        ],
        [
            'id' => 'ven-03',
            'name' => 'Parque Cultural de Valparaíso (Teatro del Parque)',
            'city' => 'Valparaíso',
            'region' => 'Región de Valparaíso',
            'capacity' => 307,
            'stage_type' => 'Frontal con foso desmontable',
            'contact_person' => 'Ignacio Pavez',
            'contact_email' => 'tecnica@pcdv.cl',
            'contact_phone' => '+56 32 265 9530',
            'status' => 'Activo / Convenio',
            'specs' => 'Consola Yamaha CL5, microfonía inalámbrica Shure Axient Digital, proyector láser Christie 14.000 lumens.',
            'lat' => -33.0472,
            'lng' => -71.6297
        ],
        [
            'id' => 'ven-04',
            'name' => 'Teatro Municipal de Antofagasta',
            'city' => 'Antofagasta',
            'region' => 'Región de Antofagasta',
            'capacity' => 850,
            'stage_type' => 'Italiano con concha acústica móvil',
            'contact_person' => 'Mario Valenzuela',
            'contact_email' => 'mvalenzuela@antofagastacultura.cl',
            'contact_phone' => '+56 55 289 2872',
            'status' => 'En negociación',
            'specs' => 'Boca de 14m x 10m de fondo. Sistema de sonido JBL VTX A8, parrilla convencional Strand Lighting.',
            'lat' => -23.6509,
            'lng' => -70.3975
        ]
    ];

    foreach ($venues as $v) {
        $stmt->execute($v);
    }
}

// 4. Inventory Items
$invCount = (int)$db->query("SELECT COUNT(*) FROM inventory_items")->fetchColumn();
if ($invCount === 0) {
    $stmt = $db->prepare("INSERT INTO inventory_items (
        id, code, name, category, condition, status, assigned_to_work, location, value_clp
    ) VALUES (
        :id, :code, :name, :category, :condition, :status, :assigned_to_work, :location, :value_clp
    )");

    $items = [
        [
            'id' => 'inv-01',
            'code' => 'SND-APOLLO-01',
            'name' => 'Interfaz de Audio Universal Audio Apollo x8 Heritage Edition',
            'category' => 'Sonido',
            'condition' => 'Excelente',
            'status' => 'En gira',
            'assigned_to_work' => 'La Memoria de las Aguas',
            'location' => 'Rack de Gira 01 (Bodega Matucana)',
            'value_clp' => 2890000
        ],
        [
            'id' => 'inv-02',
            'code' => 'LGT-DMX-CHAUVET-04',
            'name' => 'Pack 4 Barras LED Chauvet Professional COLORado Batten Q15',
            'category' => 'Iluminación',
            'condition' => 'Operativo',
            'status' => 'Disponible',
            'assigned_to_work' => 'Stock general',
            'location' => 'Bodega Central ATHA (Valparaíso)',
            'value_clp' => 3400000
        ],
        [
            'id' => 'inv-03',
            'code' => 'VID-PANASONIC-4K',
            'name' => 'Proyector Panasonic PT-MZ16KL Láser 3LCD 16.000 lúmenes',
            'category' => 'Video & Proyección',
            'condition' => 'Excelente',
            'status' => 'En mantención',
            'assigned_to_work' => 'Canto a la Cordillera Invisible',
            'location' => 'Taller Técnico Santiago',
            'value_clp' => 12500000
        ]
    ];

    foreach ($items as $it) {
        $stmt->execute($it);
    }
}

echo "SQLite /tmp/atha_crm.db sincronizado y poblado con éxito.\n";
