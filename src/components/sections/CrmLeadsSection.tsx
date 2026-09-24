import React, { useState } from 'react';
import { Lead, LeadType, LeadStatus } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Building2,
  DollarSign,
  UserCheck
} from 'lucide-react';

interface CrmLeadsSectionProps {
  leads: Lead[];
  onOpenNewLead: () => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  theme?: 'terracota' | 'dia';
}

export const CrmLeadsSection: React.FC<CrmLeadsSectionProps> = ({
  leads,
  onOpenNewLead,
  onEditLead,
  onDeleteLead,
  theme = 'dia'
}) => {
  const isDia = theme === 'dia';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedType === 'all' || lead.type === selectedType;

    const matchesStatus =
      selectedStatus === 'all' || lead.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPipelineCLP = filteredLeads.reduce((sum, l) => sum + l.estimatedValueCLP, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider ${
            isDia ? 'text-[var(--accent-terracota)]' : 'text-[#fbbf24]'
          }`}>
            <span>4. CRM / Leads Escénicos</span>
            <span>•</span>
            <span>Red de Salas & Festivales</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight font-display mt-0.5 ${
            isDia ? 'text-stone-900' : 'text-white'
          }`}>
            Gestión de Contactos & Programadores
          </h1>
          <p className={`text-xs mt-1 ${
            isDia ? 'text-stone-600' : 'text-slate-400'
          }`}>
            Directorio activo de salas teatrales, festivales chilenos (Fitam, Biobío, GAM, Matucana 100), curadores y proveedores de equipamiento.
          </p>
        </div>

        <button
          onClick={onOpenNewLead}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap ${
            isDia
              ? 'bg-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)] text-white'
              : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-[var(--bg-base)]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Contacto</span>
        </button>
      </div>

      {/* Filter and stats row */}
      <div className={`p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${
        isDia
          ? 'bg-white border border-[var(--border-color)] shadow-sm'
          : 'bg-[var(--bg-surface)] border border-white/10'
      }`}>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDia ? 'text-stone-400' : 'text-slate-400'
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contacto o sala..."
              className={`w-full pl-9.5 pr-4 py-2.5 text-xs rounded-xl transition-all focus:outline-none ${
                isDia
                  ? 'bg-[var(--bg-base)] border border-[var(--border-color)] text-stone-900 placeholder-stone-400 focus:bg-white focus:border-[var(--accent-terracota)] focus:ring-2 focus:ring-[var(--accent-terracota)]/10'
                  : 'bg-[var(--bg-base)] border border-white/10 text-white placeholder-slate-400 focus:border-[#fbbf24]'
              }`}
            />
          </div>

          {/* Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`w-full sm:w-auto px-3 py-2.5 text-xs rounded-xl transition-colors focus:outline-none ${
              isDia
                ? 'bg-[var(--bg-base)] border border-[var(--border-color)] text-stone-800 focus:bg-white focus:border-[var(--accent-terracota)]'
                : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#fbbf24]'
            }`}
          >
            <option value="all">Todos los Tipos</option>
            <option value="sala">Salas / Teatros</option>
            <option value="festival">Festivales</option>
            <option value="programador">Programadores</option>
            <option value="artista">Artistas</option>
            <option value="proveedor">Proveedores</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`w-full sm:w-auto px-3 py-2.5 text-xs rounded-xl transition-colors focus:outline-none ${
              isDia
                ? 'bg-[var(--bg-base)] border border-[var(--border-color)] text-stone-800 focus:bg-white focus:border-[var(--accent-terracota)]'
                : 'bg-[var(--bg-base)] border border-white/10 text-white focus:border-[#fbbf24]'
            }`}
          >
            <option value="all">Todos los Estados</option>
            <option value="contactado">Contactado</option>
            <option value="negociacion">En Negociación</option>
            <option value="cerrado">Cerrado / Convenio</option>
            <option value="archivado">Archivado</option>
          </select>
        </div>

        <div className={`text-right whitespace-nowrap text-xs font-mono ${
          isDia ? 'text-stone-600' : 'text-slate-400'
        }`}>
          <span>Total en vista: </span>
          <span className={`font-bold ${isDia ? 'text-[var(--accent-terracota)]' : 'text-[#fbbf24]'}`}>
            {formatCLP(totalPipelineCLP)}
          </span>
          <span> ({filteredLeads.length} contactos)</span>
        </div>
      </div>

      {/* Leads Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLeads.map((lead) => {
          const statusBadge =
            lead.status === 'cerrado'
              ? isDia
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : lead.status === 'negociacion'
              ? isDia
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30'
              : lead.status === 'contactado'
              ? isDia
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              : isDia
              ? 'bg-stone-100 text-stone-600 border-stone-200'
              : 'bg-slate-500/15 text-slate-400 border-slate-500/30';

          const typeLabel =
            lead.type === 'sala' ? 'Teatro / Sala' :
            lead.type === 'festival' ? 'Festival' :
            lead.type === 'programador' ? 'Programador' :
            lead.type === 'artista' ? 'Artista' : 'Proveedor';

          return (
            <div
              key={lead.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                isDia
                  ? 'bg-white border-[var(--border-color)] hover:border-[var(--accent-terracota)]/40'
                  : 'bg-[var(--bg-surface)] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-3">
                {/* Header organization & status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                      isDia
                        ? 'bg-stone-100 text-stone-600 border-stone-200'
                        : 'bg-white/5 text-slate-400 border-white/5'
                    }`}>
                      {typeLabel}
                    </span>
                    <h3 className={`text-base font-bold tracking-tight mt-1.5 ${
                      isDia ? 'text-stone-900' : 'text-white'
                    }`}>
                      {lead.organization}
                    </h3>
                    <p className={`text-xs font-medium ${
                      isDia ? 'text-stone-600' : 'text-slate-300'
                    }`}>
                      {lead.name}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${statusBadge}`}>
                    {lead.status}
                  </span>
                </div>

                {/* Location & Contact info */}
                <div className={`space-y-1 text-xs ${
                  isDia ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 ${isDia ? 'text-stone-400' : 'text-slate-400'}`} />
                    <span>{lead.city}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className={`w-3.5 h-3.5 ${isDia ? 'text-stone-400' : 'text-slate-400'}`} />
                      <a href={`mailto:${lead.email}`} className={`truncate ${isDia ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-white'}`}>
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className={`w-3.5 h-3.5 ${isDia ? 'text-stone-400' : 'text-slate-400'}`} />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <p className={`text-xs leading-relaxed p-3 rounded-xl border ${
                  isDia
                    ? 'bg-[var(--bg-base)] border-[#EADFD8] text-stone-700'
                    : 'bg-[var(--bg-surface)] border-white/5 text-slate-300'
                }`}>
                  {lead.notes}
                </p>
              </div>

              {/* Footer with value & actions */}
              <div className={`pt-3 border-t flex items-center justify-between ${
                isDia ? 'border-[var(--border-color)]' : 'border-white/10'
              }`}>
                <div>
                  <span className={`text-[10px] block font-mono ${
                    isDia ? 'text-stone-500' : 'text-slate-400'
                  }`}>
                    Valor Estimado
                  </span>
                  <span className={`text-xs font-bold font-mono ${
                    isDia ? 'text-[var(--accent-terracota)]' : 'text-[#fbbf24]'
                  }`}>
                    {formatCLP(lead.estimatedValueCLP)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEditLead(lead)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isDia
                        ? 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200'
                        : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
                    }`}
                    title="Editar Contacto"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar ${lead.name} (${lead.organization})?`)) {
                        onDeleteLead(lead.id);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isDia
                        ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
                        : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                    }`}
                    title="Eliminar Contacto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredLeads.length === 0 && (
        <div className={`p-12 text-center rounded-2xl border space-y-3 ${
          isDia
            ? 'bg-white border-[var(--border-color)] shadow-sm'
            : 'bg-[var(--bg-surface)] border-white/10'
        }`}>
          <Users2 className={`w-12 h-12 mx-auto ${isDia ? 'text-stone-400' : 'text-slate-400'}`} />
          <h3 className={`text-sm font-semibold ${isDia ? 'text-stone-800' : 'text-white'}`}>No se encontraron contactos</h3>
          <p className={`text-xs ${isDia ? 'text-stone-500' : 'text-slate-400'}`}>
            Ajusta los filtros o haz clic en "Registrar Nuevo Contacto".
          </p>
        </div>
      )}

    </div>
  );
};
