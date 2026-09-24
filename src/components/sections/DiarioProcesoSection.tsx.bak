import React, { useState } from 'react';
import { ProcessLog, Obra } from '../../types';
import {
  BookOpenText,
  Plus,
  Calendar,
  User,
  Tag,
  Sparkles,
  Search,
  Camera,
  Edit2,
  Trash2,
  X,
  Save
} from 'lucide-react';

interface DiarioProcesoSectionProps {
  logs: ProcessLog[];
  obras: Obra[];
  onAddLog: (log: ProcessLog) => void;
  onSaveLog?: (log: ProcessLog) => void;
  onDeleteLog?: (logId: string) => void;
}

export const DiarioProcesoSection: React.FC<DiarioProcesoSectionProps> = ({
  logs,
  obras,
  onAddLog,
  onSaveLog,
  onDeleteLog
}) => {
  const [selectedObraId, setSelectedObraId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Log State (both create and edit)
  const [modalLog, setModalLog] = useState<Partial<ProcessLog> | null>(null);

  const filteredLogs = logs.filter(
    l => selectedObraId === 'all' || l.obraId === selectedObraId
  );

  const handleOpenAdd = () => {
    setModalLog({
      id: `log-${Date.now()}`,
      obraId: obras[0]?.id || '',
      obraTitle: obras[0]?.title || '',
      author: 'Jo Schultz (Dirección)',
      date: new Date().toLocaleDateString('es-CL'),
      title: '',
      entry: '',
      tags: ['Ensayo', 'Dramaturgia']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: ProcessLog) => {
    setModalLog({ ...log });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalLog || !modalLog.title || !modalLog.entry) return;

    const matchedObra = obras.find(o => o.id === modalLog.obraId);

    const saved: ProcessLog = {
      id: modalLog.id || `log-${Date.now()}`,
      obraId: modalLog.obraId || obras[0]?.id || 'obra-01',
      obraTitle: matchedObra?.title || modalLog.obraTitle || 'Montaje ATHA',
      date: modalLog.date || new Date().toLocaleDateString('es-CL'),
      author: modalLog.author || 'Equipo de Dirección',
      title: modalLog.title || '',
      entry: modalLog.entry || '',
      tags: modalLog.tags && modalLog.tags.length > 0 ? modalLog.tags : ['Bitácora']
    };

    const isExisting = logs.some(l => l.id === saved.id);
    if (isExisting && onSaveLog) {
      onSaveLog(saved);
    } else {
      onAddLog(saved);
    }

    setIsModalOpen(false);
    setModalLog(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#fbbf24] uppercase tracking-wider">
            <span>11. Diario de Proceso Creativo</span>
            <span>•</span>
            <span>Bitácora de Ensayos</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Memorias, Cuadernos de Dirección & Registro
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Espacio de reflexión dramatúrgica, hallazgos de movimiento, decisiones sonoras y notas de ensayos de las obras de ATHA.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f1115] text-xs font-semibold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Entrada de Bitácora</span>
        </button>
      </div>

      {/* Filter by Obra */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 text-xs">
        <button
          onClick={() => setSelectedObraId('all')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
            selectedObraId === 'all'
              ? 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Todas las Obras ({logs.length})
        </button>
        {obras.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelectedObraId(o.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedObraId === o.id
                ? 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {o.title}
          </button>
        ))}
      </div>

      {/* Timeline Entries */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="p-6 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-lg group relative"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#6ee7b7]">
                  {log.obraTitle}
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs font-mono text-slate-400">
                  {log.date}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{log.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(log)}
                    title="Editar entrada"
                    className="p-1.5 text-slate-400 hover:text-[#fbbf24] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {onDeleteLog && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la entrada "${log.title}"?`)) {
                          onDeleteLog(log.id);
                        }
                      }}
                      title="Eliminar entrada"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              {log.title}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {log.entry}
            </p>

            {/* Tags */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5">
              {log.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-[#fbbf24] border border-[#fbbf24]/20 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Log */}
      {isModalOpen && modalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[#12141a] flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                {logs.some(l => l.id === modalLog.id) ? 'Editar Entrada de Bitácora' : 'Escribir en el Diario de Proceso'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setModalLog(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Obra / Montaje</label>
                <select
                  value={modalLog.obraId || obras[0]?.id}
                  onChange={e => {
                    const o = obras.find(item => item.id === e.target.value);
                    setModalLog(prev => ({ ...prev, obraId: e.target.value, obraTitle: o?.title || '' }));
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                >
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título de la Entrada *</label>
                <input
                  type="text"
                  required
                  value={modalLog.title || ''}
                  onChange={e => setModalLog(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. Hallazgo en la escena 3: el silencio como soporte corporal"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Autor / Responsable</label>
                  <input
                    type="text"
                    value={modalLog.author || ''}
                    onChange={e => setModalLog(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fecha</label>
                  <input
                    type="text"
                    value={modalLog.date || ''}
                    onChange={e => setModalLog(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Apuntes & Reflexión Creativa *</label>
                <textarea
                  required
                  rows={5}
                  value={modalLog.entry || ''}
                  onChange={e => setModalLog(prev => ({ ...prev, entry: e.target.value }))}
                  placeholder="Describe los descubrimientos de ensayo, ajustes de vestuario o iluminación..."
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24] leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                {modalLog.id && logs.some(l => l.id === modalLog.id) && onDeleteLog ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar la entrada "${modalLog.title}"?`)) {
                        onDeleteLog(modalLog.id!);
                        setIsModalOpen(false);
                        setModalLog(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setModalLog(null); }}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0f1115] bg-[#fbbf24] hover:bg-[#f59e0b] rounded-lg shadow cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar en Bitácora</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
