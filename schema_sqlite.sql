CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'artist',
    role_title      VARCHAR(100),
    bio_short       TEXT,
    public_profile  INTEGER NOT NULL DEFAULT 0,
    picture         VARCHAR(500),
    provider        VARCHAR(50) DEFAULT 'google',
    phone           VARCHAR(80),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS artist_profiles (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    bio             TEXT,
    location        VARCHAR(255),
    phone           VARCHAR(80),
    website         VARCHAR(255),
    public_profile  INTEGER NOT NULL DEFAULT 0,
    role_title      VARCHAR(100),
    bio_short       TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    budget_range    VARCHAR(255),
    year            INTEGER,
    category        VARCHAR(50) NOT NULL DEFAULT 'musica',
    image_url       VARCHAR(500),
    location        VARCHAR(200),
    is_public       INTEGER NOT NULL DEFAULT 0,
    kind            VARCHAR(50) DEFAULT 'obra',
    discipline      VARCHAR(50),
    format          VARCHAR(255),
    duration        VARCHAR(50),
    target_audience VARCHAR(100),
    premiere_date   VARCHAR(255),
    dossier_highlights TEXT,
    notes           TEXT,
    progress        INTEGER CHECK (progress >= 0 AND progress <= 100),
    phase           VARCHAR(100),
    team_lead       VARCHAR(255),
    spent_clp       NUMERIC(14,2),
    milestone_upcoming TEXT,
    tags            TEXT,
    fee_clp         NUMERIC(14,2),
    ticket_split_clp NUMERIC(14,2),
    production_cost_clp NUMERIC(14,2),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_members (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'integrante',
    display_name    VARCHAR(255),
    phone           VARCHAR(80),
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    title           VARCHAR(255),
    bio             TEXT,
    image_url       VARCHAR(500),
    email           VARCHAR(255),
    location        VARCHAR(255),
    active_projects TEXT,
    discipline      VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS grants (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    line            VARCHAR(255),
    amount          VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    deadline        TEXT,
    priority        VARCHAR(20) DEFAULT 'P1',
    project_id      TEXT REFERENCES projects(id),
    next_action     VARCHAR(255),
    responsible     VARCHAR(255),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    organization    VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(80),
    source          VARCHAR(255),
    kind            VARCHAR(20) NOT NULL DEFAULT 'lead',
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    score           VARCHAR(20),
    value           VARCHAR(255),
    notes           TEXT,
    last_contact_at TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS venues (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            VARCHAR(255) NOT NULL,
    city            VARCHAR(255),
    region          VARCHAR(255),
    capacity        INTEGER,
    stage_type      VARCHAR(255),
    contact_person  VARCHAR(255),
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(80),
    status          VARCHAR(50) DEFAULT 'Activo / Convenio',
    specs           TEXT,
    lat             NUMERIC(10,8),
    lng             NUMERIC(11,8),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code            VARCHAR(100) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    condition       VARCHAR(30) DEFAULT 'Operativo',
    status          VARCHAR(30) DEFAULT 'Disponible',
    assigned_to_work TEXT,
    location        VARCHAR(255),
    value_clp       NUMERIC(14,2),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS finance_records (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id      TEXT NOT NULL REFERENCES projects(id),
    type            VARCHAR(20) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    amount_clp      NUMERIC(14,2) NOT NULL,
    date            DATE NOT NULL DEFAULT (date('now')),
    status          VARCHAR(20) DEFAULT 'Pendiente',
    invoice_ref     VARCHAR(100),
    responsible     VARCHAR(255),
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority        VARCHAR(20) DEFAULT 'medium',
    category        VARCHAR(80),
    due_at          TEXT,
    scope           VARCHAR(20) DEFAULT 'atha',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_plans (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    objective       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    cadence         VARCHAR(20) DEFAULT 'weekly',
    scope           VARCHAR(20) DEFAULT 'atha',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_checkpoints (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    plan_id         TEXT NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    due_at          TEXT,
    status          VARCHAR(20) DEFAULT 'pending',
    scope           VARCHAR(20) DEFAULT 'atha',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_logs (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    plan_id         TEXT NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,
    summary         TEXT NOT NULL,
    stats           TEXT,
    scope           VARCHAR(20) DEFAULT 'atha',
    logged_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS automations (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    plan_id         TEXT NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    kind            VARCHAR(80) NOT NULL,
    schedule        VARCHAR(255),
    payload         TEXT,
    enabled         INTEGER NOT NULL DEFAULT 1,
    scope           VARCHAR(20) DEFAULT 'atha',
    last_run_at     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    obra_id         TEXT REFERENCES projects(id),
    obra_title      VARCHAR(255),
    type            VARCHAR(50) NOT NULL,
    date            DATE NOT NULL DEFAULT (date('now')),
    time_start      TIME NOT NULL,
    time_end        TIME,
    venue           VARCHAR(255),
    crew_count      INTEGER,
    status          VARCHAR(20) DEFAULT 'Confirmado',
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rehearsals (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    kind            VARCHAR(100) DEFAULT 'Ensayo',
    status          VARCHAR(20) DEFAULT 'scheduled',
    start_at        TEXT NOT NULL,
    end_at          TEXT,
    location        VARCHAR(255),
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id        TEXT NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    type            VARCHAR(80) DEFAULT 'reminder',
    date            DATE DEFAULT (date('now')),
    channel         VARCHAR(80) DEFAULT 'telegram',
    scope           VARCHAR(20) DEFAULT 'atha',
    read_at         TEXT,
    push_payload    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cultural_places (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            VARCHAR(255) NOT NULL,
    kind            VARCHAR(100) NOT NULL,
    address         VARCHAR(255),
    lat             NUMERIC(10,8) NOT NULL,
    lng             NUMERIC(11,8) NOT NULL,
    hours           VARCHAR(255),
    review          TEXT,
    note            VARCHAR(255),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poi_photos (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    poi_id          TEXT NOT NULL REFERENCES cultural_places(id) ON DELETE CASCADE,
    user_id         TEXT REFERENCES users(id),
    data_url        TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poi_visits (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    poi_id          TEXT NOT NULL REFERENCES cultural_places(id),
    user_id         TEXT REFERENCES users(id),
    visited_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS uploads (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id),
    project_id      TEXT REFERENCES projects(id),
    filename        VARCHAR(255) NOT NULL,
    path            VARCHAR(1024) NOT NULL,
    bytes           INTEGER,
    mime_type       VARCHAR(100),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           VARCHAR(200) NOT NULL,
    excerpt         TEXT,
    content         TEXT,
    date            DATE DEFAULT (date('now')),
    category        VARCHAR(50) DEFAULT 'general',
    is_public       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(120) NOT NULL,
    subject         VARCHAR(100) NOT NULL,
    message         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    is_read         INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO users (id, email, display_name, role, role_title, public_profile, picture, provider)
VALUES
  ('usr_fase_1', 'francisco@athaproducciones.cl', 'Francisco Pérez', 'admin',
   'Director General & Productor Ejecutivo', 1,
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80', 'google'),
  ('usr_fase_2', 'jo.schultz@athaproducciones.cl', 'Jo Schultz', 'socio',
   'Directora Creativa & Coreógrafa', 1,
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', 'google'),
  ('usr_fase_3', 'antonia@athaproducciones.cl', 'Antonia Fernández', 'socio',
   'Directora de Producción Técnica & Iluminación', 1,
   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80', 'google'),
  ('usr_fase_4', 'nicolas@athaproducciones.cl', 'Nicolás Ortiz', 'socio',
   'Director Musical & Curaduría Sonora', 1,
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', 'google');
