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
import { guardarSesionCompartida } from '../utils/sesionEcosistema';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser?: UserSession | null;
  onSelectUser: (user: UserSession) => void;
  onLogout?: () => void;
  theme?: 'terracota' | 'dia';
}


export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onLogout,
  theme = 'terracota'
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMethodFeedback, setAuthMethodFeedback] = useState<string | null>(null);

  // New User Registration Form State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Artista');
  const [regEmail, setRegEmail] = useState('');
  const [regProvider, setRegProvider] = useState<'google' | 'apple' | 'email'>('google');
  // Evita el doble clic y el "botón pegado" mientras carga la librería de Google.
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  const isLight = theme === 'dia';

  if (!isOpen) return null;

  // Google bloquea el login dentro de navegadores embebidos (Telegram, Instagram,
  // Facebook...): responde disallowed_useragent y el flujo muere sin aviso.
  const estaEnWebview =
    typeof navigator !== 'undefined' &&
    /Telegram|TelegramBot|FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|MicroMessenger/i.test(navigator.userAgent);
  const urlActual = typeof window !== 'undefined' ? window.location.href : '';

  const handleGoogleLogin = async () => {
    if (estaEnWebview) {
      setAuthMethodFeedback(
        'Abrí esta página en Safari o Chrome: Google bloquea el inicio de sesión dentro de Telegram.'
      );
      setTimeout(() => setAuthMethodFeedback(null), 7000);
      return;
    }
    // Guarda contra doble clic: el botón se quedaba "pegado" sin salida.
    if (cargandoGoogle) return;
    setAuthMethodFeedback('Conectando con Google Workspace...');

    try {
      if (!window.google?.accounts?.id) {
        if (!document.getElementById('gis-script')) {
          setCargandoGoogle(true);
          const script = document.createElement('script');
          script.id = 'gis-script';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => { setCargandoGoogle(false); performGoogleLogin(); };
          // ANTES: script.onerror → setTimeout(handleGoogleLogin, 1500) en bucle
          // infinito → el cartel quedaba en "Conectando…" para siempre sin decir
          // nada. Ahora: un aviso claro y una salida.
          script.onerror = () => {
            setCargandoGoogle(false);
            setAuthMethodFeedback('Google no cargó (bloqueado o sin conexión). Probá abrir esta página en Safari o Chrome.');
          };
          document.head.appendChild(script);
          // Tope duro: si el script no responde en 8 s, se avisa y se corta.
          setTimeout(() => {
            setCargandoGoogle(false);
            if (!window.google?.accounts?.id) {
              setAuthMethodFeedback('Google no respondió. Recargá la página (Ctrl+Shift+R) o abrila en Safari/Chrome.');
            }
          }, 8000);
          return;
        }
        setAuthMethodFeedback('La librería de Google no cargó. Recargá la página (Ctrl+Shift+R).');
        return;
      }
      performGoogleLogin();
    } catch (e: any) {
      console.error('Google login error:', e);
      setCargandoGoogle(false);
      setAuthMethodFeedback('Error en la autenticación. Intentá de nuevo.');
    }
  };

  const performGoogleLogin = () => {
    try {
      const clientId = '897089213264-sg7hr4e5g269u1lirj19r349ahaheftr.apps.googleusercontent.com';

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          handleGoogleResponse(response);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // One Tap es frágil (se bloquea sin avisar si el origen no está autorizado
      // o si el navegador lo corta). Se pide, pero con red de seguridad: si en
      // 2,5 s no pasó nada, se pinta el botón REAL de Google para poder entrar.
      let respondio = false;
      const marcar = () => { respondio = true; };
      try {
        window.google.accounts.id.prompt((notification: any) => {
          marcar();
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            pintarBotonGoogle();
          }
        });
      } catch { /* One Tap no disponible */ }

      setTimeout(() => {
        if (!respondio) {
          setAuthMethodFeedback('Tocá el botón de Google para continuar.');
          pintarBotonGoogle();
        }
      }, 2500);
    } catch (e: any) {
      console.error('Google init error:', e);
      setAuthMethodFeedback('No se pudo iniciar con Google. Revisá tu conexión y reintentá.');
    }
  };

  /** Pinta el botón nativo de Google en el mismo lugar del botón propio. */
  const pintarBotonGoogle = () => {
    try {
      const cont = document.getElementById('google-btn');
      if (!cont || cont.dataset.googleListo === '1') return;
      cont.dataset.googleListo = '1';
      cont.innerHTML = '';
      window.google.accounts.id.renderButton(cont, {
        theme: 'outline', size: 'large', width: '100%', text: 'signin_with', locale: 'es',
      });
    } catch (e) {
      console.error('renderButton error:', e);
      setAuthMethodFeedback('Google bloqueó el botón. Abrí esta página en Safari o Chrome.');
    }
  };

  const handleGoogleResponse = async (response: any) => {
    if (!response?.credential) {
      setAuthMethodFeedback('Error: no se recibió token de Google');
      setTimeout(() => setAuthMethodFeedback(null), 4000);
      return;
    }

    setAuthMethodFeedback('Validando con servidor...');

    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const userEmail = payload.email;
      const userName = payload.name || payload.email;
      const userPicture = payload.picture || '';
      const userId = payload.sub;

      const userSession: UserSession = {
        id: userId,
        name: userName,
        email: userEmail,
        role: 'Sin asignar',
        avatar: userPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`,
        provider: 'google'
      };

      // El TOKEN del hub es lo que autoriza. Sin token, esta sesión no sirve para
      // llamar la API, así que no se inventa una: si el hub rechaza, se avisa.
      let token = '';
      try {
        const resp = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: response.credential })
        });

        const data = await resp.json();
        if (!resp.ok || !data?.success) {
          setAuthMethodFeedback(
            `No se pudo iniciar sesión: ${data?.error || `HTTP ${resp.status}`}`
          );
          return;
        }
        token = data.data?.token || '';
        if (data.data?.role) userSession.role = data.data.role;
        if (data.data?.role_title) userSession.roleTitle = data.data.role_title;
        setAuthMethodFeedback(data.message || `¡Sesión iniciada como ${userName}!`);
      } catch (e: any) {
        // Sin backend no hay identidad verificada: no se entra "en modo local".
        console.warn('Auth backend not available:', e);
        setAuthMethodFeedback('No se pudo contactar al CRM. Reintentá en unos segundos.');
        return;
      }

      onSelectUser(userSession);
      // Guarda la sesión Y el token en la clave COMPARTIDA del ecosistema
      // (`atha_user_session` + `atha_auth_token`): es lo que leen el Planner,
      // el Arquitecto, el Buscador y el puente del hub.
      guardarSesionCompartida(userSession, token);

      setTimeout(() => {
        setAuthMethodFeedback(null);
      }, 3000);

    } catch (e: any) {
      console.error('Token decode error:', e);
      setAuthMethodFeedback('Error al procesar la autenticación');
      setAuthMethodFeedback('No se pudo completar el inicio de sesión con Google.');
      setTimeout(() => setAuthMethodFeedback(null), 4000);
    }
  };


  /**
   * REGISTRO = SOLICITUD DE ACCESO (ya no abre sesión).
   *
   * Antes esto entraba con el rol que eligiera el usuario en el formulario, y si
   * el correo ya existía entraba directo a ESA cuenta. Ahora sólo queda anotada
   * la solicitud: para entrar hay que pasar por Google (que verifica el correo)
   * y el rol y la compañía los asigna un administrador en Administración.
   */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    setAuthMethodFeedback('Enviando solicitud...');

    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          role: regRole || 'Artista',
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        setAuthMethodFeedback(data?.error || 'No se pudo registrar la solicitud.');
        return;
      }
      setAuthMethodFeedback(data.message || 'Solicitud registrada. Un administrador te habilita.');
    } catch (err) {
      console.warn('Registro sin backend:', err);
      setAuthMethodFeedback('No se pudo contactar al CRM. Reintentá en unos segundos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border transition-colors flex flex-col max-h-[90vh] ${
          isLight
            ? 'bg-[#FAF8F6] border-stone-200 text-stone-900 shadow-stone-300/40'
            : 'bg-[#160E0D] border-[var(--border-color)] text-[#FDF5F4] shadow-black/80'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
            isLight
              ? 'bg-white border-stone-200'
              : 'bg-[#1A100F] border-[var(--border-color)]'
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
                  isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
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
              : 'bg-[#140B0A]/80 border-[var(--border-color)]'
          }`}
        >
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              authMode === 'login'
                ? isLight
                  ? 'bg-[var(--accent-terracota)] text-white shadow-sm'
                  : 'bg-[var(--accent-terracota)] text-white shadow-sm'
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
                  ? 'bg-[var(--accent-terracota)] text-white shadow-sm'
                  : 'bg-[var(--accent-terracota)] text-white shadow-sm'
                : isLight
                ? 'text-stone-600 hover:bg-stone-200/60'
                : 'text-stone-400 hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear cuenta</span>
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
                  : 'bg-[var(--bg-surface)] border-[var(--border-color)]'
              }`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className={`w-12 h-12 rounded-xl object-cover border-2 ${
                  isLight ? 'border-[var(--accent-terracota)]' : 'border-[var(--accent-terracota)]'
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
                        ? 'bg-[var(--accent-terracota)]/10 text-[var(--accent-terracota)] border-[var(--accent-terracota)]/20'
                        : 'bg-[var(--accent-terracota)]/15 text-[var(--accent-glow)] border-[var(--accent-terracota)]/30'
                    }`}
                  >
                    {currentUser.provider}
                  </span>
                </div>
                <p
                  className={`text-xs truncate mt-0.5 ${
                    isLight ? 'text-stone-600' : 'text-[var(--text-secondary)]'
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
                  ? 'bg-[var(--accent-terracota)]/10 border-[var(--accent-terracota)]/30'
                  : 'bg-[var(--accent-terracota)]/15 border-[var(--accent-terracota)]/40'
              }`}
            >
              <h3
                className={`text-sm font-bold ${
                  isLight ? 'text-[var(--accent-terracota)]' : 'text-[var(--accent-glow)]'
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
                    isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Iniciar con Cuenta Corporativa
                </p>
                <div className="space-y-2.5">
                  <button
                    id="google-btn"
                    type="button"
                    onClick={handleGoogleLogin}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-sm'
                        : 'bg-[var(--bg-surface)] hover:bg-white/10 border-[var(--border-color)] text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Iniciar sesión con Google</span>
                  </button>

                {estaEnWebview && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isLight
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <p className="text-[11px] font-semibold">
                      Google bloquea el inicio de sesión dentro de Telegram y otros navegadores integrados.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Abrí esta página en <b>Safari</b> o <b>Chrome</b>: tocá el menú <b>⋯</b> (arriba a la
                      derecha) y elegí <b>Abrir en el navegador</b>. También podés crear tu cuenta con el
                      formulario de registro de abajo.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          window.open(urlActual, '_blank');
                        } catch (e) {
                          console.warn('No se pudo abrir el navegador externo:', e);
                        }
                      }}
                      className="w-full py-2 rounded-xl text-[11px] font-semibold bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white transition-colors cursor-pointer"
                    >
                      Abrir en el navegador
                    </button>
                  </div>
                )}

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
                    isLight ? 'text-stone-600' : 'text-[var(--text-secondary)]'
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
                      ? 'bg-white border-stone-300 focus:border-[var(--accent-terracota)] text-stone-900'
                      : 'bg-[#120B0A] border-[var(--border-color)] focus:border-[var(--accent-terracota)] text-white'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-stone-600' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Rol solicitado *
                </label>
                <select
                  required
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-stone-300 focus:border-[var(--accent-terracota)] text-stone-900'
                      : 'bg-[#120B0A] border-[var(--border-color)] focus:border-[var(--accent-terracota)] text-white'
                  }`}
                >
                  <option value="Artista">Artista / Elenco</option>
                  <option value="Productor">Productor / Producción</option>
                  <option value="Gestor">Gestor / Gestión cultural</option>
                  <option value="Cliente">Cliente / Programador</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-[11px] font-semibold mb-1 ${
                      isLight ? 'text-stone-600' : 'text-[var(--text-secondary)]'
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
                        ? 'bg-white border-stone-300 focus:border-[var(--accent-terracota)] text-stone-900'
                        : 'bg-[#120B0A] border-[var(--border-color)] focus:border-[var(--accent-terracota)] text-white'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-[11px] font-semibold mb-1 ${
                      isLight ? 'text-stone-600' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Proveedor de Credencial
                  </label>
                  <select
                    value={regProvider}
                    onChange={e => setRegProvider(e.target.value as any)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                      isLight
                        ? 'bg-white border-stone-300 focus:border-[var(--accent-terracota)] text-stone-900'
                        : 'bg-[#120B0A] border-[var(--border-color)] focus:border-[var(--accent-terracota)] text-white'
                    }`}
                  >
                    <option value="google">Google Workspace</option>
                    <option value="email">F.A.S.E ID Interno</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs text-white transition-colors cursor-pointer shadow-md ${
                  isLight
                    ? 'bg-[var(--accent-terracota)] hover:bg-[#A33827]'
                    : 'bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Solicitar acceso</span>
              </button>
            </form>
          )}

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
