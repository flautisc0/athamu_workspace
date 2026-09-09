import React, { useState, useEffect, useCallback } from 'react';
import { UserSession } from '../types';
import {
  saveUserSession,
  getUserSession,
  clearUserSession,
  saveAuthToken,
  getAuthToken,
} from '../utils/crmCatalogService';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  LogIn,
  LogOut,
  Github,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  onSelectUser: (user: UserSession) => void;
  onSyncCloud: () => void;
  isSyncing: boolean;
}

// Credenciales de desarrollo — sustituir con Google OAuth real en prod
export const PRESET_USERS: UserSession[] = [
  {
    id: 'user-01',
    name: 'Francisco Pérez',
    email: 'francisco@athaproducciones.cl',
    role: 'Director General & Productor Ejecutivo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    provider: 'google',
  },
  {
    id: 'user-02',
    name: 'Jo Schultz',
    email: 'jo.schultz@athaproducciones.cl',
    role: 'Directora Creativa & Coreógrafa',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    provider: 'apple',
  },
  {
    id: 'user-03',
    name: 'Antonia Fernández',
    email: 'antonia@athaproducciones.cl',
    role: 'Directora Técnica & Iluminación',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    provider: 'google',
  },
  {
    id: 'user-04',
    name: 'Nicolás Ortiz',
    email: 'nicolas@athaproducciones.cl',
    role: 'Director Musical & Curaduría Sonora',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    provider: 'apple',
  },
];

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

function base64UrlDecode(str: string): string {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return atob(b64);
  }
}

function parseJwt(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onSyncCloud,
  isSyncing,
}) => {
  if (!isOpen) return null;

  const [authMethodFeedback, setAuthMethodFeedback] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Cargar Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setAuthMethodFeedback('⚠️ VITE_GOOGLE_CLIENT_ID no configurado');
      return;
    }
    const existing = document.getElementById('g_id_script');
    if (existing) {
      setGoogleLoaded(!!(window as any).google?.accounts?.id);
      return;
    }
    const script = document.createElement('script');
    script.id = 'g_id_script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(!!(window as any).google?.accounts?.id);
    script.onerror = () => setAuthMethodFeedback('Error cargando Google Identity Services');
    document.head.appendChild(script);
    return () => {
      const s = document.getElementById('g_id_script');
      if (s && s.parentNode) s.parentNode.removeChild(s);
    };
  }, []);

  const handleGoogleLogin = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !(window as any).google?.accounts?.id) {
      setAuthMethodFeedback('Google Identity no disponible — usando cuenta de desarrollo');
      setTimeout(() => setAuthMethodFeedback(null), 1500);
      return;
    }
    setAuthMethodFeedback('Autenticando con Google Workspace...');
    (window as any).google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (cred: { credential: string }) => {
        const payload = parseJwt(cred.credential);
        if (!payload) {
          setAuthMethodFeedback('Error decodificando token Google');
          return;
        }
        const user: UserSession = {
          id: payload.sub || payload.email,
          name: payload.name || payload.email,
          email: payload.email,
          role: payload.role || 'Operador ATHA',
          avatar: payload.picture || '',
          provider: 'google',
        };
        saveUserSession(user);
        saveAuthToken(cred.credential);
        onSelectUser(user);
        setAuthMethodFeedback(`¡Sesión activada con Google: ${payload.email}!`);
        setTimeout(() => { setAuthMethodFeedback(null); onClose(); }, 1500);
      },
      auto_select: false,
    });
    (window as any).google.accounts.id.prompt((notification: any) => {
      // One Tap (opcional) — se cierra tras interacción
      notification.getNotDisplayedIfNeeded && notification.getNotDisplayedIfNeeded();
    });
    // Prompt de login popup (más visible que One Tap)
    (window as any).google.accounts.id.renderButton(
      document.getElementById('g_id_onedeal'),
      { theme: 'outline', size: 'large', text: 'sign_in_with' },
    );
    // fallback: abrir popup One Tap
    (window as any).google.accounts.id.prompt();
  }, [onSelectUser, onClose]);

  const handleLogout = () => {
    clearUserSession();
    // reset al usuario demo (no autenticado)
    const demo = PRESET_USERS[0];
    onSelectUser(demo);
    setAuthMethodFeedback('Sesión cerrada');
    setTimeout(() => setAuthMethodFeedback(null), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12141a]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#6ee7b7]" />
            <h2 className="text-base font-semibold text-white">Autenticación & Acceso ATHA</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Active User Banner */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-4">
            <img src={currentUser.avatar} alt={currentUser.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#6ee7b7]" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{currentUser.name}</h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-[#6ee7b7]/20 text-[#6ee7b7]">{currentUser.provider}</span>
              </div>
              <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-[#6ee7b7] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Real Google Sign-In Button */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Iniciar sesión con cuenta corporativa</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={!googleLoaded || !!getAuthToken()}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-xs font-medium text-white bg-[#4285F4] hover:bg-[#3367d6] disabled:opacity-60 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continuar con Google</span>
              </button>
            </div>

            {authMethodFeedback && (
              <p className="text-xs text-center text-[#6ee7b7] animate-pulse">{authMethodFeedback}</p>
            )}
          </div>

          {/* Switch Active User Profile (fallback cuentas dev) */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cambiar Socio / Sesión Activa</p>
            <div className="space-y-1.5">
              {PRESET_USERS.map((user) => {
                const isSelected = user.id === currentUser.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => { onSelectUser(user); onClose(); }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#6ee7b7]/10 border-[#6ee7b7]/40 text-white'
                        : 'bg-[#0f1115]/50 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name}
                        className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <span className="text-xs font-medium text-white block">{user.name}</span>
                        <span className="text-[11px] text-slate-400 block">{user.role}</span>
                      </div>
                    </div>
                    {isSelected && (<CheckCircle2 className="w-4 h-4 text-[#6ee7b7]" />)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cloud Sync Section */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sincronización Cloud ATHA
              </span>
              <button
                type="button"
                onClick={onSyncCloud}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tu sesión Google se comparte con el CRM real (:5052) — agenda eventos y recibe notificaciones personalizadas por Telegram.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
