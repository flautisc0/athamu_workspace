import React, { useEffect, useState } from 'react';
import { Obra } from '../types';
import { formatCLP } from '../utils/storage';
import {
  X, Download, Printer, Award, Users, Sliders, DollarSign, Calendar, Layers,
  Upload, Link2, Trash2, Save, Music, CalendarClock, ShoppingCart, Image as ImageIcon, Pencil, Plus,
} from 'lucide-react';
import { FaseLogo } from './FaseLogo';
import { leerSesionCrm, leerTokenCrm, urlConSesion } from '../utils/sesionEcosistema';

/* Apps aparte del ecosistema (les pasamos la sesión y la obra). */
const PLANNER_URL = 'https://planner-frontend-897089213264.us-central1.run.app';
const ARQUITECTO_URL = 'https://artha-arquitecto-897089213264.us-central1.run.app';

const TIPOS_ARCHIVO = [
  { id: 'dossier', etiqueta: 'Dossier (PDF)' },
  { id: 'rider', etiqueta: 'Ficha técnica / Rider' },
  { id: 'prensa', etiqueta: 'Prensa' },
  { id: 'foto', etiqueta: 'Foto' },
  { id: 'video', etiqueta: 'Video (enlace)' },
  { id: 'otro', etiqueta: 'Otro' },
];

const iconoArchivo = (tipo: string) =>
  tipo === 'dossier' ? '📄' : tipo === 'rider' ? '🛠' : tipo === 'prensa' ? '🗞'
    : tipo === 'foto' ? '🖼' : tipo === 'video' ? '▶' : '📎';

const peso = (bytes: number) =>
  !bytes ? '' : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

