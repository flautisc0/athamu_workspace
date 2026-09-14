import React, { useState, useEffect } from 'react';
import { Obra, Discipline, ObraStatus } from '../types';
import { X, Save, Plus, Trash2 } from 'lucide-react';

interface EditObraModalProps {
  obra?: Obra | null; // if null, creating new
  isOpen: boolean;
  onClose: () => void;
  onSave: (obra: Obra) => void;
  onDelete?: (id: string) => void;
}

export const EditObraModal: React.FC<EditObraModalProps> = ({ obra, isOpen, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Obra>>(() => {
    if (obra) {
      return { ...obra };
    }
    return {
      id: `obra-${Date.now()}`,
      title: '',
      discipline: 'Teatro',
      format: 'Sala Principal',
      duration: '75 min',
      targetAudience: '+14 años',
      status: 'En producción',
      synopsis: '',
      castTeam: {
        direction: '',
        cast: [''],
        music: '',
        technical: ''
      },
      technicalRider: {
        minStageWidthMeters: 10,
        minStageDepthMeters: 8,
        lighting: 'Parrilla teatral básica, 12 focos LED y 8 recortes.',
        sound: 'Sistema PA estéreo, 2 monitores de piso y 4 micrófonos inalámbricos.',
        loadInHours: 5,
        crewRequired: 3
      },
      economics: {
        feeCLP: 3000000,
        ticketSplitEstimatedCLP: 4500000,
        productionCostCLP: 6000000
      },
      premiereDate: 'Primer Semestre 2025',
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1000&q=80',
      dossierHighlights: ['Nueva producción ATHA'],
      notes: ''
    };
  });

  const [castInput, setCastInput] = useState<string>(
    formData.castTeam?.cast ? formData.castTeam.cast.join(', ') : ''
  );

  useEffect(() => {
    if (obra) {
      setFormData({ ...obra });
      setCastInput(obra.castTeam?.cast ? obra.castTeam.cast.join(', ') : '');
    }
  }, [obra, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      alert('Por favor ingrese el título de la obra.');
      return;
    }

    const updatedObra: Obra = {
      ...(formData as Obra),
      castTeam: {
        direction: formData.castTeam?.direction || '',
        cast: castInput.split(',').map(s => s.trim()).filter(Boolean),
        music: formData.castTeam?.music || '',
        technical: formData.castTeam?.technical || ''
      }
    };

    onSave(updatedObra);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#161920] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12141a]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>{obra ? 'Editar Ficha de Obra' : 'Crear Nuevo Montaje Escénico'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          
          {/* General info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6ee7b7]">Información General</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Título de la Obra *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej. La Memoria de las Aguas"
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Disciplina</label>
                <select
                  value={formData.discipline || 'Teatro'}
                  onChange={e => setFormData({ ...formData, discipline: e.target.value as Discipline })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                >
                  <option value="Teatro">Teatro</option>
                  <option value="Danza">Danza</option>
                  <option value="Música">Música</option>
                  <option value="Festival">Festival</option>
                  <option value="Interdisciplinar">Interdisciplinar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Estado de la Obra</label>
                <select
                  value={formData.status || 'En producción'}
                  onChange={e => setFormData({ ...formData, status: e.target.value as ObraStatus })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                >
                  <option value="En producción">En producción</option>
                  <option value="En gira">En gira</option>
                  <option value="En repertorio">En repertorio</option>
                  <option value="Estreno">Estreno</option>
                  <option value="I+D">I+D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Formato de Escenario</label>
                <input
                  type="text"
                  value={formData.format || ''}
                  onChange={e => setFormData({ ...formData, format: e.target.value })}
                  placeholder="Ej. Caja Negra / Sala Grande / Espacio Público"
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Duración</label>
                <input
                  type="text"
                  value={formData.duration || ''}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Ej. 70 min"
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Público Objetivo</label>
                <input
                  type="text"
                  value={formData.targetAudience || ''}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="Ej. +14 años / Todo espectador"
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fecha / Lugar de Estreno</label>
                <input
                  type="text"
                  value={formData.premiereDate || ''}
                  onChange={e => setFormData({ ...formData, premiereDate: e.target.value })}
                  placeholder="Ej. Octubre 2024 (Teatro Biobío)"
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Imagen de Afiche / Portada</label>
                <input
                  type="url"
                  value={formData.image || ''}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Sinopsis de la Obra</label>
                <textarea
                  rows={3}
                  value={formData.synopsis || ''}
                  onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                  placeholder="Descripción dramática, temática y propuesta estética..."
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>
            </div>
          </div>

          {/* Elenco & Ficha Artística */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#38bdf8]">Ficha Artística & Acompañantes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dirección General</label>
                <input
                  type="text"
                  value={formData.castTeam?.direction || ''}
                  onChange={e => setFormData({
                    ...formData,
                    castTeam: { ...formData.castTeam!, direction: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Diseño Sonoro / Música</label>
                <input
                  type="text"
                  value={formData.castTeam?.music || ''}
                  onChange={e => setFormData({
                    ...formData,
                    castTeam: { ...formData.castTeam!, music: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Técnica & Iluminación</label>
                <input
                  type="text"
                  value={formData.castTeam?.technical || ''}
                  onChange={e => setFormData({
                    ...formData,
                    castTeam: { ...formData.castTeam!, technical: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Elenco (separado por comas)</label>
                <input
                  type="text"
                  value={castInput}
                  onChange={e => setCastInput(e.target.value)}
                  placeholder="Catalina Valenzuela, Ignacio Araya, etc."
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>
            </div>
          </div>

          {/* Economía & Rider */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#fbbf24]">Economía & Rider Resumido</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Caché Referencial (CLP)</label>
                <input
                  type="number"
                  value={formData.economics?.feeCLP || 0}
                  onChange={e => setFormData({
                    ...formData,
                    economics: { ...formData.economics!, feeCLP: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Horas de Montaje</label>
                <input
                  type="number"
                  value={formData.technicalRider?.loadInHours || 4}
                  onChange={e => setFormData({
                    ...formData,
                    technicalRider: { ...formData.technicalRider!, loadInHours: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Técnicos Requeridos</label>
                <input
                  type="number"
                  value={formData.technicalRider?.crewRequired || 3}
                  onChange={e => setFormData({
                    ...formData,
                    technicalRider: { ...formData.technicalRider!, crewRequired: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 text-sm bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            {obra && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Estás seguro de eliminar "${obra.title}" del repertorio?`)) {
                    onDelete(obra.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Obra</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-lg transition-colors shadow cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Ficha</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
