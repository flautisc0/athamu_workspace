/**
 * INVENTARIO / BACKLINE · ATHA
 *
 * Sistema de gestión de inventario organizado por CAJAS y por COMPAÑÍA:
 *
 *   compañía  ──▶  cajas (lo que sale a gira)  ──▶  ítems (con foto)
 *
 * Cada ítem puede tener foto (se sube al bucket vía el hub), marca, modelo y
 * número de serie, para poder armar después el rider técnico desde las cajas.
 *
 * La sección es AUTOCONTENIDA: lee y escribe directo en el hub del CRM
 * (`/api/v1/crm/inventario`), así no necesita que App.tsx le pase datos.
 * Único prop: `theme` (antes no lo recibía y quedaba con letras blancas sobre
 * fondo claro en modo día → el título era invisible).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Boxes, Camera, Check, ChevronRight, Edit3, Filter, ImageOff, Loader2, MapPin,
  Package, Plus, RefreshCw, Search, Tag, Trash2, Truck, X,
} from 'lucide-react';

const API = '/api/v1/crm/inventario';

type TipoCaja = 'Audio' | 'Iluminación' | 'Backline' | 'Cables & DMX' | 'Utilería' | 'Vestuario' | 'Otro';
const TIPOS: TipoCaja[] = ['Audio', 'Iluminación', 'Backline', 'Cables & DMX', 'Utilería', 'Vestuario', 'Otro'];

const CATEGORIAS = ['Audio / Backline', 'Iluminación', 'Estructura / Escenario', 'Video / Proyección', 'Cables & DMX', 'Utilería', 'Vestuario'];
const ESTADOS_ITEM = ['Disponible', 'Asignado en gira', 'En reparación', 'En bodega central', 'De baja'];
const CONDICIONES = ['Excelente', 'Operativo', 'En mantención', 'Para repuesto'];
const ESTADOS_CAJA = ['En bodega', 'En gira', 'En montaje', 'En reparación'];

interface Compania { id: string; name: string; kind?: string | null; city?: string | null }
interface Caja {
  id: string; company_id: string | null; code: string | null; name: string; kind: string | null;
  location: string | null; photo_url: string | null; notes: string | null; status: string;
  items?: number | string; valor?: number | string;
}
interface Item {
  id: string; company_id: string | null; box_id: string | null; code: string; name: string;
  category: string; brand: string | null; model: string | null; serial: string | null;
  quantity: number | string; condition: string; status: string; location: string | null;
  value_clp: number | string | null; photo_url: string | null; notes: string | null;
}

interface Props {
  theme?: string;
  /** props heredadas de la versión anterior (se ignoran: la sección es autocontenida) */
  inventory?: unknown;
  onUpdateItemStatus?: unknown;
  onSaveItem?: unknown;
  onDeleteItem?: unknown;
}

const clp = (v: unknown) => `$${Math.round(Number(v) || 0).toLocaleString('es-CL')}`;

