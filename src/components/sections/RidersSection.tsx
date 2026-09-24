import React, { useState } from 'react';
import { TechnicalRider, Obra } from '../../types';
import {
  FileSpreadsheet,
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  Sliders,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  FileText
} from 'lucide-react';

interface RidersSectionProps {
  riders: TechnicalRider[];
  obras?: Obra[];
  onSaveRider?: (rider: TechnicalRider) => void;
  onDeleteRider?: (riderId: string) => void;
}

export const RidersSection: React.FC<RidersSectionProps> = ({
  riders,
  obras = [],
  onSaveRider,
  onDeleteRider
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<TechnicalRider | null>(null);
  const [formData, setFormData] = useState<Partial<TechnicalRider>>({
    title: '',
    category: 'Teatro Contemporáneo',
    version: '2025.1',
    description: '',
    pdfFileTitle: 'RIDER_ATHA_OFICIAL.pdf',
    technicalDirector: 'Rodrigo Astudillo',
    keySpecs: []
  });
  const [specsText, setSpecsText] = useState<string>('');

  const handleOpenNew = () => {
    setEditingRider(null);
    setFormData({
      id: `rider-${Date.now()}`,
      title: '',
      category: 'Teatro Contemporáneo',
      version: '2025.1',
      description: '',
      pdfFileTitle: 'RIDER_ATHA_PROD_2025.pdf',
      technicalDirector: 'Rodrigo Astudillo (DT General)',
      keySpecs: []
    });
    setSpecsText(
      'Escenario mínimo: 10m boca x 9m fondo x 6m altura.\nPotencia requerida: Trifásica 380V 32A CEE.\nSonido: Sistema L-Acoustics / d&b con 4 retornos de escenario.\nIluminación: 12 Elation Fuze Profile + 8 Astera Titan Tube.\nTiempo de montaje técnico: 5 horas previas a pasada general.'
    );
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rider: TechnicalRider) => {
    setEditingRider(rider);
    setFormData({ ...rider });
    setSpecsText(rider.keySpecs.join('\n'));
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`¿Confirmas eliminar la plantilla de rider "${title}"?`)) {
      if (onDeleteRider) {
        onDeleteRider(id);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const parsedSpecs = specsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const finalRider: TechnicalRider = {
      id: editingRider ? editingRider.id : formData.id || `rider-${Date.now()}`,
      title: formData.title || 'Rider Estándar',
      category: formData.category || 'Teatro',
      version: formData.version || 'v2025',
      description: formData.description || '',
      pdfFileTitle: formData.pdfFileTitle || 'RIDER_ATHA.pdf',
      technicalDirector: formData.technicalDirector || 'Dirección Técnica ATHA',
      keySpecs: parsedSpecs.length > 0 ? parsedSpecs : ['Especificaciones técnicas según requerimiento del espacio.'],
      lastUpdated: new Date().toLocaleDateString('es-CL')
    };

    if (onSaveRider) {
      onSaveRider(finalRider);
    }
    setIsModalOpen(false);
  };

  const handleCopy = (rider: TechnicalRider) => {
    const text = `
=== ATHA PRODUCCIONES - RIDER TÉCNICO OFICIAL ===
${rider.title.toUpperCase()} (${rider.category})
Versión: ${rider.version} | Archivo: ${rider.pdfFileTitle}
Dirección Técnica: ${rider.technicalDirector}

DESCRIPCIÓN:
${rider.description}

ESPECIFICACIONES TÉCNICAS CLAVE:
${rider.keySpecs.map(e => `• ${e}`).join('\n')}

Contacto Técnico ATHA: contacto@athaproducciones.cl | +56 9 8456 1120
==================================================
`;
    navigator.clipboard.writeText(text);
    setCopiedId(rider.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#a78bfa] uppercase tracking-wider">
            <span>12. Riders Estándar</span>
            <span>•</span>
            <span>Plantillas Técnicas de Gira</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Fichas Técnicas & Protocolos Homologados
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Requerimientos técnicos estándar de ATHA listos para anexar a contratos con teatros, festivales y municipalidades de todo Chile.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#a78bfa] hover:bg-[#9061f9] text-[var(--bg-base)] font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Rider</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-xl border border-white/10 transition-all cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Grid of Riders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {riders.map((rider) => (
          <div
            key={rider.id}
            className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-lg group relative"
          >
            <div className="space-y-4">
              
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30 font-bold">
                    {rider.category}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-1.5">
                    {rider.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    Versión {rider.version} • {rider.pdfFileTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(rider)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Editar rider"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rider.id, rider.title)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar rider"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {rider.description}
              </p>

              {/* Key Specs list */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-[var(--accent-2)] block font-mono">
                  Especificaciones Técnicas Clave:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {rider.keySpecs.map((spec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Responsable técnico */}
              <div className="pt-1 text-xs text-slate-400 flex items-center justify-between">
                <span>Responsable de Ficha:</span>
                <span className="text-white font-mono font-medium">{rider.technicalDirector}</span>
              </div>

            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">ATHA Technical Dept.</span>

              <button
                type="button"
                onClick={() => handleCopy(rider)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#a78bfa]/15 hover:bg-[#a78bfa]/25 text-[#a78bfa] border border-[#a78bfa]/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {copiedId === rider.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Ficha de Rider</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Crear / Editar Rider */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[var(--bg-surface)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#a78bfa]" />
                <h3 className="text-base font-semibold text-white">
                  {editingRider ? 'Editar Rider Técnico' : 'Crear Plantilla de Rider'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Título del Rider *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Rider Estándar Teatro de Sala"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Categoría de Formato
                  </label>
                  <select
                    value={formData.category || 'Teatro de Sala'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#a78bfa]"
                  >
                    <option value="Teatro de Sala">Teatro de Sala</option>
                    <option value="Danza & Performance">Danza & Performance</option>
                    <option value="Concierto / Música En Vivo">Concierto / Música En Vivo</option>
                    <option value="Festival & Espacio Público">Festival & Espacio Público</option>
                    <option value="Teatro Físico & Circo">Teatro Físico & Circo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Versión
                  </label>
                  <input
                    type="text"
                    value={formData.version || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="2025.2"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#a78bfa] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Nombre Archivo PDF
                  </label>
                  <input
                    type="text"
                    value={formData.pdfFileTitle || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, pdfFileTitle: e.target.value }))}
                    placeholder="RIDER_SALA_2025.pdf"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#a78bfa] font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Responsable Técnico
                  </label>
                  <input
                    type="text"
                    value={formData.technicalDirector || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, technicalDirector: e.target.value }))}
                    placeholder="Rodrigo Astudillo"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Descripción General del Requerimiento
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Resumen del montaje técnico y condiciones indispensables del recinto..."
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Especificaciones Técnicas Clave (un requerimiento por línea)
                </label>
                <textarea
                  rows={5}
                  value={specsText}
                  onChange={(e) => setSpecsText(e.target.value)}
                  placeholder="Escenario mínimo: 10m boca x 8m fondo.&#10;Consola digital de al menos 32 canales.&#10;Piso de madera sin clavos ni desniveles."
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#a78bfa] font-mono leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--bg-base)] bg-[#a78bfa] hover:bg-[#9061f9] rounded-lg shadow cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingRider ? 'Guardar Cambios' : 'Crear Rider'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
