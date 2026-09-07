import React, { useState } from 'react';
import { UserSession } from '../types';
import { X, ShieldCheck, CheckCircle2, RefreshCw, LogIn, LogOut } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  onSelectUser: (user: UserSession) => void;
  onSyncCloud: () => void;
  isSyncing: boolean;
}

const PRESET_USERS: UserSession[] = [
  {
    id: 'user-01',
    name: 'Francisco Pérez',
    email: 'francisco@athaproducciones.cl',
    role: 'Director General & Productor Ejecutivo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    provider: 'google'
  },
  {
    id: 'user-02',
    name: 'Jo Schultz',
    email: 'jo.schultz@athaproducciones.cl',
    role: 'Directora Creativa & Coreógrafa',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    provider: 'apple'
  },
  {
    id: 'user-03',
    name: 'Antonia Fernández',
    email: 'antonia@athaproducciones.cl',
    role: 'Directora Técnica & Iluminación',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    provider: 'google'
  },
  {
    id: 'user-04',
    name: 'Nicolás Ortiz',
    email: 'nicolas@athaproducciones.cl',
    role: 'Director Musical & Curaduría Sonora',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    provider: 'apple'
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onSyncCloud,
  isSyncing
}) => {
  if (!isOpen) return null;

  const [authMethodFeedback, setAuthMethodFeedback] = useState<string | null>(null);

  const handleOAuthSimulate = (provider: 'google' | 'apple') => {
    setAuthMethodFeedback(`Autenticando con ${provider === 'google' ? 'Google Workspace' : 'Apple ID'}...`);
    setTimeout(() => {
      setAuthMethodFeedback(`¡Sesión validada exitosamente con ${provider === 'google' ? 'Google' : 'Apple'}!`);
      setTimeout(() => {
        setAuthMethodFeedback(null);
      }, 2000);
    }, 900);
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
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#6ee7b7]"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{currentUser.name}</h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#6ee7b7]/20 text-[#6ee7b7]">
                  {currentUser.provider}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
            </div>
          </div>

          {/* Social Sign In Buttons (Google & Apple) */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Iniciar Sesión con Cuenta Corporativa
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSimulate('google')}
                className="flex items-center justify-center gap-2.5 px-3 py-2.5 text-xs font-medium text-white bg-[#0f1115] hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSimulate('apple')}
                className="flex items-center justify-center gap-2.5 px-3 py-2.5 text-xs font-medium text-white bg-[#0f1115] hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.59-7.79-11.72-14.24-6.09-9.5-10.8-20.08-14.13-31.75-3.34-11.66-5.01-22.75-5.01-33.27 0-14.82 3.72-27.24 11.16-37.28 7.44-10.03 16.92-15.15 28.44-15.36 4.7 0 10.15 1.34 16.34 4.01 6.19 2.68 10.15 4.07 11.89 4.17 1.62-.1 5.75-1.57 12.39-4.39 6.64-2.83 12.27-4.14 16.89-3.95 12.87.64 23.3 5.48 31.3 14.52-11.22 6.83-16.72 16.27-16.51 28.32.22 9.53 3.92 17.58 11.1 24.16 7.18 6.58 15.69 10.3 25.53 11.16-2.12 6.42-4.52 12.64-7.2 18.66zM119.22 33.09c0-7.39 2.66-14.41 7.98-21.05 5.32-6.64 12-10.96 20.04-12.96.11 1.07.16 2.03.16 2.89 0 7.39-2.78 14.52-8.35 21.37-5.56 6.85-12.26 11.09-20.09 12.72-.43-1.07-.64-2.03-.64-2.97z"/>
                </svg>
                <span>Apple ID</span>
              </button>
            </div>
            {authMethodFeedback && (
              <p className="text-xs text-center text-[#6ee7b7] animate-pulse">
                {authMethodFeedback}
              </p>
            )}
          </div>

          {/* Switch Active User Profile */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cambiar Socio / Sesión Activa
            </p>
            <div className="space-y-1.5">
              {PRESET_USERS.map((user) => {
                const isSelected = user.id === currentUser.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#6ee7b7]/10 border-[#6ee7b7]/40 text-white'
                        : 'bg-[#0f1115]/50 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-xs font-medium text-white block">{user.name}</span>
                        <span className="text-[11px] text-slate-400 block">{user.role}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#6ee7b7]" />
                    )}
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tus modificaciones de leads, fichas de obra y calculadora se respaldan localmente en tu navegador y se enlazan con el servidor de producción de ATHA Producciones.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