/** Convierte un archivo de imagen en un data URL razonable (máx. 1280px, JPEG). */
async function archivoADataUrl(file: File, max = 1280): Promise<string> {
  const original = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error('no se pudo leer el archivo'));
    fr.readAsDataURL(file);
  });
  // SVG o imágenes que el canvas no puede rasterizar: se mandan tal cual
  if (/^data:image\/svg/i.test(original)) return original;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('archivo no es una imagen válida'));
    i.src = original;
  });
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export const InventarioSection: React.FC<Props> = ({ theme }) => {
  const isLight = theme === 'dia';

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [companias, setCompanias] = useState<Compania[]>([]);
  const [companiaId, setCompaniaId] = useState<string | null>(null);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [verTodos, setVerTodos] = useState(false); // ver todos los ítems, no sólo los de la caja abierta

  const [modalCaja, setModalCaja] = useState<Partial<Caja> | null>(null);
  const [modalItem, setModalItem] = useState<Partial<Item> | null>(null);

  const inputFoto = useRef<HTMLInputElement | null>(null);
  const destinoFoto = useRef<{ tipo: 'caja' | 'item' } | null>(null);

  // ── estilos por tema (esto es lo que estaba roto: sólo había colores oscuros)
  const t = {
    texto: isLight ? 'text-stone-800' : 'text-slate-100',
    textoSuave: isLight ? 'text-stone-500' : 'text-slate-400',
    panel: isLight ? 'bg-white' : 'bg-[#161920]',
    panelSuave: isLight ? 'bg-stone-50' : 'bg-[#12141a]',
    borde: isLight ? 'border-stone-200' : 'border-white/10',
    input: isLight
      ? 'bg-white border-stone-300 text-stone-800 placeholder-stone-400 focus:border-[#E05A47]'
      : 'bg-[#0f1115] border-white/10 text-white placeholder-slate-500 focus:border-[#6ee7b7]',
    chipActivo: 'bg-[#E05A47] text-white border-[#E05A47]',
    chip: isLight ? 'bg-stone-100 text-stone-600 border-stone-200 hover:border-stone-300' : 'bg-white/5 text-slate-300 border-white/10',
    hover: isLight ? 'hover:bg-stone-50' : 'hover:bg-white/5',
  };

  // ── carga desde el hub ────────────────────────────────────────────────────
  const cargar = useCallback(async (companyId: string | null, silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const url = companyId ? `${API}?company_id=${encodeURIComponent(companyId)}` : API;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.success === false) throw new Error(d.error || 'error del CRM');
      setCompanias(d.companies || []);
      setCajas(d.boxes || []);
      setItems(d.items || []);
      setError(null);
    } catch (e: any) {
      setError(`No se pudo cargar el inventario: ${e?.message || e}`);
    } finally {
      setCargando(false);
    }
  }, []);

  // Al entrar: elegir compañía por defecto (ATHA Producciones si existe).
  useEffect(() => {
    (async () => {
      await cargar(null);
    })();
  }, [cargar]);

  useEffect(() => {
    if (companiaId || !companias.length) return;
    const atha = companias.find((c) => /atha/i.test(c.name));
    const elegida = atha?.id || companias[0].id;
    setCompaniaId(elegida);
    cargar(elegida, true);
  }, [companias, companiaId, cargar]);

  const avisar = (msg: string) => {
    setAviso(msg);
    setTimeout(() => setAviso(null), 3200);
  };

  // ── filtros ───────────────────────────────────────────────────────────────
  const itemsDeCaja = useMemo(
    () => (cajaAbierta && !verTodos ? items.filter((i) => i.box_id === cajaAbierta) : items),
    [items, cajaAbierta, verTodos]
  );
  const itemsVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return itemsDeCaja.filter((i) => {
      const coincide =
        !q ||
        [i.name, i.brand, i.model, i.serial, i.code].some((v) => String(v || '').toLowerCase().includes(q));
      const estadoOk = filtroEstado === 'todos' || i.status === filtroEstado;
      return coincide && estadoOk;
    });
  }, [itemsDeCaja, busqueda, filtroEstado]);

  const totales = useMemo(() => {
    const valor = items.reduce((s, i) => s + Number(i.value_clp || 0) * Number(i.quantity || 1), 0);
    const enGira = items.filter((i) => i.status === 'Asignado en gira').length;
    return { valor, enGira, cajas: cajas.length, items: items.length };
  }, [items, cajas]);

  // ── guardar ───────────────────────────────────────────────────────────────
  const guardarCaja = async () => {
    if (!modalCaja?.name?.trim()) return;
    setGuardando(true);
    try {
      const esNueva = !modalCaja.id;
      const r = await fetch(esNueva ? `${API}/cajas` : `${API}/cajas/${modalCaja.id}`, {
        method: esNueva ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...modalCaja, companyId: modalCaja.company_id || companiaId }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setModalCaja(null);
      await cargar(companiaId, true);
      avisar(esNueva ? '✓ Caja creada' : '✓ Caja actualizada');
    } catch (e: any) {
      setError(`No se pudo guardar la caja: ${e?.message || e}`);
    } finally {
      setGuardando(false);
    }
  };

  const guardarItem = async () => {
    if (!modalItem?.name?.trim()) return;
    setGuardando(true);
    try {
      const esNuevo = !modalItem.id;
      const r = await fetch(esNuevo ? `${API}/items` : `${API}/items/${modalItem.id}`, {
        method: esNuevo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...modalItem,
          companyId: modalItem.company_id || companiaId,
          boxId: modalItem.box_id ?? cajaAbierta,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setModalItem(null);
      await cargar(companiaId, true);
      avisar(esNuevo ? '✓ Ítem agregado' : '✓ Ítem actualizado');
    } catch (e: any) {
      setError(`No se pudo guardar el ítem: ${e?.message || e}`);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (tipo: 'cajas' | 'items', id: string, nombre: string) => {
    const extra = tipo === 'cajas' ? '\n\nLos ítems NO se borran: quedan sin caja.' : '';
    if (!window.confirm(`¿Eliminar "${nombre}"?${extra}`)) return;
    try {
      const r = await fetch(`${API}/${tipo}/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      if (tipo === 'cajas' && cajaAbierta === id) setCajaAbierta(null);
      await cargar(companiaId, true);
      avisar('✓ Eliminado');
    } catch (e: any) {
      setError(`No se pudo eliminar: ${e?.message || e}`);
    }
  };

  // ── foto ──────────────────────────────────────────────────────────────────
  const pedirFoto = (tipo: 'caja' | 'item') => {
    destinoFoto.current = { tipo };
    inputFoto.current?.click();
  };

  const subirFoto = async (file: File) => {
    const destino = destinoFoto.current;
    if (!destino) return;
    setGuardando(true);
    try {
      const image = await archivoADataUrl(file);
      const objetivoId = destino.tipo === 'caja' ? modalCaja?.id || 'nueva-caja' : modalItem?.id || 'nuevo-item';
      const r = await fetch(`${API}/foto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, id: objetivoId, tipo: destino.tipo }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      if (destino.tipo === 'caja') setModalCaja((m) => ({ ...(m || {}), photo_url: d.url }));
      else setModalItem((m) => ({ ...(m || {}), photo_url: d.url }));
      avisar('✓ Foto subida');
    } catch (e: any) {
      setError(`No se pudo subir la foto: ${e?.message || e}`);
    } finally {
      setGuardando(false);
      destinoFoto.current = null;
      if (inputFoto.current) inputFoto.current.value = '';
    }
  };

  const exportarCSV = () => {
    const filas = [
      ['Código', 'Ítem', 'Marca', 'Modelo', 'Serie', 'Cantidad', 'Caja', 'Estado', 'Condición', 'Valor CLP'],
      ...itemsVisibles.map((i) => [
        i.code, i.name, i.brand || '', i.model || '', i.serial || '', String(i.quantity || 1),
        cajas.find((c) => c.id === i.box_id)?.name || 'Sin caja',
        i.status, i.condition, String(Math.round(Number(i.value_clp) || 0)),
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_atha_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cajaSel = cajas.find((c) => c.id === cajaAbierta) || null;

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className={`space-y-5 ${t.texto}`}>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#E05A47] uppercase tracking-wider">
            <Boxes className="w-4 h-4" /> Inventario & Backline
          </div>
          <h1 className={`text-2xl font-bold tracking-tight mt-0.5 ${t.texto}`}>
            Equipamiento por compañía
          </h1>
          <p className={`text-xs mt-1 ${t.textoSuave}`}>
            Organizado por cajas: cada caja sale a gira y agrupa sus ítems con foto, marca y número de serie.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => cargar(companiaId, true)}
            className={`inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border ${t.borde} ${t.panel} ${t.texto} ${t.hover} transition-colors cursor-pointer`}
            title="Recargar desde la base"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} /> Recargar
          </button>
          <button
            onClick={exportarCSV}
            className={`inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border ${t.borde} ${t.panel} ${t.texto} ${t.hover} transition-colors cursor-pointer`}
            title="Descargar planilla (checklist de gira)"
          >
            <Truck className="w-3.5 h-3.5" /> Exportar
          </button>
          <button
            onClick={() => setModalCaja({ status: 'En bodega', kind: 'Audio', company_id: companiaId || undefined })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E05A47] hover:bg-[#c94c3c] text-white font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva caja
          </button>
        </div>
      </div>

      {/* Selector de compañía */}
      <div className={`p-3 rounded-2xl border ${t.borde} ${t.panel}`}>
        <div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${t.textoSuave}`}>
          Compañía
        </div>
        <div className="flex flex-wrap gap-2">
          {companias.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCompaniaId(c.id); setCajaAbierta(null); cargar(c.id); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                companiaId === c.id ? t.chipActivo : t.chip
              }`}
            >
              {c.name}
            </button>
          ))}
          {!companias.length && <span className={`text-xs ${t.textoSuave}`}>Cargando compañías…</span>}
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { etiqueta: 'Cajas', valor: String(totales.cajas), icono: Box },
          { etiqueta: 'Ítems', valor: String(totales.items), icono: Package },
          { etiqueta: 'En gira', valor: String(totales.enGira), icono: Truck },
          { etiqueta: 'Valor inventario', valor: clp(totales.valor), icono: Tag },
        ].map(({ etiqueta, valor, icono: Icono }) => (
          <div key={etiqueta} className={`p-3.5 rounded-xl border ${t.borde} ${t.panel}`}>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${t.textoSuave}`}>
              <Icono className="w-3.5 h-3.5" /> {etiqueta}
            </div>
            <div className={`text-lg font-bold mt-1 ${isLight ? 'text-stone-900' : 'text-white'}`}>{valor}</div>
          </div>
        ))}
      </div>

      {/* Avisos */}
      {error && (
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          <X className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer font-bold">✕</button>
        </div>
      )}
      {aviso && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
          <Check className="w-4 h-4 shrink-0" /> {aviso}
        </div>
      )}

      {/* Buscador y filtros */}
      <div className={`p-3 rounded-2xl border ${t.borde} ${t.panel} flex flex-col sm:flex-row gap-2`}>
        <div className="relative flex-1">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textoSuave}`} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por ítem, marca, modelo, serie o código…"
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none ${t.input}`}
          />
        </div>
        <div className="relative">
          <Filter className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textoSuave}`} />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={`pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none cursor-pointer ${t.input}`}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS_ITEM.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setCajaAbierta(null); setVerTodos(true); }}
          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${verTodos || !cajaAbierta ? t.chipActivo : t.chip}`}
        >
          Ver todos los ítems
        </button>
      </div>

      {/* CAJAS */}
      {cargando && !cajas.length ? (
        <div className={`p-8 rounded-2xl border ${t.borde} ${t.panel} flex items-center justify-center gap-2 ${t.textoSuave} text-xs`}>
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando inventario…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cajas.map((b) => {
              const activa = cajaAbierta === b.id;
              const enGira = b.status === 'En gira';
              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border overflow-hidden transition-all cursor-pointer ${t.panel} ${
                    activa ? 'border-[#E05A47] ring-1 ring-[#E05A47]/40' : `${t.borde} ${isLight ? 'hover:border-stone-300' : 'hover:border-white/20'}`
                  }`}
                  onClick={() => { setCajaAbierta(activa ? null : b.id); setVerTodos(false); }}
                >
                  <div className={`h-32 flex items-center justify-center relative ${t.panelSuave}`}>
                    {b.photo_url ? (
                      <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className={`flex flex-col items-center gap-1 ${t.textoSuave}`}>
                        <ImageOff className="w-6 h-6" />
                        <span className="text-[10px]">sin foto</span>
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLight ? 'bg-white/90 text-stone-700' : 'bg-black/60 text-slate-200'
                    }`}>
                      {b.code || 'S/C'}
                    </span>
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                      enGira ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`text-sm font-bold truncate ${isLight ? 'text-stone-900' : 'text-white'}`}>{b.name}</h3>
                        <div className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${t.textoSuave}`}>
                          <Tag className="w-3 h-3" /> {b.kind || 'Sin tipo'}
                          {b.location && <><MapPin className="w-3 h-3 ml-1" /> {b.location}</>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setModalCaja(b); }}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${t.borde} ${t.hover}`}
                          title="Editar caja"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); borrar('cajas', b.id, b.name); }}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isLight ? 'border-stone-200 text-stone-400 hover:text-rose-600' : 'border-white/10 text-slate-400 hover:text-rose-400'}`}
                          title="Eliminar caja"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between pt-2 border-t ${t.borde}`}>
                      <span className={`text-[11px] font-mono ${t.textoSuave}`}>
                        {b.items ?? 0} ítem(s) · {clp(b.valor)}
                      </span>
                      <span className="text-[11px] font-semibold inline-flex items-center gap-1 text-[#E05A47]">
                        {activa ? 'Cerrar' : 'Ver ítems'} <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activa ? 'rotate-90' : ''}`} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tarjeta para crear caja */}
            <button
              onClick={() => setModalCaja({ status: 'En bodega', kind: 'Audio', company_id: companiaId || undefined })}
              className={`rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center gap-2 min-h-[180px] transition-colors cursor-pointer ${
                isLight ? 'border-stone-300 text-stone-400 hover:border-[#E05A47] hover:text-[#E05A47]' : 'border-white/15 text-slate-500 hover:border-[#6ee7b7] hover:text-[#6ee7b7]'
              }`}
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-semibold">Nueva caja</span>
            </button>
          </div>

          {/* ÍTEMS */}
          <div className={`rounded-2xl border ${t.borde} ${t.panel} overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${t.borde} flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <h2 className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                  {cajaAbierta && !verTodos ? `Ítems de ${cajaSel?.name || 'la caja'}` : 'Todos los ítems'}
                </h2>
                <p className={`text-[11px] ${t.textoSuave}`}>
                  {itemsVisibles.length} de {items.length} ítem(s)
                </p>
              </div>
              <button
                onClick={() => setModalItem({ category: 'Audio / Backline', condition: 'Excelente', status: 'Disponible', quantity: 1, box_id: cajaAbierta || undefined, company_id: companiaId || undefined })}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${t.borde} ${t.hover}`}
              >
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-[10px] font-mono uppercase tracking-wider ${t.textoSuave}`}>
                    <th className="px-3 py-2 font-bold">Foto</th>
                    <th className="px-3 py-2 font-bold">Ítem</th>
                    <th className="px-3 py-2 font-bold hidden md:table-cell">Marca / Modelo</th>
                    <th className="px-3 py-2 font-bold hidden lg:table-cell">Serie</th>
                    <th className="px-3 py-2 font-bold">Cant.</th>
                    <th className="px-3 py-2 font-bold hidden sm:table-cell">Caja</th>
                    <th className="px-3 py-2 font-bold">Estado</th>
                    <th className="px-3 py-2 font-bold hidden lg:table-cell">Valor</th>
                    <th className="px-3 py-2 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsVisibles.map((i) => (
                    <tr key={i.id} className={`border-t ${t.borde} ${t.hover} transition-colors`}>
                      <td className="px-3 py-2">
                        {i.photo_url ? (
                          <img src={i.photo_url} alt={i.name} className="w-11 h-11 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${t.panelSuave}`}>
                            <Camera className={`w-4 h-4 ${t.textoSuave}`} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className={`text-xs font-semibold ${isLight ? 'text-stone-800' : 'text-slate-100'}`}>{i.name}</div>
                        <div className={`text-[10px] font-mono ${t.textoSuave}`}>{i.code} · {i.category}</div>
                      </td>
                      <td className={`px-3 py-2 text-xs hidden md:table-cell ${t.textoSuave}`}>
                        {[i.brand, i.model].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className={`px-3 py-2 text-[11px] font-mono hidden lg:table-cell ${t.textoSuave}`}>{i.serial || '—'}</td>
                      <td className={`px-3 py-2 text-xs font-mono ${t.textoSuave}`}>{i.quantity ?? 1}</td>
                      <td className={`px-3 py-2 text-[11px] hidden sm:table-cell ${t.textoSuave}`}>
                        {cajas.find((c) => c.id === i.box_id)?.name || 'Sin caja'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          i.status === 'Disponible'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : i.status === 'Asignado en gira'
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-slate-500/15 text-slate-500'
                        }`}>
                          {i.status}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-xs font-mono hidden lg:table-cell ${t.textoSuave}`}>{clp(i.value_clp)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalItem(i)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${t.borde} ${t.hover}`}
                            title="Editar ítem"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => borrar('items', i.id, i.name)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isLight ? 'border-stone-200 text-stone-400 hover:text-rose-600' : 'border-white/10 text-slate-400 hover:text-rose-400'}`}
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!itemsVisibles.length && (
                    <tr>
                      <td colSpan={9} className={`px-3 py-10 text-center text-xs ${t.textoSuave}`}>
                        {items.length
                          ? 'Ningún ítem coincide con el filtro.'
                          : 'Todavía no hay ítems. Creá una caja y agregá el equipamiento.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* input de foto oculto (compartido) */}
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFoto(f); }}
      />

      {/* MODAL CAJA */}
      {modalCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border ${t.borde} ${t.panel} overflow-hidden`}>
            <div className={`px-5 py-3.5 border-b ${t.borde} flex items-center justify-between`}>
              <h3 className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                {modalCaja.id ? 'Editar caja' : 'Nueva caja'}
              </h3>
              <button onClick={() => setModalCaja(null)} className={`p-1.5 rounded-lg cursor-pointer ${t.hover}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Nombre *</span>
                  <input
                    value={modalCaja.name || ''}
                    onChange={(e) => setModalCaja({ ...modalCaja, name: e.target.value })}
                    placeholder="Caja 1 · Audio"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`}
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Código</span>
                  <input
                    value={modalCaja.code || ''}
                    onChange={(e) => setModalCaja({ ...modalCaja, code: e.target.value })}
                    placeholder="ATHA-CJ-001"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`}
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Tipo</span>
                  <select
                    value={modalCaja.kind || 'Audio'}
                    onChange={(e) => setModalCaja({ ...modalCaja, kind: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${t.input}`}
                  >
                    {TIPOS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Ubicación</span>
                  <input
                    value={modalCaja.location || ''}
                    onChange={(e) => setModalCaja({ ...modalCaja, location: e.target.value })}
                    placeholder="Bodega Bellavista, estante A1"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`}
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Estado</span>
                  <select
                    value={modalCaja.status || 'En bodega'}
                    onChange={(e) => setModalCaja({ ...modalCaja, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${t.input}`}
                  >
                    {ESTADOS_CAJA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="col-span-2 text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Notas</span>
                  <textarea
                    value={modalCaja.notes || ''}
                    onChange={(e) => setModalCaja({ ...modalCaja, notes: e.target.value })}
                    rows={2}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none resize-none ${t.input}`}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                {modalCaja.photo_url ? (
                  <img src={modalCaja.photo_url} alt="foto de la caja" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${t.panelSuave}`}>
                    <ImageOff className={`w-5 h-5 ${t.textoSuave}`} />
                  </div>
                )}
                <button
                  onClick={() => pedirFoto('caja')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${t.borde} ${t.hover}`}
                >
                  <Camera className="w-3.5 h-3.5" /> {modalCaja.photo_url ? 'Cambiar foto' : 'Subir foto'}
                </button>
              </div>
            </div>
            <div className={`px-5 py-3.5 border-t ${t.borde} flex justify-end gap-2`}>
              <button
                onClick={() => setModalCaja(null)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${t.borde} ${t.hover}`}
              >
                Cancelar
              </button>
              <button
                onClick={guardarCaja}
                disabled={guardando || !modalCaja.name?.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#E05A47] hover:bg-[#c94c3c] text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {guardando ? 'Guardando…' : 'Guardar caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÍTEM */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl border ${t.borde} ${t.panel} overflow-hidden`}>
            <div className={`px-5 py-3.5 border-b ${t.borde} flex items-center justify-between`}>
              <h3 className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                {modalItem.id ? 'Editar ítem' : 'Nuevo ítem'}
              </h3>
              <button onClick={() => setModalItem(null)} className={`p-1.5 rounded-lg cursor-pointer ${t.hover}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="col-span-2 md:col-span-3 text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Nombre del ítem *</span>
                  <input
                    value={modalItem.name || ''}
                    onChange={(e) => setModalItem({ ...modalItem, name: e.target.value })}
                    placeholder="Micrófono Shure SM58"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`}
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Marca</span>
                  <input value={modalItem.brand || ''} onChange={(e) => setModalItem({ ...modalItem, brand: e.target.value })}
                    placeholder="Shure" className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`} />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Modelo</span>
                  <input value={modalItem.model || ''} onChange={(e) => setModalItem({ ...modalItem, model: e.target.value })}
                    placeholder="SM58" className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`} />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>N° de serie</span>
                  <input value={modalItem.serial || ''} onChange={(e) => setModalItem({ ...modalItem, serial: e.target.value })}
                    placeholder="SM58-8842" className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`} />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Cantidad</span>
                  <input type="number" min={1} value={String(modalItem.quantity ?? 1)}
                    onChange={(e) => setModalItem({ ...modalItem, quantity: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`} />
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Categoría</span>
                  <select value={modalItem.category || 'Audio / Backline'}
                    onChange={(e) => setModalItem({ ...modalItem, category: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${t.input}`}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Caja</span>
                  <select value={modalItem.box_id || ''} onChange={(e) => setModalItem({ ...modalItem, box_id: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${t.input}`}>
                    <option value="">Sin caja</option>
                    {cajas.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ''}{c.name}</option>)}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Estado</span>
                  <select value={modalItem.status || 'Disponible'} onChange={(e) => setModalItem({ ...modalItem, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${t.input}`}>
                    {ESTADOS_ITEM.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Condición</span>
                  <select value={modalItem.condition || 'Excelente'} onChange={(e) => setModalItem({ ...modalItem, condition: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none cursor-pointer ${t.input}`}>
                    {CONDICIONES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Valor unitario (CLP)</span>
                  <input type="number" min={0} value={String(modalItem.value_clp ?? '')}
                    onChange={(e) => setModalItem({ ...modalItem, value_clp: Number(e.target.value) })}
                    placeholder="120000" className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${t.input}`} />
                </label>
                <label className="col-span-2 md:col-span-3 text-xs space-y-1">
                  <span className={`font-semibold ${t.textoSuave}`}>Notas</span>
                  <textarea value={modalItem.notes || ''} onChange={(e) => setModalItem({ ...modalItem, notes: e.target.value })}
                    rows={2} className={`w-full px-3 py-2 rounded-xl border focus:outline-none resize-none ${t.input}`} />
                </label>
              </div>

              <div className="flex items-center gap-3">
                {modalItem.photo_url ? (
                  <img src={modalItem.photo_url} alt="foto del ítem" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${t.panelSuave}`}>
                    <ImageOff className={`w-5 h-5 ${t.textoSuave}`} />
                  </div>
                )}
                <button
                  onClick={() => pedirFoto('item')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${t.borde} ${t.hover}`}
                >
                  <Camera className="w-3.5 h-3.5" /> {modalItem.photo_url ? 'Cambiar foto' : 'Subir foto'}
                </button>
                <span className={`text-[11px] ${t.textoSuave}`}>Se sube al almacenamiento del ecosistema.</span>
              </div>
            </div>
            <div className={`px-5 py-3.5 border-t ${t.borde} flex justify-end gap-2`}>
              <button onClick={() => setModalItem(null)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${t.borde} ${t.hover}`}>
                Cancelar
              </button>
              <button onClick={guardarItem} disabled={guardando || !modalItem.name?.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#E05A47] hover:bg-[#c94c3c] text-white disabled:opacity-50 transition-colors cursor-pointer">
                {guardando ? 'Guardando…' : 'Guardar ítem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioSection;
