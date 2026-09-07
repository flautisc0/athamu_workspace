import React from 'react';
import { TeamMember } from '../../types';
import {
  Award,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ExternalLink,
  Drama,
  Sparkles
} from 'lucide-react';

interface EquipoSectionProps {
  team: TeamMember[];
}

export const EquipoSection: React.FC<EquipoSectionProps> = ({ team }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
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

      {/* Grid of the 4 Founders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {team.map((member) => (
          <div
            key={member.id}
            className="p-6 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-lg group"
          >
            <div className="space-y-4">
              
              {/* Avatar + Main Role */}
              <div className="flex items-start gap-4">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10 group-hover:border-[#6ee7b7] transition-colors shrink-0 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">
                    {member.role}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-[#6ee7b7] transition-colors">
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
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[#12141a] text-slate-300 border border-white/5"
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

    </div>
  );
};
