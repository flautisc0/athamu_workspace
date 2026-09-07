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
  ExternalLink
} from 'lucide-react';

interface VenuesSectionProps {
  venues: Venue[];
}

export const VenuesSection: React.FC<VenuesSectionProps> = ({ venues }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

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

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#38bdf8] uppercase tracking-wider">
          <span>8. Salas & Teatros</span>
          <span>•</span>
          <span>Red de Circulación Chilena</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Salas, Teatros & Venues Asociados
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Catastro de teatros y espacios escénicos con información de aforo, tipología de escenario y requerimientos técnicos homologados para giras ATHA.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-[#161920] border border-white/10 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de sala, ciudad o especificaciones..."
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-[#38bdf8]"
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#38bdf8]"
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
            className="p-5 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 shadow-lg"
          >
            <div className="space-y-3">
              
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                    {venue.region}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-1.5">
                    {venue.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{venue.city}</span>
                  </p>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  venue.status === 'Activo / Convenio' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}>
                  {venue.status}
                </span>
              </div>

              {/* Aforo & Stage Type */}
              <div className="p-3 rounded-xl bg-[#12141a] border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Aforo de Sala:</span>
                  </span>
                  <span className="text-white font-mono font-bold text-sm">
                    {venue.capacity} butacas
                  </span>
                </div>

                <div className="pt-1 border-t border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    Tipología de Escenario:
                  </span>
                  <span className="text-slate-200 mt-0.5 block leading-relaxed">
                    {venue.stageType}
                  </span>
                </div>
              </div>

              {/* Specs */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono mb-1">
                  Equipamiento & Rider de Sala:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {venue.specs}
                </p>
              </div>

            </div>

            {/* Contact */}
            <div className="pt-3 border-t border-white/10 text-xs text-slate-400 space-y-1">
              <span className="text-[10px] text-slate-400 block">Jefatura Técnica:</span>
              <div className="text-slate-300 font-medium">{venue.contactPerson}</div>
              <a href={`mailto:${venue.contactEmail}`} className="text-[#38bdf8] hover:underline flex items-center gap-1 font-mono">
                <Mail className="w-3 h-3" />
                <span>{venue.contactEmail}</span>
              </a>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
