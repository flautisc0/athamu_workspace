-- ═══════════════════════════════════════════════════════════════════
-- ATHA CRM — Script de importación de datos del catálogo/planificador
-- Versión: draft (no ejecutar hasta que el bot de Google Auth termine)
-- Fuentes: proyectos.json, 00_Miembros.csv, 03_Gestión_de_Artistas.csv,
--           04_Catálogos.csv, 05_Producción_Ejecución.csv, 06_Comunicación_Marketing.csv
-- Nota: NO toca tabla users (Google Auth pendiente) — deja owner_id como UUID null-safe
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: projects (obras/proyectos del catálogo)
-- Fuente: proyectos.json (11 proyectos)
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO projects (id, owner_id, title, description, status, budget_range, created_at, is_public, year, category, image_url, location) VALUES
-- proyecto_id = UUID generado, owner_id se asigna después (pendiente Google Auth)
('proj_001', NULL, 'Todo acuerdo escrito es una mentira', 'Distopía chilena situada en el año 2079, donde la ciudadanía se organiza para derrocar un régimen neoliberal.', 'open', NULL, '2026-09-12 10:54:12', 1, 2024, 'teatro', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80', 'Compañía Proyecto TAEM'),
('proj_002', NULL, 'Tiny Patio Concerts', 'Ciclo de conciertos acústicos e íntimos realizados en patios patrimoniales y espacios culturales no convencionales.', 'open', NULL, '2026-09-12 10:54:12', 1, 2024, 'musica', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80', 'ATHA Producciones / AD BACULUM'),
('proj_003', NULL, 'AD BACULUM: Fricción Sonora', 'Exploración sonora vanguardista a través del uso de sintetizadores modulares, ruido analógico y percusión procesada.', 'open', NULL, '2026-09-12 10:54:12', 0, 2023, 'musica', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80', 'AD BACULUM'),
('proj_004', NULL, 'Proyecto TAEM: Laboratorio', 'Espacio de indagación escénica colectiva sobre lenguaje corporal y palabra poética.', 'open', NULL, '2026-09-12 10:54:12', 0, 2023, 'teatro', 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=800&q=80', 'Colectivo TAEM'),
('proj_005', NULL, 'Ciclo de Artes Escénicas USACH', 'Plataforma de articulación e intermediación cultural que vincula compañías emergentes.', 'open', NULL, '2026-09-12 10:54:12', 1, 2024, 'gestion', 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&q=80', 'ATHA Producciones / USACH Innovo'),
('proj_006', NULL, 'Memorias en Tránsito', 'Pieza coreográfica itinerante sobre memoria comunitaria y plazas cívicas.', 'open', NULL, '2026-09-12 10:54:12', 0, 2023, 'danza', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80', 'Compañía Transeúnte / ATHA'),
('proj_007', NULL, 'Cartelera Comunal Rancagua 2024', 'Curaduría y programación estratégica de obras de teatro y música para salas barriales.', 'open', NULL, '2026-09-12 10:54:12', 0, 2024, 'gestion', 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800&q=80', 'ATHA Producciones / Corporación Cultural'),
('proj_008', NULL, 'Voces del Silencio', 'Dramaturgia testimonial construida a partir de cartas y audios de mujeres de la periferia.', 'open', NULL, '2026-09-12 10:54:12', 0, 2022, 'teatro', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80', 'Proyecto TAEM'),
('proj_009', NULL, 'Sesiones ATHA: Registro & Escena', 'Ciclo audiovisual que documenta procesos creativos tras bambalinas de agrupaciones independientes.', 'open', NULL, '2026-09-12 10:54:12', 1, 2024, 'audiovisual', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80', 'ATHA Audiovisual'),
('proj_010', NULL, 'Cuerpo y Resistencia', 'Investigación sobre estados de resistencia fisiológica y emocional del cuerpo.', 'open', NULL, '2026-09-12 10:54:12', 0, 2023, 'danza', 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80', 'Colectivo de Danza ATHA'),
('proj_011', NULL, 'Plataforma Digital de Circulación ATHA', 'Sistema digital integral para sistematizar gestión, cotización y contratación.', 'open', NULL, '2026-09-12 10:54:12', 1, 2024, 'gestion', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80', 'ATHA Producciones / Equipo Técnico')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: project_members (directores, elenco, técnico por obra)
-- Fuente: proyectos.json (cast, direccion, compañía)
-- owner_id se debe actualizar cuando existan usuarios en table users
-- ──────────────────────────────────────────────────────────────────────

-- Para "Todo acuerdo escrito es una mentira" (proj_001)
-- Director: Jesús Urqueta / Francisco Pérez (se busca por email en users)
-- Cast: Josefa Schultz, Karla Meriño, Adrián Díaz
INSERT INTO project_members (id, project_id, user_id, role, display_name, title, is_active, joined_at, created_at) VALUES
-- Director 1
(uuid_generate_v4(), 'proj_001', (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'direction', 'Francisco Pérez', 'Director Artístico', 1, '2026-09-12', '2026-09-12'),
-- Cast
(uuid_generate_v4(), 'proj_001', NULL, 'cast', 'Josefa Schultz', NULL, 1, '2026-09-12', '2026-09-12'),
(uuid_generate_v4(), 'proj_001', NULL, 'cast', 'Karla Meriño', NULL, 1, '2026-09-12', '2026-09-12'),
(uuid_generate_v4(), 'proj_001', NULL, 'cast', 'Adrián Díaz', NULL, 1, '2026-09-12', '2026-09-12')
ON CONFLICT (project_id, display_name) DO NOTHING;

-- Repetir patrón para los demás proyectos — se genera dinámicamente por el bot de Google Auth:
-- Para cada proyecto, parsear el campo `elenco` y `direccion` → múltiples INSERT INTO project_members
-- con role='cast' para elenco, role='direction' para director, role='production' para producción
-- Los user_id se llenan cuando el bot de Google Auth asocie emails reales

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: events (calendario — ensayos, funciones, montajes)
-- Fuente: planner-data.json + 05_Producción_Ejecución.csv
-- Cada evento se genera a partir de:
--   - premiereDate → type='Función', date=premiereDate
--   - cada semana de ensayo → type='Ensayo', date=calculated
--   - eventos del CSV → type según categoría
-- ──────────────────────────────────────────────────────────────────────

-- Eventos de producción (del CSV 05)
INSERT INTO events (id, owner_id, title, obra_id, obra_title, type, date, time_start, time_end, venue, cast_count, status, notes, created_at) VALUES
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Evento Cultural X', NULL, NULL, 'Evento', '2026-08-15', '14:00:00', '18:00:00', 'Locación pendiente', NULL, 'pending', 'Producción - Estado: Por confirmar', '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Función Teatro Y', NULL, NULL, 'Función', '2026-09-01', '20:00:00', '22:00:00', 'Teatro Y', NULL, 'pending', 'Ensayo general 08/30', '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Gira Musical Z', NULL, NULL, 'Tour', '2026-10-01', '19:00:00', '22:00:00', 'Lugar TBD', NULL, 'pending', 'Presupuesto en revisión', '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Filmación Dossier ATHA', NULL, NULL, 'Producción', '2026-07-25', '07:00:00', '22:30:00', 'Estudio ATHA', NULL, 'confirmed', 'Cámara y equipo listos', '2026-09-12')
ON CONFLICT (title, date) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: rehearsals (ensayos generados por el planner)
-- Fuente: planner-data.json (premiereDate, rehearsalsPerWeek, requiredTotalRehearsals)
-- Script: generar N ensayos por proyecto, distribuidos semanalmente
-- El motor de cálculo está en criticalPath.ts (JS) — aquí se insertan los resultados
-- ──────────────────────────────────────────────────────────────────────

-- Ejemplo: proyecto proj_001 (Todo acuerdo escrito es una mentira)
-- 18 ensayos totales, 3/semana, estreno 2027-11-01
-- Los ensayos se generan retroactivamente desde el estreno:
INSERT INTO rehearsals (id, owner_id, title, kind, status, start_at, end_at, location, note, created_at) VALUES
-- Semana -1 (antes estreno)
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Ensayo proj_001 - Semana 1', 'Ensayo', 'scheduled', '2027-09-06 18:30:00', '2027-09-06 21:30:00', 'Teatro Nacional', NULL, '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Ensayo proj_001 - Semana 2', 'Ensayo', 'scheduled', '2027-09-08 18:30:00', '2027-09-08 21:30:00', 'Teatro Nacional', NULL, '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Ensayo proj_001 - Semana 3', 'Ensayo', 'scheduled', '2027-09-10 18:30:00', '2027-09-10 21:30:00', 'Teatro Nacional', NULL, '2026-09-12')
-- ... continuar con 15 más según criticalPath.ts
ON CONFLICT (title) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: cultural_places (POIs culturales) — datos de semilla
-- Fuente: init_db.py + CSV eventos
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO cultural_places (id, name, kind, address, lat, lng, hours, review, note, created_at) VALUES
(uuid_generate_v4(), 'Teatro Nacional', 'Teatro', 'Agustinas 655, Santiago', -33.4254, -70.6536, 'Lun-Dom 10:00-21:00', 'Espacio emblemático con programación diversa', 'Principal sede de temporada', '2026-09-12'),
(uuid_generate_v4(), 'Matucana 100', 'Centro Cultural', 'Av. Matucana 100, Santiago', -33.4386, -70.6697, 'Mar-Dom 10:00-22:00', 'Centro cultural contemporáneo', 'Venue para ensayos y funciones', '2026-09-12'),
(uuid_generate_v4(), 'Café Cultural Sala de Corte', 'Café Cultural', 'Calle Cajón del Maipo 1133, Santiago', -33.4136, -70.6501, 'Mar-Sáb 11:00-22:00', 'Espacio independiente', 'Socio estratégico ATHA', '2026-09-12')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: venues (espacios con capacidad) — se expande desde cultural_places
-- Fuente: CSV eventos + datos de venues
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO venues (id, name, city, region, capacity, stage_type, contact_person, contact_email, contact_phone, status, specs, lat, lng, created_at) VALUES
(uuid_generate_v4(), 'Teatro Nacional', 'Santiago', 'Región Metropolitana', 1200, 'Proscenio', 'Coordinador Teatro Nacional', 'contacto@teatronacional.cl', '+56 2 2512 3400', 'Activo / Convenio', '{}', -33.4254, -70.6536, '2026-09-12'),
(uuid_generate_v4(), 'Matucana 100', 'Santiago', 'Región Metropolitana', 600, 'Flexible', 'Coordinación Matucana', 'info@matucana100.cl', '+56 2 2680 1200', 'Activo / Convenio', '{}', -33.4386, -70.6697, '2026-09-12')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: leads (seguimiento comercial)
-- Fuente: 02_Gestión_Comercial.csv
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO leads (id, owner_id, name, email, phone, source, kind, status, score, value, notes, last_contact_at, created_at, updated_at) VALUES
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Seguimiento cliente W', 'cliente.w@ejemplo.cl', '+56 9 0000 0000', 'Cliente directo', 'lead', 'new', NULL, NULL, 'Llamar lunes', '2026-07-28 00:00:00', '2026-09-12', '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Propuesta festival Z', 'festival.z@ejemplo.cl', '+56 9 0000 0000', 'Festival', 'lead', 'new', NULL, NULL, 'Enviar presupuesto', '2026-08-05 00:00:00', '2026-09-12', '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Contrato teatro T', 'teatro.t@ejemplo.cl', '+56 9 0000 0000', 'Teatro', 'lead', 'new', NULL, NULL, 'Esperando firma', '2026-07-30 00:00:00', '2026-09-12', '2026-09-12'),
(uuid_generate_v4(), (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1), 'Reunión espacio S', 'espacio.s@ejemplo.cl', '+56 9 0000 0000', 'Espacio cultural', 'lead', 'new', NULL, NULL, 'Confirmar fecha', '2026-07-24 00:00:00', '2026-09-12', '2026-09-12')
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: grants (fondos concursables)
-- Fuente: CSV 01_Administración.csv (postulaciones/liquidaciones)
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO grants (id, owner_id, name, line, amount, status, deadline, priority, project_id, next_action, responsible, created_at, updated_at) VALUES
-- Mapear según categoría del CSV de administración
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: finance_records (finanzas)
-- Fuente: 01_Administración.csv
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO finance_records (id, project_id, type, category, amount_clp, date, status, invoice_ref, responsible, notes, created_at) VALUES
-- Se genera dinámicamente al momento de procesar 01_Adminitración.csv
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- TABLA: reminders (recordatorios tareas admin)
-- Fuente: 01_Administración.csv (vencimientos pagos/facturas)
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO reminders (id, owner_id, title, body, type, date, channel, scope, read_at, push_payload, created_at) VALUES
-- "Cumplimiento contratos" → vence 2026-08-01
-- "Obligaciones impositivas" → vence 2026-08-15 (IVA)
-- "Liquidaciones y pagos pendientes" → vence 2026-07-30
ON CONFLICT (title, date) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- POST-IMPORT: Acciones pendientes que debe ejecutar el bot de Google Auth
-- ═══════════════════════════════════════════════════════════════════

-- 1. Asignar owner_id real a todos los projects/events/rehearsals usando
--    usuarios creados tras Google Auth (match by email)
/*
UPDATE projects SET owner_id = (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1) WHERE owner_id IS NULL;
UPDATE events SET owner_id = (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1) WHERE owner_id IS NULL;
UPDATE rehearsals SET owner_id = (SELECT id FROM users WHERE email = 'francisco@atha.cl' LIMIT 1) WHERE owner_id IS NULL;
*/

-- 2. Asociar project_members.user_id a los artistas reales (match por nombre/email)
--    cuando existan en la tabla users

-- 3. Correr el motor criticalPath.ts para generar los N ensayos por proyecto
--    y reemplazar los INSERT de rehearsals arriba con los resultados reales

-- 4. Ejecutar planner-data.ts para que el frontend consuma los datos actualizados

-- ═══════════════════════════════════════════════════════════════════
-- NOTAS TÉCNICAS:
--  - UUID generation: Se usa uuid_generate_v4() (Postgre) o 
--    reemplazar con str(uuid4()) en Python/SQLite
--  - ON CONFLICT requiere PostgreSQL; para SQLite usar INSERT OR IGNORE
--  - Los owner_id pendientes se resuelven tras Google Auth login
--  - La tabla events.obra_id es FK a projects.id → usar IDs reales
-- ═══════════════════════════════════════════════════════════════════
