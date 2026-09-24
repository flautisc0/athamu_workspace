import { useState, useEffect, useCallback } from 'react';
import { UserPreferencesPayload } from '../types';
import { DEFAULT_PREFERENCES } from '../context/ThemeContext';

// Hub del ecosistema (antes apuntaba a atha-producciones-app, un servicio ya dado de baja).
const BACKEND_URL = ((import.meta.env as any)?.VITE_BACKEND_URL as string) || 'https://atha-crm-web-frontend-897089213264.us-central1.run.app';

export interface UseUserPreferencesResult {
  preferences: UserPreferencesPayload;
  isLoading: boolean;
  isSaving: boolean;
  saveStatusText: string;
  updatePreferences: (newPrefs: UserPreferencesPayload) => void;
  saveToCloud: () => Promise<void>;
  reloadFromCloud: () => Promise<void>;
}

/** Id o correo del usuario conectado (clave compartida del ecosistema). */
export function usuarioSesionId(): string {
  for (const clave of ['atha_user_session', 'user_session', 'user_profile']) {
    try {
      const u = JSON.parse(localStorage.getItem(clave) || 'null');
      const id = u?.email || u?.id || u?.user?.email;
      if (id) return String(id);
    } catch { /* sigue con la otra */ }
  }
  return '';
}

export const useUserPreferences = (userId: string = usuarioSesionId()): UseUserPreferencesResult => {
  const [preferences, setPreferences] = useState<UserPreferencesPayload>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatusText, setSaveStatusText] = useState<string>('Sincronizado Cloud');

  // GET preferences on login / mount
  const reloadFromCloud = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = `${BACKEND_URL.replace(/\/+$/, '')}/api/users/${userId}/preferences`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.theme_config && data.layout_config) {
          setPreferences(data);
          setSaveStatusText('Sincronizado Cloud');
        }
      } else {
        // Fallback to localStorage
        const local = localStorage.getItem(`fase_user_prefs_${userId}`);
        if (local) {
          setPreferences(JSON.parse(local));
        }
      }
    } catch (err) {
      console.warn('Network GET preferences error, falling back to local storage:', err);
      const local = localStorage.getItem(`fase_user_prefs_${userId}`);
      if (local) {
        setPreferences(JSON.parse(local));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reloadFromCloud();
  }, [reloadFromCloud]);

  // PUT / POST preferences to backend SQL / Cloud Run
  const saveToCloud = async () => {
    setIsSaving(true);
    setSaveStatusText('Guardando...');
    try {
      const endpoint = `${BACKEND_URL.replace(/\/+$/, '')}/api/users/${userId}/preferences`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      localStorage.setItem(`fase_user_prefs_${userId}`, JSON.stringify(preferences));

      if (res.ok) {
        setSaveStatusText('Sincronizado Cloud');
      } else {
        // El backend no confirmo: se avisa en vez de decir 'sincronizado'
        setSaveStatusText(`Guardado local (error ${res.status})`);
      }
    } catch (err) {
      console.warn('No se pudo guardar en el backend, queda local:', err);
      localStorage.setItem(`fase_user_prefs_${userId}`, JSON.stringify(preferences));
      setSaveStatusText('Guardado local (sin conexion)');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreferences = (newPrefs: UserPreferencesPayload) => {
    setPreferences(newPrefs);
    setSaveStatusText('Modificado sin guardar');
  };

  return {
    preferences,
    isLoading,
    isSaving,
    saveStatusText,
    updatePreferences,
    saveToCloud,
    reloadFromCloud
  };
};
