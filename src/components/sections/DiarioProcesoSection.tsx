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
  Camera
} from 'lucide-react';

interface DiarioProcesoSectionProps {
  logs: ProcessLog[];
  obras: Obra[];
  onAddLog: (log: ProcessLog) => void;
}

export const DiarioProcesoSection: React.FC<DiarioProcesoSectionProps> = ({
  logs,
  obras,
  onAddLog
}) => {
  const [selectedObraId, setSelectedObraId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Log State
  const [newLog, setNewLog] = useState<Partial<ProcessLog>>({
    obraId: obras[0]?.id || '',
    obraTitle: obras[0]?.title || '',
    author: 'Jo Schultz (Dirección)',
    date: new Date().toLocaleDateString('es-CL'),
    title: '',
    entry: '',
    tags: ['Ensayo', 'Dramaturgia']
  });

  const filteredLogs = logs.filter(
    l => selectedObraId === 'all' || l.obraId === selectedObraId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.title || !newLog.entry) return;

    const matchedObra = obras.find(o => o.id === newLog.obraId);

    const created: ProcessLog = {
      id: `log-${Date.now()}`,
      obraId: newLog.obraId || 'obra-01',
      obraTitle: matchedObra?.title || 'Montaje ATHA',
      date: newLog.date || new Date().toLocaleDateString('es-CL'),
      author: newLog.author || 'Equipo de Dirección',
      title: newLog.title || '',
      entry: newLog.entry || '',
      tags: newLog.tags || ['Bitácora']
    };

    onAddLog(created);
    setIsModalOpen(false);
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
          onClick={() => setIsModalOpen(true)}
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
            className="p-6 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-lg"
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

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{log.author}</span>
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

      {/* Modal Add Log */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[#12141a] flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Escribir en el Diario de Proceso</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Obra / Montaje</label>
                <select
                  value={newLog.obraId}
                  onChange={e => {
                    const o = obras.find(item => item.id === e.target.value);
                    setNewLog({ ...newLog, obraId: e.target.value, obraTitle: o?.title || '' });
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
                  value={newLog.title}
                  onChange={e => setNewLog({ ...newLog, title: e.target.value })}
                  placeholder="Ej. Hallazgo en la escena 3: el silencio como soporte corporal"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Autor / Responsable</label>
                <input
                  type="text"
                  value={newLog.author}
                  onChange={e => setNewLog({ ...newLog, author: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Apuntes & Reflexión Creativa *</label>
                <textarea
                  required
                  rows={5}
                  value={newLog.entry}
                  onChange={e => setNewLog({ ...newLog, entry: e.target.value })}
                  placeholder="Describe los descubrimientos de ensayo, ajustes de vestuario o iluminación..."
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24] leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-[#0f1115] bg-[#fbbf24] hover:bg-[#f59e0b] rounded-lg shadow"
                >
                  Guardar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
