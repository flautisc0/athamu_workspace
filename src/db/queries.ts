import { db } from './index.ts';
import {
  obras,
  leads,
  rdProjects,
  venues,
  events,
  inventory,
  finances,
  processLogs,
  riders,
  team,
  users
} from './schema.ts';
import { eq } from 'drizzle-orm';
import type {
  Obra,
  Lead,
  ProjectRD,
  Venue,
  EventSchedule,
  InventoryItem,
  FinanceRecord,
  CreativeLog,
  StandardRider,
  TeamMember
} from '../types.ts';

// Obras
export async function getObras() {
  try {
    return await db.select().from(obras);
  } catch (error) {
    console.error('Failed to get obras:', error);
    throw new Error('Failed to retrieve obras from database.', { cause: error });
  }
}

export async function upsertObra(obraData: Obra) {
  try {
    return await db
      .insert(obras)
      .values({
        id: obraData.id,
        title: obraData.title,
        discipline: obraData.discipline,
        format: obraData.format,
        duration: obraData.duration,
        targetAudience: obraData.targetAudience,
        status: obraData.status,
        synopsis: obraData.synopsis,
        castTeam: obraData.castTeam,
        technicalRider: obraData.technicalRider,
        economics: obraData.economics,
        premiereDate: obraData.premiereDate,
        image: obraData.image,
        dossierHighlights: obraData.dossierHighlights,
        notes: obraData.notes || null,
      })
      .onConflictDoUpdate({
        target: obras.id,
        set: {
          title: obraData.title,
          discipline: obraData.discipline,
          format: obraData.format,
          duration: obraData.duration,
          targetAudience: obraData.targetAudience,
          status: obraData.status,
          synopsis: obraData.synopsis,
          castTeam: obraData.castTeam,
          technicalRider: obraData.technicalRider,
          economics: obraData.economics,
          premiereDate: obraData.premiereDate,
          image: obraData.image,
          dossierHighlights: obraData.dossierHighlights,
          notes: obraData.notes || null,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert obra:', error);
    throw new Error('Failed to save obra to database.', { cause: error });
  }
}

export async function deleteObra(id: string) {
  try {
    return await db.delete(obras).where(eq(obras.id, id));
  } catch (error) {
    console.error('Failed to delete obra:', error);
    throw new Error('Failed to delete obra from database.', { cause: error });
  }
}

// Leads
export async function getLeads() {
  try {
    return await db.select().from(leads);
  } catch (error) {
    console.error('Failed to get leads:', error);
    throw new Error('Failed to retrieve leads from database.', { cause: error });
  }
}

export async function upsertLead(leadData: Lead) {
  try {
    return await db
      .insert(leads)
      .values({
        id: leadData.id,
        name: leadData.name,
        organization: leadData.organization,
        type: leadData.type,
        status: leadData.status,
        city: leadData.city,
        email: leadData.email,
        phone: leadData.phone,
        notes: leadData.notes || null,
        lastContactDate: leadData.lastContactDate,
        estimatedValueCLP: leadData.estimatedValueCLP,
        assignedTo: leadData.assignedTo,
      })
      .onConflictDoUpdate({
        target: leads.id,
        set: {
          name: leadData.name,
          organization: leadData.organization,
          type: leadData.type,
          status: leadData.status,
          city: leadData.city,
          email: leadData.email,
          phone: leadData.phone,
          notes: leadData.notes || null,
          lastContactDate: leadData.lastContactDate,
          estimatedValueCLP: leadData.estimatedValueCLP,
          assignedTo: leadData.assignedTo,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert lead:', error);
    throw new Error('Failed to save lead to database.', { cause: error });
  }
}

// RD Projects
export async function getRdProjects() {
  try {
    return await db.select().from(rdProjects);
  } catch (error) {
    console.error('Failed to get rd projects:', error);
    throw new Error('Failed to retrieve R&D projects from database.', { cause: error });
  }
}

// Venues
export async function getVenues() {
  try {
    return await db.select().from(venues);
  } catch (error) {
    console.error('Failed to get venues:', error);
    throw new Error('Failed to retrieve venues from database.', { cause: error });
  }
}

// Events
export async function getEvents() {
  try {
    return await db.select().from(events);
  } catch (error) {
    console.error('Failed to get events:', error);
    throw new Error('Failed to retrieve events from database.', { cause: error });
  }
}

export async function upsertEvent(eventData: EventSchedule) {
  try {
    return await db
      .insert(events)
      .values({
        id: eventData.id,
        title: eventData.title,
        obraId: eventData.obraId,
        obraTitle: eventData.obraTitle,
        type: eventData.type,
        date: eventData.date,
        timeStart: eventData.timeStart,
        timeEnd: eventData.timeEnd,
        venue: eventData.venue,
        castCount: eventData.castCount,
        status: eventData.status,
      })
      .onConflictDoUpdate({
        target: events.id,
        set: {
          title: eventData.title,
          obraId: eventData.obraId,
          obraTitle: eventData.obraTitle,
          type: eventData.type,
          date: eventData.date,
          timeStart: eventData.timeStart,
          timeEnd: eventData.timeEnd,
          venue: eventData.venue,
          castCount: eventData.castCount,
          status: eventData.status,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert event:', error);
    throw new Error('Failed to save event to database.', { cause: error });
  }
}

// Inventory
export async function getInventory() {
  try {
    return await db.select().from(inventory);
  } catch (error) {
    console.error('Failed to get inventory:', error);
    throw new Error('Failed to retrieve inventory from database.', { cause: error });
  }
}

export async function upsertInventory(item: InventoryItem) {
  try {
    return await db
      .insert(inventory)
      .values({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        condition: item.condition,
        status: item.status,
        assignedToWork: item.assignedToWork || null,
        location: item.location,
        valueCLP: item.valueCLP,
      })
      .onConflictDoUpdate({
        target: inventory.id,
        set: {
          code: item.code,
          name: item.name,
          category: item.category,
          condition: item.condition,
          status: item.status,
          assignedToWork: item.assignedToWork || null,
          location: item.location,
          valueCLP: item.valueCLP,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert inventory item:', error);
    throw new Error('Failed to save inventory item to database.', { cause: error });
  }
}

// Finances
export async function getFinances() {
  try {
    return await db.select().from(finances);
  } catch (error) {
    console.error('Failed to get finances:', error);
    throw new Error('Failed to retrieve finances from database.', { cause: error });
  }
}

export async function upsertFinance(financeData: FinanceRecord) {
  try {
    return await db
      .insert(finances)
      .values({
        id: financeData.id,
        projectId: financeData.projectId,
        projectName: financeData.projectName,
        type: financeData.type,
        category: financeData.category,
        amountCLP: financeData.amountCLP,
        date: financeData.date,
        status: financeData.status,
        invoiceRef: financeData.invoiceRef,
        responsible: financeData.responsible,
      })
      .onConflictDoUpdate({
        target: finances.id,
        set: {
          projectId: financeData.projectId,
          projectName: financeData.projectName,
          type: financeData.type,
          category: financeData.category,
          amountCLP: financeData.amountCLP,
          date: financeData.date,
          status: financeData.status,
          invoiceRef: financeData.invoiceRef,
          responsible: financeData.responsible,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert finance:', error);
    throw new Error('Failed to save finance record to database.', { cause: error });
  }
}

// Process Logs
export async function getProcessLogs() {
  try {
    return await db.select().from(processLogs);
  } catch (error) {
    console.error('Failed to get process logs:', error);
    throw new Error('Failed to retrieve process logs from database.', { cause: error });
  }
}

// Riders
export async function getRiders() {
  try {
    return await db.select().from(riders);
  } catch (error) {
    console.error('Failed to get riders:', error);
    throw new Error('Failed to retrieve riders from database.', { cause: error });
  }
}

// Team
export async function getTeam() {
  try {
    return await db.select().from(team);
  } catch (error) {
    console.error('Failed to get team members:', error);
    throw new Error('Failed to retrieve team members from database.', { cause: error });
  }
}

// Full Database Export / Backup
export async function getAllData() {
  try {
    const [
      allObras,
      allLeads,
      allRd,
      allVenues,
      allEvents,
      allInventory,
      allFinances,
      allLogs,
      allRiders,
      allTeam
    ] = await Promise.all([
      db.select().from(obras),
      db.select().from(leads),
      db.select().from(rdProjects),
      db.select().from(venues),
      db.select().from(events),
      db.select().from(inventory),
      db.select().from(finances),
      db.select().from(processLogs),
      db.select().from(riders),
      db.select().from(team)
    ]);

    return {
      obras: allObras,
      leads: allLeads,
      rdProjects: allRd,
      venues: allVenues,
      events: allEvents,
      inventory: allInventory,
      finances: allFinances,
      processLogs: allLogs,
      riders: allRiders,
      team: allTeam,
      exportedAt: new Date().toISOString(),
      databaseEngine: 'PostgreSQL (Google Cloud SQL)',
      schemaVersion: '2026.09'
    };
  } catch (error) {
    console.error('Failed to retrieve all data:', error);
    throw new Error('Failed to export all data from database.', { cause: error });
  }
}
