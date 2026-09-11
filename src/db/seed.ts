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
  team
} from './schema.ts';
import {
  INITIAL_OBRAS,
  INITIAL_LEADS,
  INITIAL_RD_PROJECTS,
  INITIAL_TEAM,
  INITIAL_VENUES,
  INITIAL_SCHEDULE,
  INITIAL_INVENTORY,
  INITIAL_FINANCES,
  INITIAL_CREATIVE_LOGS,
  INITIAL_STANDARD_RIDERS
} from '../data/initialData.ts';

export async function seedDatabase() {
  try {
    // 1. Obras
    for (const item of INITIAL_OBRAS) {
      await db.insert(obras).values({
        id: item.id,
        title: item.title,
        discipline: item.discipline,
        format: item.format,
        duration: item.duration,
        targetAudience: item.targetAudience,
        status: item.status,
        synopsis: item.synopsis,
        castTeam: item.castTeam,
        technicalRider: item.technicalRider,
        economics: item.economics,
        premiereDate: item.premiereDate,
        image: item.image,
        dossierHighlights: item.dossierHighlights,
        notes: item.notes || null,
      }).onConflictDoNothing();
    }

    // 2. Leads CRM
    for (const item of INITIAL_LEADS) {
      await db.insert(leads).values({
        id: item.id,
        name: item.name,
        organization: item.organization,
        type: item.type,
        status: item.status,
        city: item.city,
        email: item.email,
        phone: item.phone,
        notes: item.notes || null,
        lastContactDate: item.lastContactDate,
        estimatedValueCLP: item.estimatedValueCLP,
        assignedTo: item.assignedTo,
      }).onConflictDoNothing();
    }

    // 3. I+D Projects
    for (const item of INITIAL_RD_PROJECTS) {
      await db.insert(rdProjects).values({
        id: item.id,
        code: item.code,
        title: item.title,
        progress: item.progress,
        phase: item.phase,
        description: item.description,
        teamLead: item.teamLead,
        budgetCLP: item.budgetCLP,
        spentCLP: item.spentCLP,
        milestoneUpcoming: item.milestoneUpcoming,
        tags: item.tags,
        updatedAt: item.updatedAt,
      }).onConflictDoNothing();
    }

    // 4. Venues
    for (const item of INITIAL_VENUES) {
      await db.insert(venues).values({
        id: item.id,
        name: item.name,
        city: item.city,
        region: item.region,
        capacity: item.capacity,
        stageType: item.stageType,
        contactPerson: item.contactPerson,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone || null,
        status: item.status,
        specs: item.specs,
      }).onConflictDoNothing();
    }

    // 5. Events Schedule
    for (const item of INITIAL_SCHEDULE) {
      await db.insert(events).values({
        id: item.id,
        title: item.title,
        obraId: item.obraId,
        obraTitle: item.obraTitle,
        type: item.type,
        date: item.date,
        timeStart: item.timeStart,
        timeEnd: item.timeEnd,
        venue: item.venue,
        castCount: item.castCount,
        status: item.status,
      }).onConflictDoNothing();
    }

    // 6. Inventory
    for (const item of INITIAL_INVENTORY) {
      await db.insert(inventory).values({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        condition: item.condition,
        status: item.status,
        assignedToWork: item.assignedToWork || null,
        location: item.location,
        valueCLP: item.valueCLP,
      }).onConflictDoNothing();
    }

    // 7. Finances
    for (const item of INITIAL_FINANCES) {
      await db.insert(finances).values({
        id: item.id,
        projectId: item.projectId,
        projectName: item.projectName,
        type: item.type,
        category: item.category,
        amountCLP: item.amountCLP,
        date: item.date,
        status: item.status,
        invoiceRef: item.invoiceRef,
        responsible: item.responsible,
      }).onConflictDoNothing();
    }

    // 8. Process Logs
    for (const item of INITIAL_CREATIVE_LOGS) {
      await db.insert(processLogs).values({
        id: item.id,
        obraId: item.obraId,
        obraTitle: item.obraTitle,
        date: item.date,
        author: item.author,
        phase: item.phase || null,
        title: item.title,
        entry: item.entry,
        tags: item.tags,
      }).onConflictDoNothing();
    }

    // 9. Riders
    for (const item of INITIAL_STANDARD_RIDERS) {
      await db.insert(riders).values({
        id: item.id,
        title: item.title,
        category: item.category,
        version: item.version,
        description: item.description,
        keySpecs: item.keySpecs,
        pdfFileTitle: item.pdfFileTitle,
        technicalDirector: item.technicalDirector,
        specs: item.specs || null,
      }).onConflictDoNothing();
    }

    // 10. Team
    for (const item of INITIAL_TEAM) {
      await db.insert(team).values({
        id: item.id,
        name: item.name,
        role: item.role,
        title: item.title,
        bio: item.bio,
        image: item.image,
        email: item.email,
        phone: item.phone,
        location: item.location,
        activeProjects: item.activeProjects,
        discipline: item.discipline,
      }).onConflictDoNothing();
    }

    console.log('Database seeded successfully from initialData');
    return { success: true, message: 'Database seeded successfully' };
  } catch (err: any) {
    console.error('Error seeding database:', err);
    throw new Error('Database seeding failed', { cause: err });
  }
}
