import { Project, DisciplineType, TerritoryType, ProjectStatus } from './project';

export interface CrmFolder {
  id: string;
  name: string;
  category: 'territorio' | 'disciplina' | 'estado' | 'portafolio';
  description: string;
  iconName?: string;
  projectIds: string[];
}

export interface CrmCatalogEntry {
  id: string;
  projectId: string;
  projectCode: string;
  title: string;
  subtitle: string;
  folderId: string;
  folderName: string;
  discipline: DisciplineType;
  territory: TerritoryType;
  status: ProjectStatus;
  totalBudgetCLP: number;
  stagesCount: number;
  tasksCount: number;
  completedTasksCount: number;
  progressPct: number;
  lastSyncedAt: string;
  operatorName: string;
  syncStatus: 'synced' | 'pending' | 'draft';
  notes?: string;
  projectData: Project;
}
