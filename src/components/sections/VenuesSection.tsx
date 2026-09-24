import React, { useState } from 'react';
import { Venue } from '../../types';
import {
  Building2,
  MapPin,
  Users,
  Mail,
  Search,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Phone
} from 'lucide-react';

interface VenuesSectionProps {
  venues: Venue[];
  onSaveVenue: (venue: Venue) => void;
  onDeleteVenue: (venueId: string) => void;
  theme?: 'terracota' | 'dia';
}

export const VenuesSection: React.FC<VenuesSectionProps> = ({
  venues,
  onSaveVenue,
  onDeleteVenue,
  theme = 'dia'
}) => {
  const isDia = theme === 'dia';
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Partial<Venue> | null>(null);

  const filteredVenues = venues.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.specs.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion =
      regionFilter === 'all' || v.region === regionFilter;

    return matchesSearch && matchesRegion;
  });

  const regions = Array.from(new Set(venues.map(v => v.region)));

  const handleOpenAdd = () => {
    setEditingVenue({
      id: `venue-${Date.now()}`,
      name: '',
      city: 'Santiago',
      region: 'Región Metropolitana',
      capacity: 350,
      stageType: 'Italiano (boca 12m x prof 10m x alto 7m)',
      specs: 'Vara motorizada, parrilla completa, consola GrandMA2, PA Meyer Sound.',
      contactPerson: 'Jefe Técnico de Sala',
      contactEmail: 'tecnica@teatro.cl',
      contactPhone: '+56 9 1234 5678',
      status: 'Activo / Convenio'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Venue) => {
    setEditingVenue({ ...v });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue || !editingVenue.name) return;

    const saved: Venue = {
      id: editingVenue.id || `venue-${Date.now()}`,
      name: editingVenue.name,
      city: editingVenue.city || 'Santiago',
      region: editingVenue.region || 'Región Metropolitana',
      capacity: Number(editingVenue.capacity) || 100,
      stageType: editingVenue.stageType || 'Caja negra adaptable',
      specs: editingVenue.specs || 'Rider técnico estándar',
      contactPerson: editingVenue.contactPerson || 'Administración de Sala',
      contactEmail: editingVenue.contactEmail || 'contacto@teatro.cl',
      contactPhone: editingVenue.contactPhone || '+56 9 ',
      status: editingVenue.status || 'Activo / Convenio'
    };

    onSaveVenue(saved);
    setIsModalOpen(false);
    setEditingVenue(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider ${
            isDia ? 'text-[var(--accent-terracota)]' : 'text-[#38bdf8]'
          }`}>
            <span>8. Salas & Teatros</span>
            <span>•</span>
            <span>Red de Circulación Chilena</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight font-display mt-0.5 ${
            isDia ? 'text-stone-900' : 'text-white'
          }`}>
            Salas, Teatros & Venues Asociados
          </h1>
          <p className={`text-xs mt-1 ${
            isDia ? 'text-stone-600' : 'text-slate-400'
          }`}>
            Catastro de teatros y espacios escénicos con información de aforo, tipología de escenario y requerimientos técnicos homologados para giras ATHA.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer shrink-0 ${
            isDia
              ? 'bg-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)] text-white'
              : 'bg-[#38bdf8] hover:bg-[#0284c7] text-[var(--bg-base)]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Sala / Teatro</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 transition-colors ${
        isDia
          ? 'bg-white border border-[var(--border-color)] shadow-sm'
          : 'bg-[var(--bg-surface)] border border-white/10'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDia ? 'text-stone-400' : 'text-slate-400'
          }`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de sala, ciudad o especificaciones..."
            className={`w-full pl-9.5 pr-4 py-2.5 text-xs rounded-xl transition-all focus:outline-none ${
              isDia
                ? 'bg-[var(--bg-base)] border border-[var(--border-color)] text-stone-900 placeholder-stone-400 focus:bg-white focus:border-[var(--accent-terracota)] focus:ring-2 focus:ring-[var(--accent-terracota)]/10'
                : 'bg-[var(--bg-base)] border border-white/10 text-white placeholder-slate-400 focus:border-[#38bdf8]'
            }`}
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className={`w-full sm:w-auto px-3 py-2.5 text-xs rounded-xl transition-colors focus:outline-none ${
            isDia
              ? 'bg-[var(--bg-base)] border border-[var(--border-color)] text-stone-800 focus:bg-white focus:border-[var(--accent-terracota)]'
              : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
          }`}
        >
          <option value="all">Todas las Regiones</option>
          {regions.map((reg) => (
            <option key={reg} value={reg}>{reg}</option>
          ))}
        </select>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVenues.map((venue) => (
          <div
            key={venue.id}
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md group relative ${
              isDia
                ? 'bg-white border-[var(--border-color)] hover:border-[var(--accent-terracota)]/40'
                : 'bg-[var(--bg-surface)] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="space-y-3">
              
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    isDia
                      ? 'bg-stone-100 text-stone-700 border-stone-200'
                      : 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                  }`}>
                    {venue.region}
                  </span>
                  <h3 className={`text-base font-bold tracking-tight mt-1.5 ${
                    isDia ? 'text-stone-900' : 'text-white'
                  }`}>
                    {venue.name}
                  </h3>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${
                    isDia ? 'text-stone-500' : 'text-slate-400'
                  }`}>
                    <MapPin className={`w-3 h-3 ${isDia ? 'text-stone-400' : 'text-slate-400'}`} />
                    <span>{venue.city}</span>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    venue.status === 'Activo / Convenio'
                      ? isDia
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isDia
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {venue.status}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(venue)}
                      title="Editar sala"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDia
                          ? 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'
                          : 'text-slate-400 hover:text-[#38bdf8] hover:bg-white/5'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la sala "${venue.name}"?`)) {
                          onDeleteVenue(venue.id);
                        }
                      }}
                      title="Eliminar sala"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDia
                          ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                          : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Aforo & Stage Type */}
              <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                isDia
                  ? 'bg-[var(--bg-base)] border-[#EADFD8]'
                  : 'bg-[var(--bg-surface)] border-white/5'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 ${isDia ? 'text-stone-600' : 'text-slate-400'}`}>
                    <Users className={`w-3.5 h-3.5 ${isDia ? 'text-stone-400' : 'text-slate-400'}`} />
                    <span>Aforo de Sala:</span>
                  </span>
                  <span className={`font-mono font-bold text-sm ${isDia ? 'text-stone-900' : 'text-white'}`}>
                    {venue.capacity} butacas
                  </span>
                </div>

                <div className={`pt-1 border-t ${isDia ? 'border-[var(--border-color)]' : 'border-white/5'}`}>
                  <span className={`text-[10px] uppercase block font-semibold ${
                    isDia ? 'text-stone-500' : 'text-slate-400'
                  }`}>
                    Tipología de Escenario:
                  </span>
                  <span className={`mt-0.5 block leading-relaxed ${
                    isDia ? 'text-stone-800' : 'text-slate-200'
                  }`}>
                    {venue.stageType}
                  </span>
                </div>
              </div>

              {/* Specs */}
              <div>
                <span className={`text-[10px] uppercase font-semibold block font-mono mb-1 ${
                  isDia ? 'text-stone-500' : 'text-slate-400'
                }`}>
                  Equipamiento & Rider de Sala:
                </span>
                <p className={`text-xs leading-relaxed ${
                  isDia ? 'text-stone-700' : 'text-slate-300'
                }`}>
                  {venue.specs}
                </p>
              </div>

            </div>

            {/* Contact */}
            <div className={`pt-3 border-t text-xs space-y-1 ${
              isDia ? 'border-[var(--border-color)] text-stone-600' : 'border-white/10 text-slate-400'
            }`}>
              <span className={`text-[10px] block ${isDia ? 'text-stone-400' : 'text-slate-400'}`}>Jefatura Técnica:</span>
              <div className={`font-medium ${isDia ? 'text-stone-800' : 'text-slate-300'}`}>{venue.contactPerson}</div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${venue.contactEmail}`}
                  className={`flex items-center gap-1 font-mono text-[11px] hover:underline ${
                    isDia ? 'text-[var(--accent-terracota)]' : 'text-[#38bdf8]'
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  <span>{venue.contactEmail}</span>
                </a>
                {venue.contactPhone && (
                  <span className={`flex items-center gap-1 font-mono text-[11px] ${
                    isDia ? 'text-stone-600' : 'text-slate-400'
                  }`}>
                    <Phone className="w-3 h-3" />
                    <span>{venue.contactPhone}</span>
                  </span>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Add / Edit Venue */}
      {isModalOpen && editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${
            isDia
              ? 'bg-white border border-[var(--border-color)] text-stone-800'
              : 'bg-[var(--bg-surface)] border border-white/10 text-slate-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDia
                ? 'bg-[var(--bg-base)] border-[var(--border-color)]'
                : 'bg-[var(--bg-surface)] border-white/10'
            }`}>
              <div className="flex items-center gap-2">
                <Building2 className={`w-5 h-5 ${isDia ? 'text-[var(--accent-terracota)]' : 'text-[#38bdf8]'}`} />
                <h3 className={`text-base font-semibold ${isDia ? 'text-stone-900' : 'text-white'}`}>
                  {venues.some(v => v.id === editingVenue.id) ? `Editar: ${editingVenue.name}` : 'Nueva Sala o Teatro'}
                </h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingVenue(null); }}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDia
                    ? 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${
                  isDia ? 'text-stone-700' : 'text-slate-300'
                }`}>
                  Nombre del Espacio / Teatro *
                </label>
                <input
                  type="text"
                  required
                  value={editingVenue.name || ''}
                  onChange={e => setEditingVenue(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Teatro Municipal de Las Condes"
                  className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                    isDia
                      ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                      : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={editingVenue.city || ''}
                    onChange={e => setEditingVenue(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ej. Santiago"
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Región
                  </label>
                  <input
                    type="text"
                    value={editingVenue.region || ''}
                    onChange={e => setEditingVenue(prev => ({ ...prev, region: e.target.value }))}
                    placeholder="Ej. Región Metropolitana"
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Aforo (Número de Butacas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingVenue.capacity ?? 300}
                    onChange={e => setEditingVenue(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Estado de Relación / Convenio
                  </label>
                  <select
                    value={editingVenue.status || 'Activo / Convenio'}
                    onChange={e => setEditingVenue(prev => ({ ...prev, status: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  >
                    <option value="Activo / Convenio">Activo / Convenio</option>
                    <option value="En Conversaciones">En Conversaciones</option>
                    <option value="Inactivo / Por Visitar">Inactivo / Por Visitar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${
                  isDia ? 'text-stone-700' : 'text-slate-300'
                }`}>
                  Tipología y Dimensiones de Escenario
                </label>
                <input
                  type="text"
                  value={editingVenue.stageType || ''}
                  onChange={e => setEditingVenue(prev => ({ ...prev, stageType: e.target.value }))}
                  placeholder="Ej. Italiano con foso (boca 14m x prof 12m x alto 8m)"
                  className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                    isDia
                      ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                      : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${
                  isDia ? 'text-stone-700' : 'text-slate-300'
                }`}>
                  Equipamiento Técnico y Rider de Sala
                </label>
                <textarea
                  rows={3}
                  value={editingVenue.specs || ''}
                  onChange={e => setEditingVenue(prev => ({ ...prev, specs: e.target.value }))}
                  placeholder="Detalla iluminación, sonido, varas, tiros contrapesados, pantalla o proyector..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                    isDia
                      ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                      : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Contacto / Jefe Técnico
                  </label>
                  <input
                    type="text"
                    value={editingVenue.contactPerson || ''}
                    onChange={e => setEditingVenue(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Ej. Claudio Morales"
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Email Técnico
                  </label>
                  <input
                    type="email"
                    value={editingVenue.contactEmail || ''}
                    onChange={e => setEditingVenue(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="tecnica@teatro.cl"
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${
                    isDia ? 'text-stone-700' : 'text-slate-300'
                  }`}>
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editingVenue.contactPhone || ''}
                    onChange={e => setEditingVenue(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+56 9 8765 4321"
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none ${
                      isDia
                        ? 'bg-[var(--bg-base)] border-[var(--border-color)] text-stone-900 focus:bg-white focus:border-[var(--accent-terracota)]'
                        : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#38bdf8]'
                    }`}
                  />
                </div>
              </div>

              <div className={`pt-4 flex items-center justify-between border-t ${
                isDia ? 'border-[var(--border-color)]' : 'border-white/10'
              }`}>
                {editingVenue.id && venues.some(v => v.id === editingVenue.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar definitivamente "${editingVenue.name}"?`)) {
                        onDeleteVenue(editingVenue.id!);
                        setIsModalOpen(false);
                        setEditingVenue(null);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      isDia
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                        : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingVenue(null); }}
                    className={`px-4 py-2 text-xs rounded-lg cursor-pointer ${
                      isDia
                        ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm cursor-pointer ${
                      isDia
                        ? 'text-white bg-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)]'
                        : 'text-[var(--bg-base)] bg-[#38bdf8] hover:bg-[#0284c7]'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Sala</span>
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
