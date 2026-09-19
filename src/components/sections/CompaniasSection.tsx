import React, { useState } from 'react';
import { CompanyGroup, ArtistPortfolioFile } from '../../types';
import {
  Users,
  Shield,
  Plus,
  FileText,
  Upload,
  Trash2,
  Edit3,
  Check,
  Building2,
  FolderOpen,
  Mail,
  Calendar,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface CompaniasSectionProps {
  companies: CompanyGroup[];
  onUpdateCompanies: (companies: CompanyGroup[]) => void;
  theme?: 'terracota' | 'dia';
}

export const initialCompaniesData: CompanyGroup[] = [
  {
    id: 'comp-1',
    name: 'ATHA',
    discipline: 'Teatro Contemporáneo & Performance',
    description: 'Núcleo matriz de creación escénica contemporánea, investigación corporal y dramaturgia expandida en Chile.',
    members: ['Anto', 'Jo', 'Tucu', 'Nico', 'Pancho'],
    sqlTag: 'atha_core_sql_v1',
    materialCount: 8,
    activeProjects: ['La Memoria de las Aguas', 'Monumento Sonoro', 'Trilogía del Sur'],
    avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=400',
    contactEmail: 'contacto@plataformafase.cl',
    createdDate: '2020-03-15',
    portfolioFiles: [
      { id: 'f-c1', name: 'Dossier_General_ATHA_2025.pdf', sizeBytes: 5200000, type: 'application/pdf', url: '#', uploadedAt: '2025-01-10' },
      { id: 'f-c2', name: 'Rider_Tecnico_Global_ATHA.pdf', sizeBytes: 2100000, type: 'application/pdf', url: '#', uploadedAt: '2025-02-01' }
    ]
  },
  {
    id: 'comp-2',
    name: 'ATHA Kids',
    discipline: 'Artes Escénicas para Infancias & Nuevas Audiencias',
    description: 'Compañía dedicada al teatro familiar, experiencias inmersivas y mediación artística para niñas, niños y jóvenes.',
    members: ['Anto', 'Tucu', 'Miya', 'Ross', 'Pipe', 'Pancho', 'Marion', 'Jona'],
    sqlTag: 'atha_kids_sql_v2',
    materialCount: 5,
    activeProjects: ['El Bosque de los Sueños', 'Viaje al Centro de la Tierra Inmersivo'],
    avatar: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=400',
    contactEmail: 'kids@plataformafase.cl',
    createdDate: '2022-06-20',
    portfolioFiles: [
      { id: 'f-k1', name: 'Dossier_Pedagogico_ATHA_Kids.pdf', sizeBytes: 3400000, type: 'application/pdf', url: '#', uploadedAt: '2025-02-14' }
    ]
  },
  {
    id: 'comp-3',
    name: 'Tenoia Musicalis',
    discipline: 'Música Contemporánea & Orquesta de Cámara',
    description: 'Ensemble acústico y electrónico enfocado en música electroacústica, bandas sonoras en vivo y ópera contemporánea de cámara.',
    members: ['Orquesta Completa', 'Grupo de Cámara FASE', 'Director Residente', 'Solistas Invitados'],
    sqlTag: 'tenoia_musicalis_orchestra_sql',
    materialCount: 6,
    activeProjects: ['Concierto Resonancias del Silencio', 'Paisajes Sonoros del Sur'],
    avatar: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=400',
    contactEmail: 'musica@plataformafase.cl',
    createdDate: '2021-09-01',
    portfolioFiles: [
      { id: 'f-t1', name: 'Rider_Orquestal_Tenoia.pdf', sizeBytes: 4100000, type: 'application/pdf', url: '#', uploadedAt: '2025-01-20' }
    ]
  },
  {
    id: 'comp-4',
    name: 'Compañía agrupación musical de prueba 1',
    discipline: 'Experimental & Fusión Sonora',
    description: 'Proyecto incubadora de experimentación sonora, improvisación libre y cruce entre instrumentos acústicos tradicionales y síntesis modular.',
    members: ['Prueba Integrantes A', 'Prueba Integrantes B', 'Invitados Especiales'],
    sqlTag: 'test_musical_group_1_sql',
    materialCount: 3,
    activeProjects: ['Experimento Modular I', 'Sesiones Abiertas FASE'],
    avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=400',
    contactEmail: 'prueba1@plataformafase.cl',
    createdDate: '2023-04-10',
    portfolioFiles: [
      { id: 'f-p1', name: 'Portfolio_Prueba_Musical.pdf', sizeBytes: 1500000, type: 'application/pdf', url: '#', uploadedAt: '2025-03-02' }
    ]
  },
  {
    id: 'comp-5',
    name: 'Agrupación de teatro genérica 2',
    discipline: 'Teatro Textual & Dramaturgia Documental',
    description: 'Colectivo escénico enfocado en archivos históricos, teatro documental, monólogos y puestas en escena de formato flexible.',
    members: ['Dramaturgos', 'Elenco Rotativo', 'Diseñadores Escénicos'],
    sqlTag: 'generic_theatre_group_2_sql',
    materialCount: 4,
    activeProjects: ['Archivo de Memorias Vivas', 'Monólogos del Borde'],
    avatar: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&q=80&w=400',
    contactEmail: 'teatro2@plataformafase.cl',
    createdDate: '2023-11-15',
    portfolioFiles: [
      { id: 'f-g1', name: 'Dossier_Teatro_Generico_2.pdf', sizeBytes: 2900000, type: 'application/pdf', url: '#', uploadedAt: '2025-02-22' }
    ]
  }
];

export const CompaniasSection: React.FC<CompaniasSectionProps> = ({
  companies,
  onUpdateCompanies,
  theme = 'terracota'
}) => {
  const isLight = theme === 'dia';
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || 'comp-1');
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New company form state
  const [newComp, setNewComp] = useState({
    name: '',
    discipline: 'Teatro & Artes Escénicas',
    description: '',
    membersString: 'Pancho, Anto, Tucu',
    sqlTag: 'custom_group_sql_tag',
    contactEmail: ''
  });

  const activeCompany = companies.find(c => c.id === selectedCompanyId) || companies[0];

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComp.name.trim()) return;

    const membersArr = newComp.membersString.split(',').map(m => m.trim()).filter(Boolean);

    const created: CompanyGroup = {
      id: `comp-${Date.now()}`,
      name: newComp.name,
      discipline: newComp.discipline,
      description: newComp.description || 'Nueva agrupación registrada en el ecosistema F.A.SE.',
      members: membersArr.length > 0 ? membersArr : ['Pancho', 'Anto'],
      sqlTag: newComp.sqlTag || `sql_tag_${Date.now()}`,
      materialCount: 2,
      activeProjects: ['Proyecto Inicial FASE'],
      avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=400',
      contactEmail: newComp.contactEmail || 'contacto@plataformafase.cl',
      createdDate: new Date().toISOString().split('T')[0],
      portfolioFiles: [
        { id: `f-${Date.now()}`, name: 'Dossier_Presentacion.pdf', sizeBytes: 2400000, type: 'application/pdf', url: '#', uploadedAt: new Date().toISOString().split('T')[0] }
      ]
    };

    const updated = [created, ...companies];
    onUpdateCompanies(updated);
    setSelectedCompanyId(created.id);
    setShowAddModal(false);
    setNewComp({ name: '', discipline: 'Teatro & Artes Escénicas', description: '', membersString: '', sqlTag: '', contactEmail: '' });
    setFeedback('¡Compañía o agrupación creada y vinculada en SQL con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteCompany = (id: string) => {
    if (companies.length <= 1) {
      alert('Debe existir al menos una compañía en el sistema.');
      return;
    }
    const updated = companies.filter(c => c.id !== id);
    onUpdateCompanies(updated);
    setSelectedCompanyId(updated[0].id);
    setFeedback('Compañía eliminada correctamente.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && activeCompany) {
      const newFiles: ArtistPortfolioFile[] = Array.from(files).map((f: any, idx) => ({
        id: `file-c-${Date.now()}-${idx}`,
        name: f.name,
        sizeBytes: f.size,
        type: f.type || 'application/pdf',
        url: URL.createObjectURL(f),
        uploadedAt: new Date().toISOString().split('T')[0]
      }));

      const updatedCompanies = companies.map(c => {
        if (c.id === activeCompany.id) {
          return {
            ...c,
            materialCount: c.materialCount + newFiles.length,
            portfolioFiles: [...c.portfolioFiles, ...newFiles]
          };
        }
        return c;
      });

      onUpdateCompanies(updatedCompanies);
      setFeedback(`¡${newFiles.length} archivo(s) agregado(s) al material de ${activeCompany.name}!`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${
        isLight
          ? 'bg-gradient-to-br from-white via-[#FAF6F4] to-[#F5ECE8] border-[#E8DDD7] text-stone-900 shadow-xs'
          : 'bg-gradient-to-br from-[#1E110F] via-[#241513] to-[#170E0D] border-[#E05A47]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#E05A47]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[#E05A47]/15 text-[#E05A47] font-bold">
                Gestión de Compañías & Agrupaciones Escénicas
              </span>
              <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SQL Tags Vinculados ({companies.length})
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
              Directorio de Compañías & Colectivos F.A.S.E
            </h1>
            <p className={`text-xs md:text-sm max-w-2xl ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Administra perfiles artísticos, material de repertorio, miembros asignados por etiqueta SQL y documentación técnica por cada agrupación.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-semibold shadow-lg shadow-[#E05A47]/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Compañía / Agrupación</span>
          </button>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Selector Sidebar & Detailed Company View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left List of Companies (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className={`text-xs font-mono uppercase tracking-wider px-1 font-bold ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
            Agrupaciones Registradas ({companies.length})
          </h2>

          <div className="space-y-2.5">
            {companies.map((comp) => {
              const isSelected = comp.id === activeCompany.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                    isSelected
                      ? isLight
                        ? 'bg-white border-[#E05A47] shadow-md ring-1 ring-[#E05A47]'
                        : 'bg-[#261614] border-[#E05A47] shadow-lg ring-1 ring-[#E05A47]/50'
                      : isLight
                        ? 'bg-white/80 border-stone-200 hover:border-stone-300'
                        : 'bg-[#180F0E]/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  <img
                    src={comp.avatar}
                    alt={comp.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold truncate">{comp.name}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#E05A47] font-semibold shrink-0">
                        {comp.members.length} integrantes
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                      {comp.discipline}
                    </p>
                    <span className="text-[10px] font-mono text-emerald-500 block truncate pt-0.5">
                      SQL: {comp.sqlTag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detailed View of Active Company (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeCompany && (
            <div className={`p-6 md:p-8 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-stone-200 text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100 shadow-sm'
            }`}>
              
              {/* Company Header Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-stone-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <img
                    src={activeCompany.avatar}
                    alt={activeCompany.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E05A47] shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#E05A47]/15 text-[#E05A47] font-bold">
                        {activeCompany.discipline}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        Tag SQL: {activeCompany.sqlTag}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold font-display">{activeCompany.name}</h2>
                    <p className={`text-xs ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>
                      Creada el {activeCompany.createdDate} • Contacto: <span className="underline">{activeCompany.contactEmail}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCompany(activeCompany.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar compañía"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#E05A47] font-bold">Descripción & Perfil</h4>
                <p className={`text-xs md:text-sm leading-relaxed ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                  {activeCompany.description}
                </p>
              </div>

              {/* Members Assigned (SQL Tag Integration) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#E05A47] font-bold flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Integrantes Vinculados a la Tag SQL ({activeCompany.members.length})</span>
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeCompany.members.map((member, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                        isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#E05A47]" />
                      <span>{member}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Projects / Repertoire */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#E05A47] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Obras & Proyectos Activos ({activeCompany.activeProjects.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCompany.activeProjects.map((proj, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                        isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/25 border-white/10 text-white'
                      }`}
                    >
                      <span>{proj}</span>
                      <span className="text-[10px] font-mono text-[#E05A47] bg-[#E05A47]/10 px-2 py-0.5 rounded">
                        En Repertorio
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portfolio Material & Files */}
              <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-500 font-bold flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4" />
                    <span>Material & Archivos de la Compañía ({activeCompany.portfolioFiles.length})</span>
                  </h4>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Material</span>
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-2">
                  {activeCompany.portfolioFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium truncate block">{file.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB • {file.uploadedAt}
                          </span>
                        </div>
                      </div>

                      <a
                        href={file.url !== '#' ? file.url : '#'}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title="Descargar archivo"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 md:p-8 rounded-3xl border space-y-6 ${
            isLight ? 'bg-white border-stone-200 text-stone-900 shadow-2xl' : 'bg-[#1C1210] border-[#3E221E] text-white shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-white/10">
              <h3 className="text-lg font-bold font-display">Registrar Nueva Compañía / Agrupación</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Nombre de la Compañía / Agrupación</label>
                <input
                  type="text"
                  placeholder="Ej: Colectivo Escénico Aurora"
                  value={newComp.name}
                  onChange={e => setNewComp({ ...newComp, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Disciplina / Formato</label>
                <input
                  type="text"
                  placeholder="Ej: Teatro Musical & Danza"
                  value={newComp.discipline}
                  onChange={e => setNewComp({ ...newComp, discipline: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Descripción General</label>
                <textarea
                  rows={2}
                  placeholder="Reseña artística de la compañía..."
                  value={newComp.description}
                  onChange={e => setNewComp({ ...newComp, description: e.target.value })}
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Integrantes (separados por coma)</label>
                  <input
                    type="text"
                    placeholder="Anto, Tucu, Pancho, Jo"
                    value={newComp.membersString}
                    onChange={e => setNewComp({ ...newComp, membersString: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Tag SQL (Identificador de Base de Datos)</label>
                  <input
                    type="text"
                    placeholder="aurora_theatre_sql"
                    value={newComp.sqlTag}
                    onChange={e => setNewComp({ ...newComp, sqlTag: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Correo de Contacto</label>
                <input
                  type="email"
                  placeholder="contacto@colectivoaurora.cl"
                  value={newComp.contactEmail}
                  onChange={e => setNewComp({ ...newComp, contactEmail: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    isLight ? 'border-stone-200 text-stone-700 hover:bg-stone-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-semibold shadow-lg shadow-[#E05A47]/20 cursor-pointer"
                >
                  Guardar & Vincular Compañía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
