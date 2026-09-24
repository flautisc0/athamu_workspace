import React, { useState, useEffect } from 'react';
import { Lead, LeadType, LeadStatus } from '../types';
import { X, Save, UserPlus, Trash2 } from 'lucide-react';

interface EditLeadModalProps {
  lead?: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  onDelete?: (id: string) => void;
}

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>(() => {
    if (lead) {
      return { ...lead };
    }
    return {
      id: `lead-${Date.now()}`,
      name: '',
      organization: '',
      type: 'sala',
      status: 'contactado',
      city: 'Santiago',
      email: '',
      phone: '',
      notes: '',
      lastContactDate: new Date().toLocaleDateString('es-CL'),
      estimatedValueCLP: 3000000,
      assignedTo: 'Francisco Pérez'
    };
  });

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
    } else {
      setFormData({
        id: `lead-${Date.now()}`,
        name: '',
        organization: '',
        type: 'sala',
        status: 'contactado',
        city: 'Santiago',
        email: '',
        phone: '',
        notes: '',
        lastContactDate: new Date().toLocaleDateString('es-CL'),
        estimatedValueCLP: 3000000,
        assignedTo: 'Francisco Pérez'
      });
    }
  }, [lead, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.organization?.trim()) {
      alert('Por favor ingrese el nombre del contacto y la organización.');
      return;
    }
    onSave(formData as Lead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[var(--bg-surface)]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>{lead ? 'Editar Contacto / Lead' : 'Nuevo Contacto Escénico'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Contacto *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Rodrigo Bazaes"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Espacio / Organización *</label>
              <input
                type="text"
                required
                value={formData.organization || ''}
                onChange={e => setFormData({ ...formData, organization: e.target.value })}
                placeholder="Ej. Centro Cultural GAM"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Contacto</label>
              <select
                value={formData.type || 'sala'}
                onChange={e => setFormData({ ...formData, type: e.target.value as LeadType })}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              >
                <option value="sala">Sala / Teatro</option>
                <option value="festival">Festival</option>
                <option value="programador">Programador / Curador</option>
                <option value="artista">Artista / Elenco</option>
                <option value="proveedor">Proveedor Técnico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Estado en Pipeline</label>
              <select
                value={formData.status || 'contactado'}
                onChange={e => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              >
                <option value="contactado">Contactado / Primer acercamiento</option>
                <option value="negociacion">En Negociación / Revisión técnica</option>
                <option value="cerrado">Cerrado / Convenio firmado</option>
                <option value="archivado">Archivado / En pausa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ciudad / Región</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Santiago / Concepción / Valparaíso"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Valor Estimado CLP</label>
              <input
                type="number"
                value={formData.estimatedValueCLP || 0}
                onChange={e => setFormData({ ...formData, estimatedValueCLP: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@teatro.cl"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+56 9 ..."
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Responsable en ATHA</label>
              <select
                value={formData.assignedTo || 'Francisco Pérez'}
                onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              >
                <option value="Francisco Pérez">Francisco Pérez (Dirección)</option>
                <option value="Jo Schultz">Jo Schultz (Creación/Danza)</option>
                <option value="Antonia Fernández">Antonia Fernández (Técnica)</option>
                <option value="Nicolás Ortiz">Nicolás Ortiz (Música)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Último Contacto</label>
              <input
                type="text"
                value={formData.lastContactDate || ''}
                onChange={e => setFormData({ ...formData, lastContactDate: e.target.value })}
                placeholder="dd/mm/aaaa"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notas & Acuerdos de la Conversación</label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalles sobre fechas tentativas, presupuesto, requerimientos especiales..."
              className="w-full px-3 py-2 text-sm bg-[var(--bg-base)] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent-2)]"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            {lead && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Confirma eliminar a ${lead.name} (${lead.organization})?`)) {
                    onDelete(lead.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Lead</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-[var(--bg-base)] bg-[var(--accent-2)] hover:bg-[#5eead4] rounded-lg transition-colors shadow cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
