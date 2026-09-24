import React, { useEffect, useRef, useState } from 'react';
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

  const isLight = theme === 'dia';

  // Google bloquea el login dentro de navegadores embebidos (Telegram, Instagram,
  // Facebook...): responde disallowed_useragent y el flujo muere sin aviso.
  const estaEnWebview =
    typeof navigator !== 'undefined' &&
    /Telegram|TelegramBot|FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|MicroMessenger/i.test(navigator.userAgent);
  const urlActual = typeof window !== 'undefined' ? window.location.href : '';

  // --- Botón de Google: se pinta NATIVO (patrón estándar de GIS) ---------------
  // Antes se pintaba el botón de Google DENTRO de un <button> propio: anidar el
  // iframe de Google dentro de un botón es HTML inválido y el clic no llegaba
  // ("el botón no acciona"). Ahora Google pinta su botón en su propio contenedor.
  const [estadoGoogle, setEstadoGoogle] = useState<'cargando' | 'listo' | 'fallo'>('cargando');
  const contenedorGoogle = useRef<HTMLDivElement | null>(null);
  const googleIniciado = useRef(false);

  /**
   * CARGA Y PINTADO DEL BOTÓN DE GOOGLE (GIS).
   *
   * ANTES: se pintaba el botón de Google DENTRO del <button> propio (#google-btn).
   * Anidar el iframe de Google dentro de un botón es HTML inválido: el navegador
   * no entrega bien el clic → "el botón no acciona". Y dependía de One Tap
   * (`prompt()`), que se bloquea en silencio sin decir por qué.
   *
   * AHORA: GIS se carga una vez, se inicializa UNA vez (repetirlo hace que Google
   * avise y use solo la última) y Google pinta su propio botón en su contenedor.
   * Sin One Tap, sin anidado, y con aviso visible si no carga.
   */
  useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    const clientId = '897089213264-sg7hr4e5g269u1lirj19r349ahaheftr.apps.googleusercontent.com';

    const pintar = () => {
      if (!vivo || !contenedorGoogle.current || !window.google?.accounts?.id) return;
      try {
        if (!googleIniciado.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (r: any) => handleGoogleResponse(r),
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          googleIniciado.current = true;
        }
        window.google.accounts.id.renderButton(contenedorGoogle.current, {
          type: 'standard',
          theme: isLight ? 'outline' : 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          locale: 'es',
          // GIS RECHAZA '100%' ("Provided button width is invalid"): pide píxeles.
          width: 300,
        });
        setEstadoGoogle('listo');
      } catch (e) {
        console.error('GIS renderButton:', e);
        setEstadoGoogle('fallo');
      }
    };

    if (estaEnWebview) { setEstadoGoogle('fallo'); return () => { vivo = false; }; }
    if (window.google?.accounts?.id) { pintar(); return () => { vivo = false; }; }

    const previo = document.getElementById('gis-script') as HTMLScriptElement | null;
    if (previo) {
      previo.addEventListener('load', pintar, { once: true });
      const t = setTimeout(pintar, 1200);
      return () => { vivo = false; clearTimeout(t); };
    }

    const s = document.createElement('script');
    s.id = 'gis-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = pintar;
    s.onerror = () => { if (vivo) setEstadoGoogle('fallo'); };
    document.head.appendChild(s);
    // Tope: si en 10 s no cargó, se avisa en pantalla en vez de esperar siempre.
    const tope = setTimeout(() => {
      if (vivo && !window.google?.accounts?.id) setEstadoGoogle('fallo');
    }, 10000);
    return () => { vivo = false; clearTimeout(tope); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLight, estaEnWebview]);

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

  // OJO: el corte va ACÁ, después de todos los hooks y handlers. Antes estaba más
  // arriba y el useEffect del botón de Google quedaba detrás de un return.
  if (!isOpen) return null;

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
                  {/* Contenedor PROPIO para el botón de Google: GIS pinta su botón acá.
                      No se envuelve en un <button> propio (eso rompía el clic). */}
                  <div className="w-full flex justify-center min-h-[44px]">
                    <div id="google-btn" ref={contenedorGoogle} className="w-full flex justify-center" />
                  </div>

                  {estadoGoogle === 'cargando' && (
                    <p className={`text-[11px] text-center ${isLight ? 'text-stone-500' : 'text-[var(--text-secondary)]'}`}>
                      Cargando el botón de Google…
                    </p>
                  )}

                  {estadoGoogle === 'fallo' && (
                    <div
                      className={`p-3.5 rounded-xl border space-y-2 text-[11px] leading-relaxed ${
                        isLight
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <p className="font-semibold">No se pudo cargar el botón de Google.</p>
                      <p>
                        Suele ser el navegador bloqueando la librería. Probá recargar la página
                        (<b>Ctrl+Shift+R</b>) o abrirla en <b>Safari</b> o <b>Chrome</b>. Mientras tanto
                        podés pedir acceso con el formulario de abajo.
                      </p>
                    </div>
                  )}

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
