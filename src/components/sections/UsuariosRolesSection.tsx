/**
 * USUARIOS Y ROLES + NÓMINAS · panel de administración
 *
 * Portado y reescrito a partir de `fase-user-pannel` (el panel que Francisco
 * había hecho), pero:
 *   · conectado al HUB (no datos mock)
 *   · usando la SESIÓN del ecosistema (no un login propio)
 *   · con los roles reales del sistema
 *   · accesible sólo para admin (owner) y director
 *
 * Dos vistas:
 *   1. Usuarios  → rol, cargo, disciplina (artistas) y compañías
 *   2. Nóminas   → revisar/corregir la gente de cada compañía
 *
 * Regla: todo cambio se confirma visiblemente (sin autoguardado silencioso).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, RefreshCw, Check, ShieldAlert, Loader2, Building2, UserCog,
  Search, X, Plus, Trash2, Save, AlertTriangle, Music, Theater, Sparkles, HelpCircle,
} from 'lucide-react';
import { leerSesionCrm, cabeceraToken } from '../../utils/sesionEcosistema';

interface Rol { id: string; descripcion: string }
interface Disciplina { id: string; label: string }
interface Compania { id: string; name: string; status?: string }
interface Membresia { origen: string; company_id: string; company_name: string; rol?: string; cargo?: string; tipo?: string }
interface Usuario {
  id: string; email: string; display_name: string; role: string; role_title: string;
  artist_kind?: string | null; picture?: string; public_profile?: number;
  companias: Membresia[]; nomina: Membresia[]; puede_gestionar?: boolean;
}
interface Persona {
  id: string; full_name: string; role_title?: string; character_name?: string;
  kind?: string; email?: string; phone?: string; notes?: string;
}

const cabeceras = (): Record<string, string> => {
  const s = leerSesionCrm() as any;
  return {
    'Content-Type': 'application/json',
    'x-atha-email': String(s?.email || ''),
    ...cabeceraToken(),
  };
};

const ICONO_DISCIPLINA: Record<string, any> = {
  musico: Music, actor: Theater, bailarin: Sparkles, otro: HelpCircle,
};

export const UsuariosRolesSection: React.FC<{ theme?: any }> = () => {
  const [vista, setVista] = useState<'usuarios' | 'nominas'>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [companias, setCompanias] = useState<Compania[]>([]);
  const [rolesCompania, setRolesCompania] = useState<string[]>([]);
  const [tiposNomina, setTiposNomina] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');

  // vista nóminas
  const [companiaSel, setCompaniaSel] = useState<string>('');
  const [nomina, setNomina] = useState<{ compania?: Compania; personas: Persona[]; miembros: any[]; incompletos: number } | null>(null);
  const [cargandoNomina, setCargandoNomina] = useState(false);
  const [nuevaPersona, setNuevaPersona] = useState({ full_name: '', role_title: '', kind: 'equipo' });

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const r = await fetch('/api/v1/crm/usuarios', { headers: cabeceras() });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setUsuarios(d.usuarios || []);
      setRoles(d.roles || []);
      setDisciplinas(d.disciplinas || []);
      setCompanias(d.companias || []);
      setRolesCompania(d.roles_compania || []);
      setTiposNomina(d.tipos_nomina || []);
      if (!companiaSel && d.companias?.length) setCompaniaSel(d.companias[0].id);
    } catch (e: any) {
      setError(e.message || 'no se pudo cargar');
    } finally { setCargando(false); }
  }, [companiaSel]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarNomina = useCallback(async (id: string) => {
    if (!id) return;
    setCargandoNomina(true); setError('');
    try {
      const r = await fetch(`/api/v1/crm/companias/${id}/nomina`, { headers: cabeceras() });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setNomina(d);
    } catch (e: any) { setError(e.message); } finally { setCargandoNomina(false); }
  }, []);

  useEffect(() => { if (vista === 'nominas' && companiaSel) cargarNomina(companiaSel); }, [vista, companiaSel, cargarNomina]);

  const confirmar = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(''), 4500);
  };

  const guardarUsuario = async (u: Usuario, cambios: Partial<Usuario>) => {
    setGuardando(u.id); setError('');
    try {
      const r = await fetch(`/api/v1/crm/usuarios/${u.id}`, {
        method: 'PATCH', headers: cabeceras(), body: JSON.stringify(cambios),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...cambios } : x)));
      confirmar(`Guardado: ${u.display_name || u.email} → ${Object.entries(cambios).map(([k, v]) => `${k}: ${v ?? '—'}`).join(', ')}`);
    } catch (e: any) { setError(e.message); } finally { setGuardando(''); }
  };

  const guardarMembresia = async (u: Usuario, company_id: string, role_in_company: string) => {
    setGuardando(u.id); setError('');
    try {
      const r = await fetch(`/api/v1/crm/usuarios/${u.id}/companias`, {
        method: 'POST', headers: cabeceras(), body: JSON.stringify({ company_id, role_in_company }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      const nombre = companias.find((c) => c.id === company_id)?.name || company_id;
      setUsuarios((prev) => prev.map((x) => {
        if (x.id !== u.id) return x;
        const otras = x.companias.filter((c) => c.company_id !== company_id);
        return { ...x, companias: [...otras, { origen: 'miembro', company_id, company_name: nombre, rol: role_in_company }] };
      }));
      confirmar(`Guardado: ${u.display_name || u.email} pertenece a ${nombre} como ${role_in_company}`);
    } catch (e: any) { setError(e.message); } finally { setGuardando(''); }
  };

  const quitarMembresia = async (u: Usuario, company_id: string, nombre: string) => {
    setGuardando(u.id); setError('');
    try {
      const r = await fetch(`/api/v1/crm/usuarios/${u.id}/companias/${company_id}`, { method: 'DELETE', headers: cabeceras() });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, companias: x.companias.filter((c) => c.company_id !== company_id) } : x)));
      confirmar(`Guardado: se quitó a ${u.display_name || u.email} de ${nombre}`);
    } catch (e: any) { setError(e.message); } finally { setGuardando(''); }
  };

  const guardarPersona = async (p: Persona, cambios: Partial<Persona>) => {
    setGuardando(p.id); setError('');
    try {
      const r = await fetch(`/api/v1/crm/nomina/${p.id}`, {
        method: 'PATCH', headers: cabeceras(), body: JSON.stringify(cambios),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      confirmar(`Guardado: ${p.full_name} → ${Object.entries(cambios).map(([k, v]) => `${k}: ${v || '—'}`).join(', ')}`);
      if (companiaSel) cargarNomina(companiaSel);
    } catch (e: any) { setError(e.message); } finally { setGuardando(''); }
  };

  const agregarPersona = async () => {
    if (!nuevaPersona.full_name.trim() || !companiaSel) return;
    setGuardando('nueva'); setError('');
    try {
      const r = await fetch(`/api/v1/crm/companias/${companiaSel}/nomina`, {
        method: 'POST', headers: cabeceras(), body: JSON.stringify(nuevaPersona),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      confirmar(`Agregado: ${nuevaPersona.full_name}`);
      setNuevaPersona({ full_name: '', role_title: '', kind: 'equipo' });
      cargarNomina(companiaSel);
    } catch (e: any) { setError(e.message); } finally { setGuardando(''); }
  };

  const borrarPersona = async (p: Persona) => {
    setGuardando(p.id); setError('');
    try {
      const r = await fetch(`/api/v1/crm/nomina/${p.id}`, { method: 'DELETE', headers: cabeceras() });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      confirmar(`Eliminado de la nómina: ${p.full_name}`);
      if (companiaSel) cargarNomina(companiaSel);
    } catch (e: any) { setError(e.message); } finally { setGuardando(''); }
  };

  const filtrados = useMemo(() => usuarios.filter((u) => {
    const t = `${u.display_name || ''} ${u.email} ${u.role_title || ''}`.toLowerCase();
    return t.includes(busqueda.toLowerCase()) && (filtroRol === 'todos' || u.role === filtroRol);
  }), [usuarios, busqueda, filtroRol]);

  if (error && /administraci[oó]n|owner/i.test(error)) {
    return (
      <div className="p-6 text-sm opacity-70 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" /> Sólo el owner y dirección pueden ver y gestionar usuarios.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[var(--accent-terracota)]" /> Usuarios, roles y nóminas
          </h2>
          <p className="text-xs opacity-60 mt-1">
            Define qué puede hacer cada persona y revisa la composición de cada compañía.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[var(--border-color)] p-0.5">
            {(['usuarios', 'nominas'] as const).map((v) => (
              <button
                key={v} onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-xs rounded-lg ${vista === v ? 'bg-[var(--accent-terracota)] text-white' : 'opacity-70'}`}
              >
                {v === 'usuarios' ? 'Usuarios' : 'Nóminas'}
              </button>
            ))}
          </div>
          <button onClick={cargar} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} /> Recargar
          </button>
        </div>
      </header>

      {aviso && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <Check className="w-4 h-4" /> {aviso}
        </div>
      )}
      {error && !/administraci[oó]n|owner/i.test(error) && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {/* ---------------- USUARIOS ---------------- */}
      {vista === 'usuarios' && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {roles.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--border-color)] p-3">
                <p className="font-mono text-xs font-bold">{r.id}</p>
                <p className="text-[10px] opacity-60 mt-1 leading-snug">{r.descripcion}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, cargo o email…"
                className="w-full rounded-xl border border-[var(--border-color)] bg-transparent pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <select
              value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}
              className="rounded-xl border border-[var(--border-color)] bg-transparent px-3 py-2 text-xs"
            >
              <option value="todos">Todos los roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
            </select>
            <span className="text-xs opacity-60">{filtrados.length} de {usuarios.length} usuarios</span>
          </div>

          {cargando && !usuarios.length ? (
            <p className="flex items-center gap-2 text-sm opacity-60"><Loader2 className="w-4 h-4 animate-spin" /> Cargando usuarios…</p>
          ) : (
            <div className="space-y-2">
              {filtrados.map((u) => {
                const Icono = u.artist_kind ? (ICONO_DISCIPLINA[u.artist_kind] || HelpCircle) : null;
                return (
                  <div key={u.id} className="rounded-2xl border border-[var(--border-color)] p-3 flex flex-wrap items-center gap-3">
                    <img
                      src={u.picture || ''} alt=""
                      className="w-10 h-10 rounded-full object-cover bg-[var(--surface-card)]"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                    <div className="min-w-[190px] flex-1">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {u.display_name || '(sin nombre)'}
                        {u.role === 'admin' && <span className="rounded-md bg-[var(--accent-terracota)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-glow)]">owner</span>}
                      </p>
                      <p className="text-[11px] opacity-60 font-mono">{u.email}</p>
                      {(u.companias.length > 0 || u.nomina.length > 0) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] opacity-70">
                          <Building2 className="w-3 h-3" />
                          {[...u.companias.map((c) => `${c.company_name} (${c.rol || c.origen})`),
                            ...u.nomina.map((n) => `${n.company_name} · ${n.cargo || n.tipo || ''}`)]
                            .slice(0, 4).map((t, i) => (
                              <span key={i} className="rounded-md border border-[var(--border-color)] px-1.5 py-0.5">{t}</span>
                            ))}
                        </div>
                      )}
                    </div>

                    <label className="text-[11px] opacity-60">
                      Rol
                      <select
                        value={u.role}
                        onChange={(e) => guardarUsuario(u, { role: e.target.value })}
                        className="ml-1 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
                      >
                        {(roles.length ? roles.map((r) => r.id) : ['admin', 'director', 'productor', 'tecnico', 'artist']).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </label>

                    {u.role === 'artist' && (
                      <label className="text-[11px] opacity-60 flex items-center gap-1">
                        {Icono && <Icono className="w-3.5 h-3.5" />} Disciplina
                        <select
                          value={u.artist_kind || ''}
                          onChange={(e) => guardarUsuario(u, { artist_kind: e.target.value })}
                          className="ml-1 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
                        >
                          <option value="">(sin definir)</option>
                          {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </label>
                    )}

                    <label className="text-[11px] opacity-60">
                      Cargo
                      <input
                        defaultValue={u.role_title || ''}
                        onBlur={(e) => { if (e.target.value !== (u.role_title || '')) guardarUsuario(u, { role_title: e.target.value }); }}
                        placeholder="p. ej. Producción General"
                        className="ml-1 w-40 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
                      />
                    </label>

                    <label className="text-[11px] opacity-60 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Compañía
                      <select
                        value=""
                        onChange={(e) => {
                          const partes = e.target.value.split('|');
                          if (partes[0]) guardarMembresia(u, partes[0], partes[1]);
                        }}
                        className="ml-1 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
                      >
                        <option value="">asignar…</option>
                        {companias.flatMap((c) => rolesCompania.map((r) => (
                          <option key={`${c.id}|${r}`} value={`${c.id}|${r}`}>{c.name} · {r}</option>
                        )))}
                      </select>
                    </label>

                    {u.companias.length > 0 && (
                      <div className="flex gap-1">
                        {u.companias.map((c) => (
                          <button
                            key={c.company_id}
                            onClick={() => quitarMembresia(u, c.company_id, c.company_name)}
                            title={`Quitar de ${c.company_name}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1 text-[10px] opacity-70 hover:opacity-100"
                          >
                            <X className="w-3 h-3" /> {c.company_name}
                          </button>
                        ))}
                      </div>
                    )}

                    {guardando === u.id && <Loader2 className="w-4 h-4 animate-spin opacity-60" />}
                  </div>
                );
              })}
              {!filtrados.length && <p className="text-sm opacity-60">No hay usuarios que coincidan.</p>}
            </div>
          )}

          <p className="text-[11px] opacity-50 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Cuando un colaborador entra por primera vez con su cuenta Google aparece acá como
            <span className="font-mono mx-1">artist</span>(sin acceso a gestión). Asignale el rol,
            su cargo y su compañía; volvé a entrar con él para verificar qué datos ve.
          </p>
        </>
      )}

      {/* ---------------- NÓMINAS ---------------- */}
      {vista === 'nominas' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs opacity-70">
              Compañía
              <select
                value={companiaSel} onChange={(e) => setCompaniaSel(e.target.value)}
                className="ml-2 rounded-xl border border-[var(--border-color)] bg-transparent px-3 py-2 text-xs"
              >
                {companias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {nomina && (
              <span className="text-xs opacity-60">
                {nomina.total} personas · {nomina.miembros?.length || 0} usuarios del sistema
                {nomina.incompletos > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> {nomina.incompletos} sin cargo
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--border-color)] p-3">
            <label className="text-[11px] opacity-60">
              Nombre
              <input
                value={nuevaPersona.full_name}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, full_name: e.target.value })}
                placeholder="Nombre y apellido"
                className="ml-1 w-44 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
              />
            </label>
            <label className="text-[11px] opacity-60">
              Cargo
              <input
                value={nuevaPersona.role_title}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, role_title: e.target.value })}
                placeholder="p. ej. Elenco Principal"
                className="ml-1 w-40 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
              />
            </label>
            <label className="text-[11px] opacity-60">
              Tipo
              <select
                value={nuevaPersona.kind}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, kind: e.target.value })}
                className="ml-1 rounded-lg border border-[var(--border-color)] bg-transparent px-2 py-1 text-xs"
              >
                {(tiposNomina.length ? tiposNomina : ['socio', 'elenco', 'equipo', 'colaborador']).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <button
              onClick={agregarPersona}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-terracota)] px-3 py-2 text-xs font-semibold text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar a la nómina
            </button>
            {guardando === 'nueva' && <Loader2 className="w-4 h-4 animate-spin opacity-60" />}
          </div>

          {cargandoNomina ? (
            <p className="flex items-center gap-2 text-sm opacity-60"><Loader2 className="w-4 h-4 animate-spin" /> Cargando nómina…</p>
          ) : (
            <div className="space-y-2">
              {(nomina?.personas || []).map((p) => (
                <div key={p.id} className="rounded-2xl border border-[var(--border-color)] p-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    p.kind === 'socio' ? 'bg-[var(--accent-terracota)]/20 text-[var(--accent-glow)]'
                    : p.kind === 'elenco' ? 'bg-sky-500/20 text-sky-300'
                    : p.kind === 'equipo' ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 opacity-70'}`}>
                    {p.kind || '—'}
                  </span>
                  <input
                    defaultValue={p.full_name}
                    onBlur={(e) => { if (e.target.value !== p.full_name) guardarPersona(p, { full_name: e.target.value }); }}
                    className="min-w-[150px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-[var(--border-color)]"
                  />
                  <input
                    defaultValue={p.role_title || ''}
                    onBlur={(e) => { if (e.target.value !== (p.role_title || '')) guardarPersona(p, { role_title: e.target.value }); }}
                    placeholder="(sin cargo)"
                    className={`w-40 rounded-lg border bg-transparent px-2 py-1 text-xs hover:border-[var(--border-color)] ${
                      p.role_title ? 'border-transparent opacity-80' : 'border-amber-500/40 text-amber-300'}`}
                  />
                  <input
                    defaultValue={p.character_name || ''}
                    onBlur={(e) => { if (e.target.value !== (p.character_name || '')) guardarPersona(p, { character_name: e.target.value }); }}
                    placeholder="personaje"
                    className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs opacity-80 hover:border-[var(--border-color)]"
                  />
                  <input
                    defaultValue={p.email || ''}
                    onBlur={(e) => { if (e.target.value !== (p.email || '')) guardarPersona(p, { email: e.target.value }); }}
                    placeholder="email"
                    className="w-48 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[11px] font-mono opacity-70 hover:border-[var(--border-color)]"
                  />
                  <button
                    onClick={() => borrarPersona(p)}
                    title="Quitar de la nómina"
                    className="rounded-lg border border-[var(--border-color)] p-1.5 opacity-60 hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {guardando === p.id && <Loader2 className="w-4 h-4 animate-spin opacity-60" />}
                </div>
              ))}
              {!nomina?.personas?.length && <p className="text-sm opacity-60">Esta compañía no tiene nómina cargada.</p>}
              {nomina?.miembros?.length > 0 && (
                <p className="text-[11px] opacity-50 flex items-center gap-2 pt-2">
                  <Save className="w-3.5 h-3.5" />
                  Usuarios del sistema en esta compañía: {nomina.miembros.map((m) => `${m.display_name || m.email} (${m.role_in_company})`).join(' · ')}
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] opacity-50">
            Todo se edita en el lugar: tocá un campo, escribí y salí del campo para guardar. Cada
            cambio queda confirmado arriba ✓
          </p>
        </>
      )}
    </div>
  );
};
