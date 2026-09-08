import { Project } from '../types/project';
import { CrmFolder, CrmCatalogEntry } from '../types/crm';
import { INITIAL_PROJECTS } from '../data/initialProjects';
import { calculateProjectFinances } from './calculations';

const CRM_FOLDERS_STORAGE_KEY = 'atha_crm_folders_v1';
const CRM_CATALOG_STORAGE_KEY = 'atha_crm_catalog_v1';

export const DEFAULT_CRM_FOLDERS: CrmFolder[] = [
  {
    id: 'folder-santiago-escenicas',
    name: 'Santiago · Artes Escénicas (Matucana 100 / Temporadas)',
    category: 'territorio',
    description: 'Montajes teatrales, danza y coproducciones para el circuito metropolitano de salas.',
    iconName: 'theater',
    projectIds: ['atha-prj-001']
  },
  {
    id: 'folder-rancagua-musica',
    name: 'Rancagua & O\'Higgins · Música & Festivales',
    category: 'territorio',
    description: 'Festivales de música independiente, conciertos al aire libre y eventos autogestionados.',
    iconName: 'music',
    projectIds: ['atha-prj-002']
  },
  {
    id: 'folder-cachapoal-mediacion',
    name: 'Valle del Cachapoal · Mediación & Residencias',
    category: 'disciplina',
    description: 'Proyectos de investigación territorial, residencias escolares y archivos patrimoniales.',
    iconName: 'school',
    projectIds: ['atha-prj-003']
  },
  {
    id: 'folder-portafolio-fondos',
    name: 'Portafolio Fondart & FNDR 2026',
    category: 'portafolio',
    description: 'Iniciativas con expediente técnico listo para postulación y fondos públicos concursables.',
    iconName: 'file-badge',
    projectIds: ['atha-prj-001', 'atha-prj-003']
  },
  {
    id: 'folder-nuevas-propuestas',
    name: 'Nuevas Propuestas en Formulación',
    category: 'estado',
    description: 'Borradores de proyectos en etapa de ideación y cálculo paramétrico inicial.',
    iconName: 'sparkles',
    projectIds: []
  }
];

export function getInitialCrmCatalog(projects: Project[] = INITIAL_PROJECTS): CrmCatalogEntry[] {
  return projects.map((proj, idx) => {
    const fin = calculateProjectFinances(proj);
    let targetFolderId = 'folder-nuevas-propuestas';
    let targetFolderName = 'Nuevas Propuestas en Formulación';

    if (proj.discipline.includes('Escénicas')) {
      targetFolderId = 'folder-santiago-escenicas';
      targetFolderName = 'Santiago · Artes Escénicas';
    } else if (proj.discipline.includes('Música')) {
      targetFolderId = 'folder-rancagua-musica';
      targetFolderName = 'Rancagua & O\'Higgins · Música & Festivales';
    } else {
      targetFolderId = 'folder-cachapoal-mediacion';
      targetFolderName = 'Valle del Cachapoal · Mediación & Residencias';
    }

    let totalT = 0;
    let compT = 0;
    proj.stages.forEach(s => {
      s.substages.forEach(sub => {
        totalT += sub.tasks.length;
        compT += sub.tasks.filter(t => t.completed).length;
      });
    });

    const progressPct = totalT > 0 ? Math.round((compT / totalT) * 100) : 0;

    return {
      id: `crm-entry-${proj.id}`,
      projectId: proj.id,
      projectCode: proj.code,
      title: proj.title,
      subtitle: proj.subtitle,
      folderId: targetFolderId,
      folderName: targetFolderName,
      discipline: proj.discipline,
      territory: proj.territory,
      status: proj.status,
      totalBudgetCLP: fin.totalBudgetCLP,
      stagesCount: proj.stages.length,
      tasksCount: totalT,
      completedTasksCount: compT,
      progressPct,
      lastSyncedAt: proj.updatedAt || new Date().toISOString(),
      operatorName: proj.operator?.name || proj.leadProducer,
      syncStatus: 'synced',
      notes: `Sincronizado inicialmente con Intranet CRM ATHAMU (${proj.referenceBaseline || 'Tabulador Base'})`,
      projectData: JSON.parse(JSON.stringify(proj))
    };
  });
}

