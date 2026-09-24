import React, { useState } from 'react';
import { TeamMember } from '../../types';
import {
  Award,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ExternalLink,
  Drama,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Users
} from 'lucide-react';

interface EquipoSectionProps {
  team: TeamMember[];
  onSaveMember: (member: TeamMember) => void;
  onDeleteMember: (memberId: string) => void;
}

export const EquipoSection: React.FC<EquipoSectionProps> = ({
  team,
  onSaveMember,
  onDeleteMember
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);

  const handleOpenAdd = () => {
    setEditingMember({
      id: `team-${Date.now()}`,
      name: '',
      role: 'Socio / Director',
      title: 'Dirección de Producción',
      email: '',
      phone: '+56 9 ',
      location: 'Santiago, Chile',
      bio: '',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      activeProjects: ['Nuevas Producciones']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember({ ...member });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name) return;

    const saved: TeamMember = {
      id: editingMember.id || `team-${Date.now()}`,
      name: editingMember.name,
      role: editingMember.role || 'Equipo Directivo',
      title: editingMember.title || '',
      email: editingMember.email || '',
      phone: editingMember.phone || '',
      location: editingMember.location || 'Santiago, Chile',
      bio: editingMember.bio || '',
      image: editingMember.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      discipline: editingMember.discipline || editingMember.role || 'Artes Escénicas',
      activeProjects: Array.isArray(editingMember.activeProjects)
        ? editingMember.activeProjects
        : (editingMember.activeProjects ? String(editingMember.activeProjects).split(',').map(s => s.trim()) : [])
    };

    onSaveMember(saved);
    setIsModalOpen(false);
    setEditingMember(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#fbbf24] uppercase tracking-wider">
            <span>7. Socios & Equipo Directivo</span>
            <span>•</span>
            <span>Gobernanza ATHA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Socios Fundadores de ATHA Producciones
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Equipo interdisciplinario que lidera las cuatro direcciones fundamentales de la productora: gestión ejecutiva, creación coreográfica y dirección escénica, producción técnica e iluminación, e ingeniería acústica y música.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[var(--bg-base)] font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Miembro</span>
        </button>
      </div>

      {/* Grid of the Founders & Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {team.map((member) => (
          <div
            key={member.id}
            className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-lg group relative"
          >
            <div className="space-y-4">
              
              {/* Avatar + Main Role + Action Buttons */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10 group-hover:border-[var(--accent-2)] transition-colors shrink-0 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">
                      {member.role}
                    </span>
                    <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-[var(--accent-2)] transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      {member.title}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {member.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(member)}
                    title="Editar miembro"
                    className="p-1.5 text-slate-400 hover:text-[#fbbf24] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar a "${member.name}" del equipo?`)) {
                        onDeleteMember(member.id);
                      }
                    }}
                    title="Eliminar miembro"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {member.bio}
              </p>

              {/* Active Projects tags */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Proyectos Activos Asignados:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {member.activeProjects.map((proj, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg-surface)] text-slate-300 border border-white/5"
                    >
                      {proj}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Contact info footer */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{member.email}</span>
              </a>

              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{member.phone}</span>
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Add / Edit Team Member */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[var(--bg-surface)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#fbbf24]" />
                <h3 className="text-base font-semibold text-white">
                  {team.some(m => m.id === editingMember.id) ? `Editar Ficha: ${editingMember.name}` : 'Nuevo Integrante del Equipo'}
                </h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingMember(null); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMember.name || ''}
                    onChange={e => setEditingMember(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Francisco Pérez"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Rol Institucional
                  </label>
                  <input
                    type="text"
                    value={editingMember.role || ''}
                    onChange={e => setEditingMember(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="Ej. Socio Fundador / Director"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cargo / Especialidad
                  </label>
                  <input
                    type="text"
                    value={editingMember.title || ''}
                    onChange={e => setEditingMember(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej. Productor General & Finanzas"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Ciudad / Ubicación
                  </label>
                  <input
                    type="text"
                    value={editingMember.location || ''}
                    onChange={e => setEditingMember(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej. Santiago, Chile"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={editingMember.email || ''}
                    onChange={e => setEditingMember(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="correo@athaproducciones.cl"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editingMember.phone || ''}
                    onChange={e => setEditingMember(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+56 9 8765 4321"
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  URL Fotografía
                </label>
                <input
                  type="url"
                  value={editingMember.image || ''}
                  onChange={e => setEditingMember(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Biografía / Trayectoria
                </label>
                <textarea
                  rows={3}
                  value={editingMember.bio || ''}
                  onChange={e => setEditingMember(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Resumen curricular y rol artístico o técnico en la compañía..."
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Proyectos Activos (separados por coma)
                </label>
                <input
                  type="text"
                  value={Array.isArray(editingMember.activeProjects) ? editingMember.activeProjects.join(', ') : (editingMember.activeProjects || '')}
                  onChange={e => setEditingMember(prev => ({ ...prev, activeProjects: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="Ej. El Canto de las Ballenas, Sesiones Acústicas"
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                {editingMember.id && team.some(m => m.id === editingMember.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar a "${editingMember.name}" del equipo?`)) {
                        onDeleteMember(editingMember.id!);
                        setIsModalOpen(false);
                        setEditingMember(null);
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
                    onClick={() => { setIsModalOpen(false); setEditingMember(null); }}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--bg-base)] bg-[#fbbf24] hover:bg-[#f59e0b] rounded-lg shadow cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Miembro</span>
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

