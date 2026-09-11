import { pgTable, text, integer, serial, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (Firebase Auth linked)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Obras & Montajes
export const obras = pgTable('obras', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  discipline: text('discipline').notNull(),
  format: text('format').notNull(),
  duration: text('duration').notNull(),
  targetAudience: text('target_audience').notNull(),
  status: text('status').notNull(),
  synopsis: text('synopsis').notNull(),
  castTeam: jsonb('cast_team').notNull(),
  technicalRider: jsonb('technical_rider').notNull(),
  economics: jsonb('economics').notNull(),
  premiereDate: text('premiere_date').notNull(),
  image: text('image').notNull(),
  dossierHighlights: jsonb('dossier_highlights').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Leads CRM
export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  organization: text('organization').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  city: text('city').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  notes: text('notes'),
  lastContactDate: text('last_contact_date').notNull(),
  estimatedValueCLP: integer('estimated_value_clp').notNull(),
  assignedTo: text('assigned_to').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// I+D Projects
export const rdProjects = pgTable('rd_projects', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  progress: integer('progress').notNull(),
  phase: text('phase').notNull(),
  description: text('description').notNull(),
  teamLead: text('team_lead').notNull(),
  budgetCLP: integer('budget_clp').notNull(),
  spentCLP: integer('spent_clp').notNull(),
  milestoneUpcoming: text('milestone_upcoming').notNull(),
  tags: jsonb('tags').notNull(),
  updatedAt: text('updated_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Salas & Venues
export const venues = pgTable('venues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  region: text('region').notNull(),
  capacity: integer('capacity').notNull(),
  stageType: text('stage_type').notNull(),
  contactPerson: text('contact_person').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  status: text('status').notNull(),
  specs: text('specs').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Event Schedule / Calendario
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  obraId: text('obra_id').notNull(),
  obraTitle: text('obra_title').notNull(),
  type: text('type').notNull(),
  date: text('date').notNull(),
  timeStart: text('time_start').notNull(),
  timeEnd: text('time_end').notNull(),
  venue: text('venue').notNull(),
  castCount: integer('cast_count').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Inventario & Backline
export const inventory = pgTable('inventory', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  condition: text('condition').notNull(),
  status: text('status').notNull(),
  assignedToWork: text('assigned_to_work'),
  location: text('location').notNull(),
  valueCLP: integer('value_clp').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Finanzas & Rendiciones
export const finances = pgTable('finances', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  projectName: text('project_name').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  amountCLP: integer('amount_clp').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull(),
  invoiceRef: text('invoice_ref').notNull(),
  responsible: text('responsible').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Diario de Proceso
export const processLogs = pgTable('process_logs', {
  id: text('id').primaryKey(),
  obraId: text('obra_id').notNull(),
  obraTitle: text('obra_title').notNull(),
  date: text('date').notNull(),
  author: text('author').notNull(),
  phase: text('phase'),
  title: text('title').notNull(),
  entry: text('entry').notNull(),
  tags: jsonb('tags').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Riders Técnicos
export const riders = pgTable('riders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  version: text('version').notNull(),
  description: text('description').notNull(),
  keySpecs: jsonb('key_specs').notNull(),
  pdfFileTitle: text('pdf_file_title').notNull(),
  technicalDirector: text('technical_director').notNull(),
  specs: jsonb('specs'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Equipo Fundador & Elenco
export const team = pgTable('team', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  title: text('title').notNull(),
  bio: text('bio').notNull(),
  image: text('image').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  location: text('location').notNull(),
  activeProjects: jsonb('active_projects').notNull(),
  discipline: text('discipline').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