interface DossierModalProps {
  obra: Obra;
  onClose: () => void;
  /** Se llama después de guardar, para que el catálogo se vuelva a leer. */
  onActualizada?: () => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({ obra, onClose, onActualizada }) => {
  const [modo, setModo] = useState<'ficha' | 'dossier'>('ficha');
  const [archivos, setArchivos] = useState<any[]>(Array.isArray((obra as any).files) ? (obra as any).files : []);
  const [aviso, setAviso] = useState<{ t: string; tipo: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<any>({});
  const [enlace, setEnlace] = useState({ tipo: 'prensa', nombre: '', url: '' });

  const email = leerSesionCrm()?.email || '';
  const ficha = ((obra as any).ficha || {}) as any;
  const logo = (obra as any).logoUrl || '';
  const compania = (obra as any).companyName || '';
  const dossier = (obra as any).dossierUrl || (obra as any).dossierPdf || '';
  const fotos = archivos.filter((a) => a.tipo === 'foto');

  const avisar = (t: string, tipo = 'ok') => setAviso({ t, tipo });

  /** Identidad para el hub: cabecera con la sesión (el correo en el body es el del integrante). */
  const cabeceraAuth = (): Record<string, string> => {
    const h: Record<string, string> = {};
    const s = leerSesionCrm();
    if (s?.email) h['x-atha-email'] = s.email;
    const t = leerTokenCrm();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  };

  const pedir = (url: string, metodo: string, cuerpo?: any) =>
    fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...cabeceraAuth() },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    }).then((r) => r.json());

  /* ---------------------------------------------------------------------------
     ELENCO DE LA OBRA (Tanda B) · cuentas de la plataforma y roles por obra

     Todo integrante sale de la nómina de una compañía REGISTRADA: nunca se escriben
     nombres sueltos. Dirección o producción de esa compañía inscribe y designa el
     rol (dirección / elenco / equipo / producción); si el correo ya tiene cuenta en
     la plataforma, la fila se vincula sola; si no, se le invita por correo.
     --------------------------------------------------------------------------- */
  const [elenco, setElenco] = useState<any[]>(Array.isArray((obra as any).cast) ? (obra as any).cast : []);
  const [companias, setCompanias] = useState<any[]>([]);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [companiaSel, setCompaniaSel] = useState<string>('');
  const [otraCompania, setOtraCompania] = useState(false);
  const [marcados, setMarcados] = useState<Record<string, { rol: string; personaje: string }>>({});

  const cargarElenco = () => {
    fetch(`/api/v1/crm/portfolio/projects/${obra.id}/cast`, { headers: cabeceraAuth() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.ok !== false && Array.isArray(d.cast)) setElenco(d.cast); })
      .catch(() => { /* se queda con lo que trajo el catálogo */ });
  };

  const cargarCompanias = () => {
    fetch('/api/v1/crm/companies')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const lista = (d && d.companies) || [];
        setCompanias(lista);
        const propia = lista.find((c: any) => c.id === (obra as any).companyId);
        setCompaniaSel((prev: string) => prev || (propia ? propia.id : (lista[0] ? lista[0].id : '')));
      })
      .catch(() => {});
  };

  useEffect(() => { cargarElenco(); cargarCompanias(); }, [obra.id]);

  const nominaVisible = (): any[] => {
    const c = companias.find((x) => x.id === companiaSel);
    return (c && c.people) || [];
  };

  const inscribirElenco = () => {
    const elegidos = Object.keys(marcados);
    if (!elegidos.length) { avisar('Marca al menos un integrante de la nómina.', 'malo'); return; }
    const c = companias.find((x) => x.id === companiaSel) || {};
    const esDeOtra = otraCompania || (c.id && c.id !== (obra as any).companyId);
    setOcupado(true);
    Promise.all(elegidos.map((nombre) => {
      const persona: any = ((c.people || []) as any[]).find((p) => p.fullName === nombre) || {};
      return pedir(`/api/v1/crm/portfolio/projects/${obra.id}/cast`, 'POST', {
        displayName: nombre,
        email: persona.email || '',
        role: marcados[nombre].rol,
        personaje: marcados[nombre].personaje,
        desdeCompaniaId: esDeOtra ? companiaSel : undefined,
      }).then((d) => {
        if (!d || d.ok === false) throw new Error((d && d.error) || 'no se pudo inscribir');
        return d;
      });
    }))
      .then(() => {
        avisar(`${elegidos.length} integrante(s) inscritos ✓`);
        setMarcados({});
        setInscribiendo(false);
        cargarElenco();
        if (onActualizada) onActualizada();
      })
      .catch((e) => avisar('No se pudo inscribir: ' + e.message, 'malo'))
      .finally(() => setOcupado(false));
  };

  const cambiarRol = (castId: string, rol: string) => {
    pedir(`/api/v1/crm/portfolio/projects/${obra.id}/cast/${castId}`, 'PUT', { role: rol })
      .then((d) => {
        if (!d || d.ok === false) throw new Error((d && d.error) || 'no se pudo cambiar el rol');
        avisar('Rol actualizado ✓');
        cargarElenco();
      })
      .catch((e) => avisar('No se pudo cambiar el rol: ' + e.message, 'malo'));
  };

  const quitarDelElenco = (castId: string) => {
    pedir(`/api/v1/crm/portfolio/projects/${obra.id}/cast/${castId}`, 'DELETE')
      .then((d) => {
        if (!d || d.ok === false) throw new Error((d && d.error) || 'no se pudo quitar');
        avisar('Integrante quitado de la obra ✓');
        cargarElenco();
        if (onActualizada) onActualizada();
      })
      .catch((e) => avisar('No se pudo quitar: ' + e.message, 'malo'));
  };

  const invitar = (castId: string) => {
    pedir(`/api/v1/crm/portfolio/projects/${obra.id}/cast/${castId}/invitar`, 'POST', {})
      .then((d) => {
        if (!d || d.ok === false) throw new Error((d && d.error) || 'no se pudo invitar');
        avisar('Invitación enviada ✓ (le llega el enlace para entrar con su rol en esta obra)');
        cargarElenco();
      })
      .catch((e) => avisar('No se pudo invitar: ' + e.message, 'malo'));
  };

  const cargarArchivos = () => {
    fetch(`/api/v1/crm/portfolio/projects/${obra.id}/files`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.ok) setArchivos(d.files || []); })
      .catch(() => { /* el catálogo ya trae los archivos */ });
  };
  useEffect(() => { cargarArchivos(); }, [obra.id]);

  const handlePrint = () => window.print();

  /* ------------------------------- archivos ------------------------------- */

  const subirArchivo = (file: File | undefined, tipo: string) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { avisar('El archivo pasa de 15 MB. Para archivos más pesados, usa un enlace.', 'malo'); return; }
    setOcupado(true);
    const lector = new FileReader();
    lector.onload = () => {
      pedir('/api/v1/crm/archivo', 'POST', { nombre: file.name, dataUrl: lector.result, carpeta: 'obras', email })
        .then((d) => {
          if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo subir el archivo');
          return pedir(`/api/v1/crm/portfolio/projects/${obra.id}/files`, 'POST',
            { tipo, nombre: file.name, url: d.url, mime: d.mime, bytes: d.bytes, email });
        })
        .then((d) => {
          if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo registrar el archivo');
          avisar('Archivo cargado ✓');
          cargarArchivos();
          if (onActualizada) onActualizada();
        })
        .catch((e) => avisar('No se pudo subir: ' + e.message, 'malo'))
        .finally(() => setOcupado(false));
    };
    lector.onerror = () => { setOcupado(false); avisar('No se pudo leer el archivo.', 'malo'); };
    lector.readAsDataURL(file);
  };

  const agregarEnlace = () => {
    if (!enlace.url.trim() || !enlace.nombre.trim()) { avisar('Completa el nombre y la dirección del enlace.', 'malo'); return; }
    setOcupado(true);
    pedir(`/api/v1/crm/portfolio/projects/${obra.id}/files`, 'POST',
      { tipo: enlace.tipo, nombre: enlace.nombre.trim(), url: enlace.url.trim(), email })
      .then((d) => {
        if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo agregar');
        setEnlace({ tipo: 'prensa', nombre: '', url: '' });
        avisar('Enlace agregado ✓');
        cargarArchivos();
        if (onActualizada) onActualizada();
      })
      .catch((e) => avisar('No se pudo agregar: ' + e.message, 'malo'))
      .finally(() => setOcupado(false));
  };

  const borrarArchivo = (id: string) => {
    pedir(`/api/v1/crm/files/${id}?email=${encodeURIComponent(email)}`, 'DELETE')
      .then((d) => {
        if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo borrar');
        avisar('Archivo quitado de la obra ✓');
        cargarArchivos();
        if (onActualizada) onActualizada();
      })
      .catch((e) => avisar('No se pudo borrar: ' + e.message, 'malo'));
  };

  /* -------------------------------- ficha -------------------------------- */

  const abrirEdicion = () => {
    setBorrador({
      title: obra.title || '',
      synopsis: (obra as any).synopsis || '',
      duration: (obra as any).duration || '',
      targetAudience: (obra as any).targetAudience || '',
      format: (obra as any).format || '',
      status: (obra as any).status || '',
      premiereDate: (obra as any).premiereDate || '',
      category: (obra as any).category || 'teatro',
      isPublic: (obra as any).isPublic !== 0 && (obra as any).is_public !== 0,
      musica: {
        formato: ficha.musica?.formato || 'envasada',
        musicos: ficha.musica?.musicos || '',
        instrumentos: ficha.musica?.instrumentos || '',
      },
    });
    setEditando(true);
  };

  const guardarFicha = () => {
    if (!String(borrador.title || '').trim()) { avisar('El título no puede quedar vacío.', 'malo'); return; }
    setOcupado(true);
    pedir(`/api/v1/crm/portfolio/projects/${obra.id}/ficha`, 'PUT', { ...borrador, email })
      .then((d) => {
        if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo guardar');
        avisar('Ficha guardada ✓');
        setEditando(false);
        if (onActualizada) onActualizada();
      })
      .catch((e) => avisar('No se pudo guardar: ' + e.message, 'malo'))
      .finally(() => setOcupado(false));
  };

  const ponerPortada = (url: string) => {
    setOcupado(true);
    pedir(`/api/v1/crm/portfolio/projects/${obra.id}/ficha`, 'PUT', { imageUrl: url, email })
      .then((d) => {
        if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo cambiar la portada');
        avisar('Portada cambiada ✓');
        if (onActualizada) onActualizada();
      })
      .catch((e) => avisar('No se pudo cambiar la portada: ' + e.message, 'malo'))
      .finally(() => setOcupado(false));
  };

  /* -------------------------------- cruces -------------------------------- */
  const irAVentas = () => { window.location.href = `/?ir=ventas&obra=${encodeURIComponent(obra.id)}`; };
  const irAPlanner = () => window.open(urlConSesion('planner', PLANNER_URL, { obra: obra.id }), '_blank', 'noopener');
  const irAArquitecto = () => window.open(urlConSesion('arquitecto', ARQUITECTO_URL, { obra: obra.id }), '_blank', 'noopener');

  const campo = `w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)]`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 my-auto">

        {/* Barra superior */}
        <div className="no-print flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModo('ficha')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                modo === 'ficha'
                  ? 'bg-[var(--accent-terracota)]/20 border-[var(--accent-terracota)]/50 text-white'
                  : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              Ficha & archivos
            </button>
            <button
              onClick={() => setModo('dossier')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                modo === 'dossier'
                  ? 'bg-[var(--accent-terracota)]/20 border-[var(--accent-terracota)]/50 text-white'
                  : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              Dossier imprimible
            </button>
          </div>

          <div className="flex items-center gap-2">
            {dossier ? (
              <a
                href={dossier}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                title="Abrir el dossier de la obra"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Dossier</span>
              </a>
            ) : (
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Sin dossier — subir</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf"
                  onChange={(e) => subirArchivo(e.target.files?.[0], 'dossier')}
                />
              </label>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] rounded-lg transition-colors shadow-sm cursor-pointer"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aviso */}
        {aviso && (
          <div className={`no-print mx-5 mt-3 px-3 py-2 rounded-lg text-xs font-medium border ${
            aviso.tipo === 'malo'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {aviso.t}
          </div>
        )}

        {/* Cuerpo */}
        <div className="p-5 md:p-8 overflow-y-auto space-y-6 bg-[var(--bg-surface)]">

          {/* Cabecera de la obra (con logo de quien la presenta) */}
          <div className="border-b border-white/10 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start gap-4">
              {logo && (
                <img
                  src={logo}
                  alt={compania}
                  className="w-14 h-14 rounded-xl object-cover border border-white/15 bg-black/30"
                  referrerPolicy="no-referrer"
                  title={`Presenta: ${compania}`}
                />
              )}
              <div>
                <div className="flex items-center gap-2 text-[var(--accent-glow)] text-xs uppercase tracking-widest font-mono font-medium mb-2">
                  <FaseLogo variant="horizontal" size="xs" showTagline={false} />
                  <span>•</span>
                  <span>{compania || 'Catálogo Escénico'}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">{obra.title}</h1>
                <p className="text-slate-400 text-sm mt-1">
                  {obra.discipline} — {(obra as any).format || ''} | Duración: {(obra as any).duration || '—'} | {obra.targetAudience}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                obra.status === 'En gira' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                obra.status === 'Estreno' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                obra.status === 'En repertorio' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {obra.status}
              </span>
              <p className="text-xs text-slate-400 mt-1">Estreno: {(obra as any).premiereDate || '—'}</p>
            </div>
          </div>

          {/* Acciones: editar, cruces */}
          <div className="no-print flex flex-wrap items-center gap-2">
            <button
              onClick={editando ? () => setEditando(false) : abrirEdicion}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{editando ? 'Cerrar edición' : 'Editar ficha'}</span>
            </button>
            <button
              onClick={irAPlanner}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
              title="Abrir el Planner para agendar ensayos de este montaje"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Agendar ensayos</span>
            </button>
            <button
              onClick={irAVentas}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
              title="Llevar esta obra a la pestaña de Ventas"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Llevar a Ventas</span>
            </button>
            <button
              onClick={irAArquitecto}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
              title="Abrir esta obra en el Arquitecto de proyectos"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Abrir en Arquitecto</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Planner y Arquitecto son apps aparte: se abren con tu sesión y con esta obra puesta.
            </span>
          </div>

          {modo === 'ficha' && (
            <>
              {/* Portada y fotos */}
              <div className="no-print">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-7">
                    <div className="rounded-xl overflow-hidden border border-white/10 aspect-[16/9] bg-black/30 relative">
                      {obra.image ? (
                        <img src={obra.image} alt={obra.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Sin portada todavía</div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-black/60 border border-white/15">
                        Portada
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-slate-400">
                        {fotos.length ? `${fotos.length} foto(s) en el carrusel` : 'Sin fotos de escena todavía'}
                      </span>
                      <div className="flex gap-2">
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Cambiar portada</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 6 * 1024 * 1024) { avisar('La portada pasa de 6 MB.', 'malo'); return; }
                              setOcupado(true);
                              const lector = new FileReader();
                              lector.onload = () => {
                                pedir('/api/v1/crm/media', 'POST', { imagen: lector.result, nombre: obra.title, carpeta: 'obras', email })
                                  .then((d) => {
                                    if (!d || !d.ok) throw new Error((d && d.error) || 'no se pudo subir');
                                    ponerPortada(d.url);
                                  })
                                  .catch((err) => { avisar('No se pudo subir: ' + err.message, 'malo'); setOcupado(false); });
                              };
                              lector.readAsDataURL(f);
                            }}
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-[var(--accent-terracota)]/50 text-[var(--accent-glow)] hover:bg-[var(--accent-terracota)]/10 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>+ Fotos</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const lista = Array.from(e.target.files || []);
                              lista.forEach((f) => subirArchivo(f, 'foto'));
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Carrusel */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {fotos.slice(0, 8).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => ponerPortada(f.url)}
                          title="Usar como portada"
                          className="h-16 rounded-lg overflow-hidden border border-white/10 hover:border-[var(--accent-terracota)] transition-colors cursor-pointer"
                        >
                          <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                      {fotos.length === 0 && (
                        <div className="col-span-4 h-16 rounded-lg border border-dashed border-white/15 flex items-center justify-center text-[11px] text-slate-500">
                          Sube fotos de escena y aparecen acá
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sinopsis</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{(obra as any).synopsis || 'Sin sinopsis todavía.'}</p>

                    {obra.dossierHighlights && obra.dossierHighlights.filter((h) => !h.startsWith('http')).length > 0 && (
                      <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#fbbf24] uppercase tracking-wider">
                          <Award className="w-3.5 h-3.5" />
                          <span>Hitos & reconocimientos</span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {obra.dossierHighlights.filter((h) => !h.startsWith('http')).map((hl, i) => (
                            <li key={i}>• {hl}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Música de la obra */}
                    <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7dd3fc] uppercase tracking-wider mb-1.5">
                        <Music className="w-3.5 h-3.5" />
                        <span>Música en la obra</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Formato: <span className="text-white font-medium">
                          {ficha.musica?.formato === 'vivo' ? 'En vivo'
                            : ficha.musica?.formato === 'mixta' ? 'Mixta' : 'Envasada (pregrabada)'}
                        </span>
                        {ficha.musica?.musicos ? ` · ${ficha.musica.musicos} músico(s)` : ''}
                        {ficha.musica?.instrumentos ? ` · ${ficha.musica.instrumentos}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edición de la ficha */}
              {editando && (
                <div className="no-print p-4 rounded-xl border border-[var(--accent-terracota)]/40 bg-[var(--accent-terracota)]/5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-glow)]">Editando la ficha</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block text-xs">
                      <span className="block mb-1 text-slate-400">Título</span>
                      <input type="text" className={campo} value={borrador.title || ''} onChange={(e) => setBorrador({ ...borrador, title: e.target.value })} />
                    </label>
                    <label className="block text-xs">
                      <span className="block mb-1 text-slate-400">Formato</span>
                      <input type="text" className={campo} placeholder="Sala mediana, calle…" value={borrador.format || ''} onChange={(e) => setBorrador({ ...borrador, format: e.target.value })} />
                    </label>
                    <label className="block text-xs">
                      <span className="block mb-1 text-slate-400">Duración</span>
                      <input type="text" className={campo} placeholder="80 min" value={borrador.duration || ''} onChange={(e) => setBorrador({ ...borrador, duration: e.target.value })} />
                    </label>
                    <label className="block text-xs">
                      <span className="block mb-1 text-slate-400">Público</span>
                      <input type="text" className={campo} placeholder="Todo espectador" value={borrador.targetAudience || ''} onChange={(e) => setBorrador({ ...borrador, targetAudience: e.target.value })} />
                    </label>
                    <label className="block text-xs">
                      <span className="block mb-1 text-slate-400">Estado</span>
                      <select className={campo} value={borrador.status || ''} onChange={(e) => setBorrador({ ...borrador, status: e.target.value })}>
                        <option value="Estreno">Estreno</option>
                        <option value="En repertorio">En repertorio</option>
                        <option value="En gira">En gira</option>
                        <option value="En creación">En creación</option>
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="block mb-1 text-slate-400">Estreno (aaaa-mm-dd)</span>
                      <input type="text" className={campo} placeholder="2026-10-09" value={borrador.premiereDate || ''} onChange={(e) => setBorrador({ ...borrador, premiereDate: e.target.value })} />
                    </label>
                  </div>
                  <label className="block text-xs">
                    <span className="block mb-1 text-slate-400">Sinopsis (para la cartelera)</span>
                    <textarea rows={3} className={campo} value={borrador.synopsis || ''} onChange={(e) => setBorrador({ ...borrador, synopsis: e.target.value })} />
                  </label>

                  <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7dd3fc] uppercase tracking-wider mb-2">
                      <Music className="w-3.5 h-3.5" />
                      <span>Música en la obra</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block text-xs">
                        <span className="block mb-1 text-slate-400">Formato</span>
                        <select
                          className={campo}
                          value={borrador.musica?.formato || 'envasada'}
                          onChange={(e) => setBorrador({ ...borrador, musica: { ...borrador.musica, formato: e.target.value } })}
                        >
                          <option value="envasada">Envasada (pregrabada)</option>
                          <option value="vivo">En vivo</option>
                          <option value="mixta">Mixta</option>
                        </select>
                      </label>
                      <label className="block text-xs">
                        <span className="block mb-1 text-slate-400">Músicos en gira</span>
                        <input type="text" className={campo} value={borrador.musica?.musicos || ''} onChange={(e) => setBorrador({ ...borrador, musica: { ...borrador.musica, musicos: e.target.value } })} />
                      </label>
                      <label className="block text-xs">
                        <span className="block mb-1 text-slate-400">Instrumentos</span>
                        <input type="text" className={campo} value={borrador.musica?.instrumentos || ''} onChange={(e) => setBorrador({ ...borrador, musica: { ...borrador.musica, instrumentos: e.target.value } })} />
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={!!borrador.isPublic} onChange={(e) => setBorrador({ ...borrador, isPublic: e.target.checked })} />
                    <span>Visible en la app FASE (cartelera pública)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={guardarFicha}
                      disabled={ocupado}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar ficha</span>
                    </button>
                    <button onClick={() => setEditando(false)} className="px-4 py-2 rounded-lg border border-white/15 text-xs font-semibold text-slate-200 hover:bg-white/5 cursor-pointer">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Archivos de la obra */}
              <div className="no-print">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Archivos de la obra ({archivos.length})
                </h3>

                <div className="p-3 rounded-xl border border-dashed border-[var(--accent-terracota)]/40 bg-[var(--accent-terracota)]/5 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{ocupado ? 'Subiendo…' : 'Subir archivo'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,image/*"
                      onChange={(e) => subirArchivo(e.target.files?.[0], 'otro')}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">PDF, Word, planillas, imágenes · hasta 15 MB · los archivos más pesados y los videos van como enlace</span>

                  <div className="flex items-center gap-2 flex-wrap ml-auto">
                    <select
                      className="px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-xs text-white"
                      value={enlace.tipo}
                      onChange={(e) => setEnlace({ ...enlace, tipo: e.target.value })}
                    >
                      {TIPOS_ARCHIVO.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Nombre del enlace"
                      className="px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-xs text-white w-40"
                      value={enlace.nombre}
                      onChange={(e) => setEnlace({ ...enlace, nombre: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="https://…"
                      className="px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-xs text-white w-52"
                      value={enlace.url}
                      onChange={(e) => setEnlace({ ...enlace, url: e.target.value })}
                    />
                    <button
                      onClick={agregarEnlace}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Agregar enlace</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 divide-y divide-white/5">
                  {archivos.length === 0 && (
                    <p className="text-xs text-slate-500 py-3">Todavía no hay archivos en esta obra.</p>
                  )}
                  {archivos.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-2">
                      <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm">{iconoArchivo(a.tipo)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white truncate">{a.nombre}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.tipo}{peso(a.bytes) ? ` · ${peso(a.bytes)}` : ''}{a.subidoPor ? ` · ${a.subidoPor}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => abrir(a.url)}
                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-[11px] font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => borrarArchivo(a.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Quitar de la obra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {modo === 'dossier' && (
            <>
              {/* Hero Banner & Synopsis */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 rounded-xl overflow-hidden border border-white/10 aspect-[4/3] md:aspect-auto">
                  {obra.image ? (
                    <img src={obra.image} alt={obra.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-black/30" />
                  )}
                </div>
                <div className="md:col-span-7 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sinopsis de la Obra</h3>
                    <p className="text-slate-300 text-base leading-relaxed">{(obra as any).synopsis}</p>
                  </div>

                  {obra.dossierHighlights && obra.dossierHighlights.filter((h) => !h.startsWith('http')).length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#fbbf24] uppercase tracking-wider">
                        <Award className="w-4 h-4" />
                        <span>Hitos & Reconocimientos</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {obra.dossierHighlights.filter((h) => !h.startsWith('http')).map((hl, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[var(--accent-2)]">•</span>
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Ficha Artística y Técnica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-2)]">
                    <Users className="w-4 h-4" />
                    <span>Equipo Artístico & Elenco</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Dirección General:</span>
                      <span className="text-white font-medium">{obra.castTeam?.direction || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Música & Diseño Sonoro:</span>
                      <span className="text-white font-medium">{obra.castTeam?.music || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Técnica & Iluminación:</span>
                      <span className="text-white font-medium">{obra.castTeam?.technical || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Elenco / Intérpretes:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(obra.castTeam?.cast || []).map((actor, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-slate-200 border border-white/5">{actor}</span>
                        ))}
                        {(!obra.castTeam?.cast || obra.castTeam.cast.length === 0) && <span className="text-slate-400">—</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#38bdf8]">
                    <Sliders className="w-4 h-4" />
                    <span>Requerimientos Técnicos Básicos</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/5">
                      <div>
                        <span className="text-slate-400 block">Dimensiones mínimas:</span>
                        <span className="text-white font-medium">{obra.technicalRider?.minStageWidthMeters || 10}m ancho x {obra.technicalRider?.minStageDepthMeters || 8}m fondo</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tiempo de montaje:</span>
                        <span className="text-white font-medium">{obra.technicalRider?.loadInHours || 4} horas previas</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Iluminación:</span>
                      <p className="text-slate-300 text-xs mt-0.5">{obra.technicalRider?.lighting || 'Planta estándar LED y convencionales'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Audio & Microfonía:</span>
                      <p className="text-slate-300 text-xs mt-0.5">{obra.technicalRider?.sound || 'Sistema PA y monitores de escenario'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Equipo en gira:</span>
                      <span className="text-white font-medium">{obra.technicalRider?.crewRequired || 3} técnicos + elenco</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Música:</span>
                      <span className="text-white font-medium">
                        {ficha.musica?.formato === 'vivo' ? 'En vivo' : ficha.musica?.formato === 'mixta' ? 'Mixta' : 'Envasada'}
                        {ficha.musica?.musicos ? ` (${ficha.musica.musicos} músicos)` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Economía */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-[var(--accent-2)]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#fbbf24]">
                    <DollarSign className="w-4 h-4" />
                    <span>Condiciones Económicas de Contratación (Referencial)</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Caché base para función única. Para giras regionales o temporadas se calculan viáticos, traslados y convenios.
                  </p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-xs text-slate-400 block">Caché función única:</span>
                  <span className="text-xl font-bold text-[var(--accent-2)] font-mono">
                    {formatCLP(obra.economics?.feeCLP || 0)} + IVA
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 text-center text-xs text-slate-400 space-y-1">
                <p className="font-medium text-slate-300">F.A.S.E PRODUCCIONES — Plataforma de Gestión Escénica • Chile</p>
                <p>Documento generado desde el CRM · {compania || 'ATHA'}</p>
              </div>
            </>
          )}

          {/* Ficha artística resumida también en la vista de ficha */}
          {modo === 'ficha' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-2)] mb-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>Equipo artístico & elenco</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div>Dirección: <span className="text-white">{obra.castTeam?.direction || '—'}</span></div>
                  <div>Música: <span className="text-white">{obra.castTeam?.music || '—'}</span></div>
                  <div>Técnica: <span className="text-white">{obra.castTeam?.technical || '—'}</span></div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(obra.castTeam?.cast || []).map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-200">{a}</span>
                    ))}
                    {(!obra.castTeam?.cast || obra.castTeam.cast.length === 0) && (
                      <span className="text-slate-500">
                        Inscribe el elenco más abajo (sale de la nómina de la compañía).
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#38bdf8] mb-2">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Requerimientos técnicos</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>Ancho mín.: <span className="text-white">{obra.technicalRider?.minStageWidthMeters || 10} m</span></div>
                  <div>Fondo mín.: <span className="text-white">{obra.technicalRider?.minStageDepthMeters || 8} m</span></div>
                  <div>Montaje: <span className="text-white">{obra.technicalRider?.loadInHours || 4} h</span></div>
                  <div>Equipo: <span className="text-white">{obra.technicalRider?.crewRequired || 3} técnicos</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ELENCO DE LA OBRA (Tanda B) — cuentas de la plataforma y roles por obra */}
          <div className="no-print pt-4 border-t border-white/10">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Elenco de la obra ({elenco.length})
              </h3>
              <button
                onClick={() => setInscribiendo(!inscribiendo)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--accent-terracota)]/50 text-[var(--accent-glow)] hover:bg-[var(--accent-terracota)]/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{inscribiendo ? 'Cerrar' : 'Inscribir del elenco'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Todo integrante sale de la nómina de una compañía registrada (no se escriben nombres
              sueltos). El rol en la obra lo designa dirección o producción de la compañía.
            </p>

            {inscribiendo && (
              <div className="p-3 rounded-xl border border-[var(--accent-terracota)]/40 bg-[var(--accent-terracota)]/5 space-y-3 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={companiaSel}
                    onChange={(e) => { setCompaniaSel(e.target.value); setMarcados({}); }}
                    className="px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-xs text-white"
                  >
                    {companias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {(c.people || []).length} integrante(s)
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    <input type="checkbox" checked={otraCompania} onChange={(e) => setOtraCompania(e.target.checked)} />
                    <span>Es invitado de otra compañía</span>
                  </label>
                </div>

                <div className="divide-y divide-white/5">
                  {nominaVisible().length === 0 && (
                    <p className="text-xs text-slate-500 py-2">Esa compañía todavía no tiene nómina cargada.</p>
                  )}
                  {nominaVisible().map((p: any) => {
                    const on = !!marcados[p.fullName];
                    return (
                      <div key={p.fullName} className="flex items-center gap-3 py-2 flex-wrap">
                        <button
                          onClick={() => setMarcados((prev) => {
                            const n = { ...prev };
                            if (n[p.fullName]) delete n[p.fullName];
                            else n[p.fullName] = { rol: 'elenco', personaje: '' };
                            return n;
                          })}
                          className={`w-4 h-4 rounded border text-[10px] flex items-center justify-center ${
                            on ? 'bg-[var(--accent-terracota)] border-[var(--accent-terracota)] text-white' : 'border-white/30'
                          }`}
                        >
                          {on ? '✓' : ''}
                        </button>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">{p.fullName}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.roleTitle || 'sin cargo'}{p.email ? ` · ${p.email}` : ''}
                          </div>
                        </div>
                        {on && (
                          <div className="flex items-center gap-2 ml-auto">
                            <select
                              value={marcados[p.fullName].rol}
                              onChange={(e) => setMarcados((prev) => ({ ...prev, [p.fullName]: { ...prev[p.fullName], rol: e.target.value } }))}
                              className="px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-[11px] text-white"
                            >
                              <option value="direccion">Dirección</option>
                              <option value="elenco">Elenco</option>
                              <option value="equipo">Equipo</option>
                              <option value="produccion">Producción</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Personaje (opcional)"
                              value={marcados[p.fullName].personaje}
                              onChange={(e) => setMarcados((prev) => ({ ...prev, [p.fullName]: { ...prev[p.fullName], personaje: e.target.value } }))}
                              className="px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-[11px] text-white w-44"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={inscribirElenco}
                  disabled={ocupado}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{ocupado ? 'Inscribiendo…' : 'Inscribir en la obra'}</span>
                </button>
              </div>
            )}

            <div className="divide-y divide-white/5">
              {elenco.length === 0 && (
                <p className="text-xs text-slate-500 py-2">Todavía no hay elenco inscrito en esta obra.</p>
              )}
              {elenco.map((x: any) => {
                const personaje = x.personaje || x.title || '';
                const invitado = x.esInvitadoDeOtraCompania || String(x.notes || '').startsWith('viene de');
                return (
                  <div key={x.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">
                        {x.displayName}
                        {personaje ? <span className="text-slate-400 font-normal"> — {personaje}</span> : null}
                        {x.cuenta ? (
                          <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">con cuenta</span>
                        ) : null}
                        {invitado ? (
                          <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                            {String(x.notes || 'invitado')}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {(x.role || 'elenco')}
                        {x.email ? ` · ${x.email}` : ''}
                        {x.compania || x.companyName ? ` · ${x.compania || x.companyName}` : ''}
                      </div>
                    </div>
                    {!x.cuenta && (
                      <button
                        onClick={() => invitar(x.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-[11px] font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
                        title="Enviarle la invitación para entrar con su rol en esta obra"
                      >
                        Invitar
                      </button>
                    )}
                    <select
                      value={x.role || 'elenco'}
                      onChange={(e) => cambiarRol(x.id, e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-[11px] text-white"
                    >
                      <option value="direccion">Dirección</option>
                      <option value="elenco">Elenco</option>
                      <option value="equipo">Equipo</option>
                      <option value="produccion">Producción</option>
                    </select>
                    <button
                      onClick={() => quitarDelElenco(x.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Quitar de esta obra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
