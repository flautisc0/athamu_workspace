/**
 * MI PERFIL · quién soy dentro del ecosistema ATHA
 *
 * Por qué existe: al reducir las secciones del CRM se sacó "perfil" y quedó un
 * hueco — la información no estaba en ninguna parte. Esta pantalla la repone,
 * leyendo del hub y NO de localStorage: `GET /api/v1/perfil` devuelve la ficha
 * real (rol, cargo, disciplina, compañías por pertenencia y por nómina, permisos
 * y preferencias), que es exactamente el mismo contrato que va a consumir la app
 * FASE (capa 3) cuando muestre el perfil en el celular.
 *
 * Es de SÓLO LECTURA a propósito: el rol y la compañía los asigna administración
 * desde el Panel de Usuarios; acá sólo se ven.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  User, Mail, BadgeCheck, Building2, ShieldCheck, RefreshCw, Loader2,
  Theater, Music, Sparkles, HelpCircle, AlertTriangle, Fingerprint,
} from 'lucide-react';
import { cabeceraToken } from '../../utils/sesionEcosistema';

interface Perfil {
  usuario: {
    id: string; email: string; nombre: string; foto?: string | null;
    rol: string; cargo?: string | null; disciplina?: string | null;
    telefono?: string | null; bio?: string | null; proveedor?: string | null;
  };
  companias: Array<{ company_id: string; nombre: string; rol?: string; cargo?: string; tipo?: string; origen: string }>;
  preferencias?: any;
  permisos: {
    administracion: boolean; inventario_total: boolean;
    inventario_companias?: string[]; puede_escribir_inventario: boolean; motivo?: string;
  };
}

const NOMBRE_ROL: Record<string, string> = {
  admin: 'Owner / Administración',
  director: 'Dirección',
  productor: 'Producción',
  tecnico: 'Técnica',
  artist: 'Artista / Elenco',
  explorador: 'Explorador (sin rol asignado)',
};

const ICONO_DISCIPLINA: Record<string, any> = {
  musico: Music, actor: Theater, bailarin: Sparkles, otro: HelpCircle,
};

export const MiPerfilSection: React.FC<{ theme?: any }> = () => {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/v1/perfil', { headers: { ...cabeceraToken() } });
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error(d?.error || `HTTP ${r.status}`);
      setPerfil(d as Perfil);
    } catch (e: any) {
      setError(e.message || 'No se pudo leer tu perfil');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin opacity-60" />
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--surface-card,#161920)] p-7 text-center">
          <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-amber-400" />
          <h2 className="text-lg font-bold">No se pudo leer tu perfil</h2>
          <p className="mt-2 text-sm opacity-70">{error || 'Sin datos'}</p>
          <p className="mt-3 text-xs opacity-50">
            Si el problema sigue, cerrá sesión y volvé a entrar con Google.
          </p>
          <button
            onClick={cargar}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-terracota,#E05A47)] px-4 py-2.5 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { usuario: u, companias, permisos } = perfil;
  const IconoDisc = u.disciplina ? ICONO_DISCIPLINA[u.disciplina] || HelpCircle : null;

  const Dato = ({ icono: I, label, valor }: any) => (
    <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 p-3.5">
      <I className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50">{label}</p>
        <p className="truncate text-sm font-medium">{valor || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">

        {/* Identidad */}
        <div className="rounded-3xl border border-white/10 bg-[var(--surface-card,#161920)] p-6">
          <div className="flex items-center gap-4">
            {u.foto ? (
              <img src={u.foto} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-terracota,#E05A47)]/15">
                <User className="h-7 w-7 text-[var(--accent-terracota,#E05A47)]" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{u.nombre || u.email}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs opacity-70">
                <Mail className="h-3.5 w-3.5" /> {u.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-terracota,#E05A47)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--accent-terracota,#E05A47)]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {NOMBRE_ROL[u.rol] || u.rol}
                </span>
                {u.cargo && (
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] opacity-80">
                    {u.cargo}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={cargar}
              title="Releer del hub"
              className="ml-auto rounded-xl border border-white/10 p-2 opacity-60 transition-opacity hover:opacity-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Ficha */}
        <div className="rounded-3xl border border-white/10 bg-[var(--surface-card,#161920)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Fingerprint className="h-4 w-4 opacity-60" /> Ficha
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Dato icono={ShieldCheck} label="Rol en el ecosistema" valor={NOMBRE_ROL[u.rol] || u.rol} />
            <Dato icono={BadgeCheck} label="Cargo" valor={u.cargo} />
            {IconoDisc && <Dato icono={IconoDisc} label="Disciplina" valor={u.disciplina} />}
            <Dato icono={User} label="Teléfono" valor={u.telefono} />
            <Dato icono={Fingerprint} label="Acceso" valor={u.proveedor === 'google' ? 'Google' : (u.proveedor || '—')} />
            <Dato icono={Fingerprint} label="ID" valor={u.id?.slice(0, 8)} />
          </div>
          {u.bio && <p className="mt-4 text-xs leading-relaxed opacity-70">{u.bio}</p>}
          <p className="mt-4 border-t border-white/5 pt-3 text-[11px] opacity-50">
            El rol, el cargo y las compañías los asigna administración (Panel de Usuarios). Esta ficha es
            de sólo lectura y es la misma que va a mostrar la app FASE en el celular.
          </p>
        </div>

        {/* Compañías */}
        <div className="rounded-3xl border border-white/10 bg-[var(--surface-card,#161920)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Building2 className="h-4 w-4 opacity-60" /> Compañías
          </h2>
          {companias.length === 0 ? (
            <p className="text-xs opacity-60">
              Todavía no pertenecés a ninguna compañía. Aparecés por <b>pertenencia</b> (miembro del
              equipo) o por <b>nómina</b> (vinculado por tu correo).
            </p>
          ) : (
            <ul className="space-y-2.5">
              {companias.map((c, i) => (
                <li key={`${c.company_id}-${i}`} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-black/20 p-3.5">
                  <Building2 className="h-4 w-4 opacity-50" />
                  <span className="text-sm font-medium">{c.nombre}</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-70">
                    {c.origen}{c.rol ? ` · ${c.rol}` : ''}{c.cargo ? ` · ${c.cargo}` : ''}{c.tipo ? ` · ${c.tipo}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Permisos */}
        <div className="rounded-3xl border border-white/10 bg-[var(--surface-card,#161920)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 opacity-60" /> Permisos
          </h2>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className={permisos.administracion ? 'text-emerald-400' : 'opacity-40'}>
                {permisos.administracion ? '✓' : '·'}
              </span>
              Administración (usuarios, roles, compañías, nóminas)
            </li>
            <li className="flex items-center gap-2">
              <span className={permisos.inventario_total ? 'text-emerald-400' : 'opacity-40'}>
                {permisos.inventario_total ? '✓' : '·'}
              </span>
              Inventario de todas las compañías
            </li>
            <li className="flex items-center gap-2">
              <span className={permisos.puede_escribir_inventario ? 'text-emerald-400' : 'opacity-40'}>
                {permisos.puede_escribir_inventario ? '✓' : '·'}
              </span>
              Editar inventario
              {!permisos.inventario_total && permisos.inventario_companias?.length
                ? ` (${permisos.inventario_companias.length} compañía/s)`
                : ''}
            </li>
          </ul>
          {permisos.motivo && <p className="mt-3 text-[11px] opacity-50">{permisos.motivo}</p>}
        </div>

      </div>
    </div>
  );
};

export default MiPerfilSection;
