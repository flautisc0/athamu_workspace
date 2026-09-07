import React, { useState } from 'react';
import { Obra, Discipline, ObraStatus } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  Drama,
  Plus,
  Search,
  Filter,
  Eye,
  FileDown,
  Edit,
  Sliders,
  Users,
  DollarSign,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';

interface CatalogoObrasSectionProps {
  obras: Obra[];
  onOpenDossier: (obra: Obra) => void;
  onEditObra: (obra: Obra) => void;
  onNewObra: () => void;
}

export const CatalogoObrasSection: React.FC<CatalogoObrasSectionProps> = ({
  obras,
  onOpenDossier,
  onEditObra,
  onNewObra
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedObraId, setExpandedObraId] = useState<string | null>(null);

  const filteredObras = obras.filter((obra) => {
    const matchesSearch =
      obra.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.synopsis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.castTeam.direction.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDiscipline =
      selectedDiscipline === 'all' || obra.discipline === selectedDiscipline;

    const matchesStatus =
      selectedStatus === 'all' || obra.status === selectedStatus;

    return matchesSearch && matchesDiscipline && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header & New Obra Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6ee7b7] uppercase tracking-wider">
            <span>2. Catálogo de Obras</span>
            <span>•</span>
            <span>Repertorio ATHA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Montajes Escénicos & Producciones
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fichas técnicas completas de teatro, danza contemporánea, música en vivo y festivales con generación de dossiers oficiales para programadores.
          </p>
        </div>

        <button
          onClick={onNewObra}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6ee7b7] hover:bg-[#5eead4] text-[#0f1115] text-xs font-semibold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Montaje Escénico</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#161920] border border-white/10 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, dirección, temática o elenco..."
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-[#6ee7b7]"
          />
        </div>

        {/* Discipline filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ee7b7]"
          >
            <option value="all">Todas las Disciplinas</option>
            <option value="Teatro">Teatro</option>
            <option value="Danza">Danza</option>
            <option value="Música">Música</option>
            <option value="Festival">Festival</option>
            <option value="Interdisciplinar">Interdisciplinar</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ee7b7]"
          >
            <option value="all">Todos los Estados</option>
            <option value="En gira">En gira</option>
            <option value="En producción">En producción</option>
            <option value="En repertorio">En repertorio</option>
            <option value="Estreno">Estreno</option>
            <option value="I+D">I+D</option>
          </select>
        </div>
      </div>

      {/* Grid of Obras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredObras.map((obra) => {
          const isExpanded = expandedObraId === obra.id;
          return (
            <div
              key={obra.id}
              className="rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col overflow-hidden group shadow-lg"
            >
              {/* Image & Status tag */}
              <div className="relative aspect-[16/10] overflow-hidden bg-black">
                <img
                  src={obra.image}
                  alt={obra.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#161920] via-transparent to-transparent" />
                
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-mono font-bold bg-black/60 backdrop-blur-md text-white border border-white/10">
                    {obra.discipline}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-semibold backdrop-blur-md ${
                    obra.status === 'En gira' ? 'bg-emerald-500/80 text-white' :
                    obra.status === 'Estreno' ? 'bg-amber-500/80 text-black font-bold' :
                    obra.status === 'En repertorio' ? 'bg-sky-500/80 text-white' :
                    'bg-purple-500/80 text-white'
                  }`}>
                    {obra.status}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {obra.duration}
                  </span>
                  <span>{obra.targetAudience}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-[#6ee7b7] transition-colors">
                    {obra.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {obra.format} • Estreno: {obra.premiereDate}
                  </p>

                  <p className="text-xs text-slate-300 leading-relaxed mt-2.5 line-clamp-3">
                    {obra.synopsis}
                  </p>
                </div>

                {/* Team snippet */}
                <div className="p-3 rounded-xl bg-[#12141a] border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Dirección:</span>
                    <span className="text-white font-medium truncate">{obra.castTeam.direction}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Técnica:</span>
                    <span className="text-white font-medium truncate">{obra.castTeam.technical}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 font-mono">
                    <span className="text-slate-400">Caché ref:</span>
                    <span className="text-[#6ee7b7] font-semibold">{formatCLP(obra.economics.feeCLP)}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => onOpenDossier(obra)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-xl transition-colors shadow cursor-pointer"
                    title="Ver Ficha y Descargar Dossier PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Dossier / PDF</span>
                  </button>

                  <button
                    onClick={() => onEditObra(obra)}
                    className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors cursor-pointer"
                    title="Editar Ficha"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {filteredObras.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#161920] border border-white/10 space-y-3">
          <Drama className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No se encontraron obras</h3>
          <p className="text-xs text-slate-400">
            Intenta cambiar los filtros de búsqueda o agrega un nuevo montaje.
          </p>
        </div>
      )}

    </div>
  );
};
