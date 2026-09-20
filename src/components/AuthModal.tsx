import React, { useState } from 'react';
import { UserSession } from '../types';
import {
  X,
  CheckCircle2,
  RefreshCw,
  LogIn,
  Check,
  LogOut,
  UserPlus,
  Shield,
  Sparkles,
  Users
} from 'lucide-react';
import { FaseLogo } from './FaseLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser?: UserSession | null;
  onSelectUser: (user: UserSession) => void;
  onLogout?: () => void;
  onSyncCloud?: () => void;
  isSyncing?: boolean;
  theme?: 'terracota' | 'dia';
}

const PRESET_USERS: UserSession[] = [
  {
    id: 'user-01',
    name: 'Francisco Pérez',
    email: 'panxo.sms@gmail.com',
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
  onLogout,
  onSyncCloud,
  isSyncing,
  theme = 'terracota'
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMethodFeedback, setAuthMethodFeedback] = useState<string | null>(null);

  // New User Registration Form State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regProvider, setRegProvider] = useState<'google' | 'apple' | 'email'>('google');

  const isLight = theme === 'dia';

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    setAuthMethodFeedback('Autenticando con Google Workspace...');
    const googleUser = PRESET_USERS.find(u => u.provider === 'google') || PRESET_USERS[0];

    setTimeout(() => {
      onSelectUser(googleUser);
      try {
        localStorage.setItem('user_session', JSON.stringify(googleUser));
        window.dispatchEvent(new Event('user_session_updated'));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
      setAuthMethodFeedback(`¡Sesión iniciada como ${googleUser.name}!`);
      setTimeout(() => {
        setAuthMethodFeedback(null);
        onClose?.();
      }, 900);
    }, 400);
  };

  const handleAppleLogin = () => {
    setAuthMethodFeedback('Autenticando con Apple ID...');
    const appleUser = PRESET_USERS.find(u => u.provider === 'apple') || PRESET_USERS[1];

    setTimeout(() => {
      onSelectUser(appleUser);
      try {
        localStorage.setItem('user_session', JSON.stringify(appleUser));
        window.dispatchEvent(new Event('user_session_updated'));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
      setAuthMethodFeedback(`¡Sesión iniciada con Apple ID como ${appleUser.name}!`);
      setTimeout(() => {
        setAuthMethodFeedback(null);
        onClose?.();
      }, 900);
    }, 400);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    const defaultAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80'
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const newUser: UserSession = {
      id: `user-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole.trim() || 'Socio Productor',
      avatar: randomAvatar,
      provider: regProvider
    };

    setAuthMethodFeedback(`¡Registro exitoso! Bienvenido ${newUser.name}...`);

    setTimeout(() => {
      onSelectUser(newUser);
      try {
        localStorage.setItem('user_session', JSON.stringify(newUser));
        window.dispatchEvent(new Event('user_session_updated'));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
      setTimeout(() => {
        setAuthMethodFeedback(null);
        onClose?.();
      }, 800);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border transition-colors flex flex-col max-h-[90vh] ${
          isLight
            ? 'bg-[#FAF8F6] border-stone-200 text-stone-900 shadow-stone-300/40'
            : 'bg-[#160E0D] border-[#3E221E] text-[#FDF5F4] shadow-black/80'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
            isLight
              ? 'bg-white border-stone-200'
              : 'bg-[#1A100F] border-[#3E221E]'
          }`}
        >
          <div className="flex items-center gap-3">
            <FaseLogo variant="symbol" size="xs" />
            <div>
              <h2 className="text-base font-bold leading-tight">
                {currentUser ? 'Gestión de Sesión & Cuentas' : 'Acceso al Dashboard F.A.S.E'}
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                }`}
              >
                ATHA Producciones • Panel de Dirección y Control
              </p>
            </div>
          </div>

          {onClose && currentUser && (
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight
                  ? 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Auth Mode Toggle Tabs (Login vs Registro) */}
        <div
          className={`flex items-center px-6 pt-3 pb-2 border-b gap-2 ${
            isLight
              ? 'bg-stone-50/70 border-stone-200'
              : 'bg-[#140B0A]/80 border-[#3E221E]'
          }`}
        >
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              authMode === 'login'
                ? isLight
                  ? 'bg-[#C84835] text-white shadow-sm'
                  : 'bg-[#E05A47] text-white shadow-sm'
                : isLight
                ? 'text-stone-600 hover:bg-stone-200/60'
                : 'text-stone-400 hover:bg-white/5'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              authMode === 'register'
                ? isLight
                  ? 'bg-[#C84835] text-white shadow-sm'
                  : 'bg-[#E05A47] text-white shadow-sm'
                : isLight
                ? 'text-stone-600 hover:bg-stone-200/60'
                : 'text-stone-400 hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registrar Nuevo Socio</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">

          {/* Feedback Alert */}
          {authMethodFeedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-in fade-in duration-150 ${
                isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              }`}
            >
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{authMethodFeedback}</span>
            </div>
          )}

          {/* Active User Banner or Login Required Notice */}
          {currentUser ? (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                isLight
                  ? 'bg-white border-stone-200'
                  : 'bg-[#1E110F] border-[#3E221E]'
              }`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className={`w-12 h-12 rounded-xl object-cover border-2 ${
                  isLight ? 'border-[#C84835]' : 'border-[#E05A47]'
                }`}
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-sm font-bold truncate ${
                      isLight ? 'text-stone-900' : 'text-white'
                    }`}
                  >
                    {currentUser.name}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                      isLight
                        ? 'bg-[#C84835]/10 text-[#C84835] border-[#C84835]/20'
                        : 'bg-[#E05A47]/15 text-[#FF6B4A] border-[#E05A47]/30'
                    }`}
                  >
                    {currentUser.provider}
                  </span>
                </div>
                <p
                  className={`text-xs truncate mt-0.5 ${
                    isLight ? 'text-stone-600' : 'text-[#D4B2AD]'
                  }`}
                >
                  {currentUser.role}
                </p>
                <p
                  className={`text-[11px] font-mono mt-0.5 ${
                    isLight ? 'text-stone-400' : 'text-stone-400'
                  }`}
                >
                  {currentUser.email}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`p-4 rounded-xl border text-center space-y-1.5 ${
                isLight
                  ? 'bg-[#C84835]/10 border-[#C84835]/30'
                  : 'bg-[#E05A47]/15 border-[#E05A47]/40'
              }`}
            >
              <h3
                className={`text-sm font-bold ${
                  isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'
                }`}
              >
                Acceso Protegido F.A.S.E / ATHA
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isLight ? 'text-stone-700' : 'text-stone-300'
                }`}
              >
                Inicia sesión o registra un nuevo socio para acceder a los proyectos, leads y finanzas del CRM.
              </p>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {authMode === 'login' && (
            <div className="space-y-4">
              {/* Corporate Social Sign In */}
              <div className="space-y-2">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                  }`}
                >
                  Iniciar con Cuenta Corporativa
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-sm'
                        : 'bg-[#1E110F] hover:bg-white/10 border-[#3E221E] text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Google Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAppleLogin}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-sm'
                        : 'bg-[#1E110F] hover:bg-white/10 border-[#3E221E] text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.86c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.81 1.45-.6.7-1.13 1.83-.99 2.94 1.07.08 2.15-.47 2.81-1.29z"/>
                    </svg>
                    <span>Apple ID</span>
                  </button>
                </div>
              </div>

              {/* Direct Preset Team Profiles */}
              <div className="space-y-2">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                  }`}
                >
                  O Seleccionar Perfil de Socio Fundador
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_USERS.map(user => {
                    const isSelected = currentUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(user);
                          try {
                            localStorage.setItem('user_session', JSON.stringify(user));
                            window.dispatchEvent(new Event('user_session_updated'));
                          } catch (e) {}
                          onClose?.();
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-[#C84835]/10 border-[#C84835] shadow-sm'
                              : 'bg-[#E05A47]/20 border-[#E05A47] shadow-sm'
                            : isLight
                            ? 'bg-white hover:bg-stone-50 border-stone-200'
                            : 'bg-[#1E110F] hover:bg-white/5 border-[#3E221E]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-lg object-cover border border-black/10 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span
                              className={`text-xs font-semibold block truncate ${
                                isLight ? 'text-stone-900' : 'text-white'
                              }`}
                            >
                              {user.name}
                            </span>
                            <span
                              className={`text-[10px] block truncate ${
                                isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                              }`}
                            >
                              {user.role}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label
                  className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-stone-600' : 'text-[#D4B2AD]'
                  }`}
                >
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Ej: Carmen Gloria Larenas"
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-stone-300 focus:border-[#C84835] text-stone-900'
                      : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-stone-600' : 'text-[#D4B2AD]'
                  }`}
                >
                  Cargo o Rol en ATHA / F.A.S.E *
                </label>
                <input
                  type="text"
                  required
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  placeholder="Ej: Productora de Campo, Iluminador, Dramaturgo..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-stone-300 focus:border-[#C84835] text-stone-900'
                      : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-[11px] font-semibold mb-1 ${
                      isLight ? 'text-stone-600' : 'text-[#D4B2AD]'
                    }`}
                  >
                    Correo Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="usuario@athaproducciones.cl"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                      isLight
                        ? 'bg-white border-stone-300 focus:border-[#C84835] text-stone-900'
                        : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-[11px] font-semibold mb-1 ${
                      isLight ? 'text-stone-600' : 'text-[#D4B2AD]'
                    }`}
                  >
                    Proveedor de Credencial
                  </label>
                  <select
                    value={regProvider}
                    onChange={e => setRegProvider(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                      isLight
                        ? 'bg-white border-stone-300 focus:border-[#C84835] text-stone-900'
                        : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                    }`}
                  >
                    <option value="google">Google Workspace</option>
                    <option value="apple">Apple ID</option>
                    <option value="email">F.A.S.E ID Interno</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs text-white transition-colors cursor-pointer shadow-md ${
                  isLight
                    ? 'bg-[#C84835] hover:bg-[#A33827]'
                    : 'bg-[#E05A47] hover:bg-[#FF6B4A]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar Socio & Entrar al Dashboard</span>
              </button>
            </form>
          )}

          {/* Cloud Sync Status */}
          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              isLight
                ? 'bg-white border-stone-200'
                : 'bg-[#1E110F] border-[#3E221E]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sincronización F.A.S.E Cloud</span>
              </span>
              {onSyncCloud && (
                <button
                  type="button"
                  onClick={onSyncCloud}
                  disabled={isSyncing}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? 'bg-[#C84835] hover:bg-[#A33827]'
                      : 'bg-[#E05A47] hover:bg-[#FF6B4A]'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
              )}
            </div>
            <p
              className={`text-[11px] leading-relaxed ${
                isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
              }`}
            >
              Tus proyectos, leads, fichas de obra y configuraciones quedan respaldadas y asociadas al socio activo.
            </p>
          </div>

          {/* Logout Button if Logged In */}
          {currentUser && onLogout && (
            <div className="pt-2 border-t border-black/10 dark:border-white/5">
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión (Proteger Dashboard)</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