export function loadCrmFolders(): CrmFolder[] {
  try {
    const saved = localStorage.getItem(CRM_FOLDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading CRM folders from storage', e);
  }
  return DEFAULT_CRM_FOLDERS;
}

export function saveCrmFolders(folders: CrmFolder[]): void {
  try {
    localStorage.setItem(CRM_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Error saving CRM folders to storage', e);
  }
}

export function loadCrmCatalog(): CrmCatalogEntry[] {
  try {
    const saved = localStorage.getItem(CRM_CATALOG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading CRM catalog from storage', e);
  }
  const initial = getInitialCrmCatalog(INITIAL_PROJECTS);
  saveCrmCatalog(initial);
  return initial;
}

export function saveCrmCatalog(entries: CrmCatalogEntry[]): void {
  try {
    localStorage.setItem(CRM_CATALOG_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Error saving CRM catalog to storage', e);
  }
}

export function sendProjectToCrm(
  project: Project,
  folderId: string,
  notes?: string
): { success: boolean; entry: CrmCatalogEntry; updatedCatalog: CrmCatalogEntry[] } {
  const catalog = loadCrmCatalog();
  const folders = loadCrmFolders();
  
  const targetFolder = folders.find(f => f.id === folderId) || folders[0];
  const fin = calculateProjectFinances(project);

  let totalTasks = 0;
  let completedTasks = 0;
  project.stages.forEach(s => {
    s.substages.forEach(sub => {
      totalTasks += sub.tasks.length;
      completedTasks += sub.tasks.filter(t => t.completed).length;
    });
  });
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date().toISOString();
  const existingIdx = catalog.findIndex(e => e.projectId === project.id);

  const entry: CrmCatalogEntry = {
    id: existingIdx >= 0 ? catalog[existingIdx].id : `crm-entry-${project.id}`,
    projectId: project.id,
    projectCode: project.code,
    title: project.title,
    subtitle: project.subtitle,
    folderId: targetFolder.id,
    folderName: targetFolder.name,
    discipline: project.discipline,
    territory: project.territory,
    status: project.status,
    totalBudgetCLP: fin.totalBudgetCLP,
    stagesCount: project.stages.length,
    tasksCount: totalTasks,
    completedTasksCount: completedTasks,
    progressPct,
    lastSyncedAt: now,
    operatorName: project.operator?.name || project.leadProducer,
    syncStatus: 'synced',
    notes: notes || `Enviado desde el Arquitecto de Proyecto al CRM ATHAMU (${now.split('T')[0]})`,
    projectData: JSON.parse(JSON.stringify(project))
  };

  let updatedCatalog: CrmCatalogEntry[];
  if (existingIdx >= 0) {
    updatedCatalog = catalog.map((item, idx) => idx === existingIdx ? entry : item);
  } else {
    updatedCatalog = [entry, ...catalog];
  }

  saveCrmCatalog(updatedCatalog);

  // Update folder projectIds if not already there
  const updatedFolders = folders.map(f => {
    if (f.id === targetFolder.id && !f.projectIds.includes(project.id)) {
      return { ...f, projectIds: [...f.projectIds, project.id] };
    }
    return f;
  });
  saveCrmFolders(updatedFolders);

  return { success: true, entry, updatedCatalog };
}

export function createNewCrmFolder(name: string, description: string): CrmFolder {
  const folders = loadCrmFolders();
  const newFolder: CrmFolder = {
    id: `folder-custom-${Date.now()}`,
    name,
    category: 'portafolio',
    description,
    iconName: 'folder',
    projectIds: []
  };
  const updated = [...folders, newFolder];
  saveCrmFolders(updated);
  return newFolder;
}
