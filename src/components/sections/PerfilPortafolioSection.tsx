import React, { useState, useRef } from 'react';
import { UserSession, ArtistPortfolioFile, ArtistMilestone, SocialLinks } from '../../types';
import {
  User,
  Award,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Save,
  Globe,
  FileText,
  Check,
  ExternalLink,
  FolderOpen,
  Camera,
  Briefcase,
  Calendar,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Shield
} from 'lucide-react';

interface PerfilPortafolioSectionProps {
  currentUser: UserSession;
  onUpdateUser: (updatedUser: UserSession) => void;
  theme?: 'terracota' | 'dia';
}

export const PerfilPortafolioSection: React.FC<PerfilPortafolioSectionProps> = ({
  currentUser,
  onUpdateUser,
  theme = 'terracota'
}) => {
  const isLight = theme === 'dia';

  // Form state initialized from currentUser
  const [formData, setFormData] = useState<UserSession>({
    ...currentUser,
    artisticName: currentUser.artisticName || currentUser.name,
    discipline: currentUser.discipline || 'Teatro & Danza Contemporánea',
    phone: currentUser.phone || '+56 9 8765 4321',
    location: currentUser.location || 'Santiago / Valparaíso, Chile',
    rut: currentUser.rut || '15.489.210-K',
    bioShort: currentUser.bioShort || 'Artista escénico, director y productor con más de 12 años de trayectoria en montajes contemporáneos y giras internacionales.',
    bioFull: currentUser.bioFull || 'Licenciado en Artes Escénicas de la Universidad de Chile. Fundador de F.A.S.E Producciones. Ha dirigido más de 10 obras seleccionadas en festivales nacionales e internacionales (Santiago a Mil, FITAM, Festival de Cádiz). Especialista en dramaturgia corporal, dirección técnica DMX e investigación financiada por FONDART.',
    socialLinks: currentUser.socialLinks || {
      instagram: 'https://instagram.com/fase.escenica',
      vimeo: 'https://vimeo.com/faseart',
      spotify: 'https://spotify.com/artist/fase',
      linkedin: 'https://linkedin.com/in/francisco-perez-fase',
      website: 'https://www.plataformafase.cl'
    },
    milestones: currentUser.milestones || [
      {
        id: 'm-1',
        year: '2025',
        title: 'Selección Oficial Santiago a Mil',
        category: 'Gira',
        description: 'Presentación de "La Memoria de las Aguas" en Sala Principal GAM.',
        institution: 'Fundación Teatro a Mil'
      },
      {
        id: 'm-2',
        year: '2024',
        title: 'Premio Círculo de Críticos de Arte',
        category: 'Premio',
        description: 'Reconocimiento a mejor dirección coreográfica y diseño integral.',
        institution: 'Círculo de Críticos'
      },
      {
        id: 'm-3',
        year: '2022',
        title: 'Fondo de Creación Nacional FONDART',
        category: 'Estreno',
        description: 'Adjudicación de fondo línea creación de trayectoria.',
        institution: 'MINCAP'
      }
    ],
    files: currentUser.files || [
      {
        id: 'f-1',
        name: 'Dossier_Artistico_2025_Oficial.pdf',
        sizeBytes: 4250000,
        type: 'application/pdf',
        url: '#',
        uploadedAt: '2025-02-10'
      },
      {
        id: 'f-2',
        name: 'CV_Trayectoria_Francisco_Perez.pdf',
        sizeBytes: 1200000,
        type: 'application/pdf',
        url: '#',
        uploadedAt: '2025-01-15'
      },
      {
        id: 'f-3',
        name: 'Rider_Tecnico_General_2025.pdf',
        sizeBytes: 2800000,
        type: 'application/pdf',
        url: '#',
        uploadedAt: '2025-03-01'
      }
    ]
  });

  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Milestone modal or inline form state
  const [newMilestone, setNewMilestone] = useState<{
    year: string;
    title: string;
    category: 'Estreno' | 'Premio' | 'Residencia' | 'Gira' | 'Formación' | 'Publicación' | 'Otro';
    description: string;
    institution: string;
  }>({
    year: '2025',
    title: '',
    category: 'Estreno',
    description: '',
    institution: ''
  });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  // Avatar upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const updated = { ...formData, avatar: result };
        setFormData(updated);
        onUpdateUser(updated);
        setSavedFeedback('¡Fotografía de perfil actualizada con éxito!');
        setTimeout(() => setSavedFeedback(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Document upload handler
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: ArtistPortfolioFile[] = (Array.from(files) as File[]).map((file, idx) => ({
        id: `file-${Date.now()}-${idx}`,
        name: file.name,
        sizeBytes: file.size,
        type: file.type || 'application/pdf',
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString().split('T')[0]
      }));

      const updated = {
        ...formData,
        files: [...(formData.files || []), ...newFiles]
      };
      setFormData(updated);
      onUpdateUser(updated);
      setSavedFeedback(`¡${newFiles.length} archivo(s) subido(s) correctamente al portafolio!`);
      setTimeout(() => setSavedFeedback(null), 3000);
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(formData);
    setSavedFeedback('¡Perfil y portafolio guardados y sincronizados correctamente!');
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title.trim()) return;

    const milestoneItem: ArtistMilestone = {
      id: `m-${Date.now()}`,
      ...newMilestone
    };

    const updated = {
      ...formData,
      milestones: [milestoneItem, ...(formData.milestones || [])]
    };
    setFormData(updated);
    onUpdateUser(updated);
    setNewMilestone({ year: '2025', title: '', category: 'Estreno', description: '', institution: '' });
    setShowMilestoneForm(false);
    setSavedFeedback('¡Hito agregado a la trayectoria!');
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const handleDeleteMilestone = (id: string) => {
    const updated = {
      ...formData,
      milestones: (formData.milestones || []).filter(m => m.id !== id)
    };
    setFormData(updated);
    onUpdateUser(updated);
  };

  const handleDeleteFile = (id: string) => {
    const updated = {
      ...formData,
      files: (formData.files || []).filter(f => f.id !== id)
    };
    setFormData(updated);
    onUpdateUser(updated);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className={`p-6 md:p-8 rounded-3xl border transition-all relative overflow-hidden ${
        isLight
          ? 'bg-gradient-to-br from-white via-[#FAF6F4] to-[#F5ECE8] border-[#E8DDD7] text-stone-900 shadow-xs'
          : 'bg-gradient-to-br from-[#1E110F] via-[#241513] to-[#170E0D] border-[#E05A47]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#E05A47]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img
                src={formData.avatar}
                alt={formData.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-[#E05A47] shadow-md"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white shadow-lg transition-transform hover:scale-105 cursor-pointer"
                title="Cambiar fotografía"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[#E05A47]/15 text-[#E05A47] font-bold">
                  Perfil Artístico & Portafolio
                </span>
                <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado Cloud
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
                {formData.artisticName || formData.name}
              </h1>
              <p className={`text-xs md:text-sm ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                {formData.role} • <span className="font-medium text-[#E05A47]">{formData.discipline}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-semibold shadow-lg shadow-[#E05A47]/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>

        {savedFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-fadeIn flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{savedFeedback}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Datos Personales & Contacto & RRSS */}
        <div className="space-y-6">
          
          {/* Card: Datos Personales */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 font-semibold text-sm border-b pb-3 border-stone-200 dark:border-white/10">
              <User className="w-4 h-4 text-[#E05A47]" />
              <span>Datos Personales & Identidad</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Nombre Artístico / Seudónimo</label>
                <input
                  type="text"
                  value={formData.artisticName || ''}
                  onChange={e => setFormData({ ...formData, artisticName: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Disciplina / Especialidad</label>
                <input
                  type="text"
                  value={formData.discipline || ''}
                  onChange={e => setFormData({ ...formData, discipline: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Rol Principal en F.A.S.E</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">RUT / ID</label>
                  <input
                    type="text"
                    value={formData.rut || ''}
                    onChange={e => setFormData({ ...formData, rut: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Ubicación / Ciudad Base</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Card: Redes Sociales (RRSS) & Web */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 font-semibold text-sm border-b pb-3 border-stone-200 dark:border-white/10">
              <Globe className="w-4 h-4 text-sky-500" />
              <span>Redes Sociales & Enlaces (RRSS)</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Instagram Oficial</label>
                <input
                  type="text"
                  placeholder="https://instagram.com/..."
                  value={formData.socialLinks?.instagram || ''}
                  onChange={e => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                  })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Vimeo / YouTube (Video Teaser)</label>
                <input
                  type="text"
                  placeholder="https://vimeo.com/..."
                  value={formData.socialLinks?.vimeo || ''}
                  onChange={e => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, vimeo: e.target.value }
                  })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Spotify / SoundCloud (Diseño Sonoro)</label>
                <input
                  type="text"
                  placeholder="https://spotify.com/..."
                  value={formData.socialLinks?.spotify || ''}
                  onChange={e => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, spotify: e.target.value }
                  })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">LinkedIn Profesional</label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.socialLinks?.linkedin || ''}
                  onChange={e => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                  })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Sitio Web / Portafolio Online</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.socialLinks?.website || ''}
                  onChange={e => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, website: e.target.value }
                  })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Center & Right Column: Biografía, Trayectoria & Archivos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Perfil / Biografía detallada */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 font-semibold text-sm border-b pb-3 border-stone-200 dark:border-white/10">
              <Briefcase className="w-4 h-4 text-[#E05A47]" />
              <span>Biografía & Declaración Artística</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Biografía Corta (Elevator Pitch / Sinopsis)</label>
                <textarea
                  rows={2}
                  value={formData.bioShort || ''}
                  onChange={e => setFormData({ ...formData, bioShort: e.target.value })}
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Trayectoria Completa & Declaración Curatorial</label>
                <textarea
                  rows={5}
                  value={formData.bioFull || ''}
                  onChange={e => setFormData({ ...formData, bioFull: e.target.value })}
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Card: Trayectoria / Hitos (Milestones) */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-white/10">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Trayectoria & Hitos Históricos ({formData.milestones?.length || 0})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E05A47]/15 hover:bg-[#E05A47]/25 text-[#E05A47] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showMilestoneForm ? 'Cancelar' : 'Agregar Hito'}</span>
              </button>
            </div>

            {/* Inline Add Milestone Form */}
            {showMilestoneForm && (
              <form onSubmit={handleAddMilestone} className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/40 border-white/10'
              }`}>
                <div className="text-xs font-semibold">Nuevo Hito de Trayectoria</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block mb-1 opacity-80">Año</label>
                    <input
                      type="text"
                      placeholder="2025"
                      value={newMilestone.year}
                      onChange={e => setNewMilestone({ ...newMilestone, year: e.target.value })}
                      className={`w-full px-3 py-1.5 rounded-lg border ${isLight ? 'bg-white border-stone-200' : 'bg-black/30 border-white/10'}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 opacity-80">Categoría</label>
                    <select
                      value={newMilestone.category}
                      onChange={e => setNewMilestone({ ...newMilestone, category: e.target.value as any })}
                      className={`w-full px-3 py-1.5 rounded-lg border ${isLight ? 'bg-white border-stone-200' : 'bg-[#180F0E] border-white/10 text-white'}`}
                    >
                      <option value="Estreno">Estreno</option>
                      <option value="Premio">Premio</option>
                      <option value="Residencia">Residencia</option>
                      <option value="Gira">Gira</option>
                      <option value="Formación">Formación</option>
                      <option value="Publicación">Publicación</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 opacity-80">Institución / Festival</label>
                    <input
                      type="text"
                      placeholder="Ej: GAM / MINCAP"
                      value={newMilestone.institution}
                      onChange={e => setNewMilestone({ ...newMilestone, institution: e.target.value })}
                      className={`w-full px-3 py-1.5 rounded-lg border ${isLight ? 'bg-white border-stone-200' : 'bg-black/30 border-white/10'}`}
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block mb-1 opacity-80">Título del Hito</label>
                  <input
                    type="text"
                    placeholder="Ej: Estreno Nacional en Sala Principal"
                    value={newMilestone.title}
                    onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${isLight ? 'bg-white border-stone-200' : 'bg-black/30 border-white/10'}`}
                    required
                  />
                </div>

                <div className="text-xs">
                  <label className="block mb-1 opacity-80">Descripción</label>
                  <input
                    type="text"
                    placeholder="Breve detalle del logro..."
                    value={newMilestone.description}
                    onChange={e => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${isLight ? 'bg-white border-stone-200' : 'bg-black/30 border-white/10'}`}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-medium cursor-pointer"
                  >
                    Guardar Hito
                  </button>
                </div>
              </form>
            )}

            {/* List of Milestones */}
            <div className="space-y-3">
              {formData.milestones && formData.milestones.length > 0 ? (
                formData.milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
                      isLight ? 'bg-stone-50/70 border-stone-200 hover:border-stone-300' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E05A47]/15 text-[#E05A47]">
                          {m.year}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {m.category}
                        </span>
                        {m.institution && (
                          <span className={`text-xs font-semibold ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                            • {m.institution}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white md:text-sm">{m.title}</h4>
                      <p className={`text-xs ${isLight ? 'text-stone-600' : 'text-slate-400'}`}>{m.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar hito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className={`p-8 text-center text-xs ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                  No hay hitos registrados aún en la trayectoria.
                </div>
              )}
            </div>
          </div>

          {/* Card: Archivos & Documentos del Artista (Dossiers, CV, Riders) */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-white/10">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FolderOpen className="w-4 h-4 text-emerald-500" />
                <span>Archivos & Documentos del Artista ({formData.files?.length || 0})</span>
              </div>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Archivo</span>
              </button>
              <input
                ref={docInputRef}
                type="file"
                multiple
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </div>

            <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
              Sube dossiers en PDF, currículum vitae, riders técnicos y fotografías en alta resolución para tenerlos disponibles en la plataforma.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formData.files && formData.files.length > 0 ? (
                formData.files.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-white block truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB • {file.uploadedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={file.url !== '#' ? file.url : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.name}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title="Descargar / Ver archivo"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                  No hay archivos cargados en este momento.
                </div>
              )}
            </div>
          </div>

        </div>

      </form>
    </div>
  );
};
