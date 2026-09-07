/**
 * Utilidad de persistencia local en localStorage para ATHA Producciones
 */
export const STORAGE_KEYS = {
  OBRAS: 'obras',
  LEADS: 'leads',
  RD_PROJECTS: 'rd_projects',
  EVENTS: 'events',
  ARTISTS: 'artists',
  INVENTORY: 'inventory',
  FINANCES: 'finances',
  PROCESS_LOGS: 'process_logs',
  REMINDERS: 'reminders',
  USER_PROFILE: 'user_profile',
} as const;

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`atha_${key}`);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.warn(`Error al cargar datos locales para ${key}:`, error);
  }
  return defaultValue;
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`atha_${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error al guardar en almacenamiento local para ${key}:`, error);
  }
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
}
