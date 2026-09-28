import React, { useEffect, useState } from 'react';
import { CompanyGroup, ArtistPortfolioFile } from '../../types';
import { leerSesionCrm } from '../../utils/sesionEcosistema';
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

/** Compania real del CRM (GET /api/v1/crm/companies) */
interface CompanyPerson {
  id: string;
  fullName: string;
  roleTitle: string;
  characterName: string;
  kind: string;
  email: string;
  phone: string;
}

interface CompanyObra {
  id: string;
  title: string;
  discipline: string;
  status: string;
  image: string;
}

interface CompanyApi {
  id: string;
  name: string;
  discipline: string;
  kind: string;
  description: string;
  contactEmail: string;
  slug: string;
  obras: CompanyObra[];
  people: CompanyPerson[];
}

interface CompaniasSectionProps {
  companies: CompanyGroup[];
  onUpdateCompanies: (companies: CompanyGroup[]) => void;
  theme?: 'terracota' | 'dia';
}

function mapApiCompany(c: any): CompanyApi & { members: string[]; activeProjects: string[]; avatar: string; sqlTag: string; portfolioFiles: ArtistPortfolioFile[]; createdDate: string } {
  const obras: CompanyObra[] = Array.isArray(c.obras) ? c.obras : [];
  const people: CompanyPerson[] = Array.isArray(c.people) ? c.people : [];
  return {
    id: c.id,
    name: c.name || 'Sin nombre',
    discipline: c.discipline || 'Sin disciplina',
    kind: c.kind === 'propia' ? 'propia' : 'colaboradora',
    description: c.description || '',
    contactEmail: c.contactEmail || '',
    // Estos tres los usa el formulario de edición: si no viajan, al guardar se vaciarían.
    legalName: c.legalName || '',
    city: c.city || '',
    status: c.status || 'active',
    logoUrl: c.logoUrl || c.logo_url || '',
    slug: c.slug || '',
    obras,
    people,
    members: people.map(p => p.fullName),
    activeProjects: obras.map(o => o.title),
    avatar: obras[0]?.image || '',
    sqlTag: c.slug || c.kind || 'crm',
    portfolioFiles: [],
    createdDate: ''
  };
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
    activeProjects: [],
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

  // Companias reales del CRM (con obras vinculadas y nomina de socios)
  const [remoteCompanies, setRemoteCompanies] = useState<any[] | null>(null);
  const [newPerson, setNewPerson] = useState({ name: '', role: '', kind: 'socio' });

  const loadCompanies = () => {
    fetch('/api/v1/crm/companies')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.companies) && data.companies.length > 0) {
          setRemoteCompanies(data.companies);
        }
      })
      .catch(() => {});
  };

  useEffect(() => { loadCompanies(); }, []);

  /* ---------------------------------------------------------------------------
     EDITAR LA FICHA Y VINCULAR MONTAJES DEL CATÁLOGO REAL
     Pedido de Francisco: poder editar todos los datos de la agrupación (descripción
     incluida) y que los montajes sean las obras del catálogo de verdad (projects),
     no una lista de texto. Antes esta pestaña sólo agregaba/quita socios y el resto
     se guardaba en una lista local que se perdía al recargar.
     --------------------------------------------------------------------------- */
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<any>({});
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [obraElegida, setObraElegida] = useState('');

  const cargarCatalogo = () => {
    fetch('/api/v1/crm/portfolio/projects')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCatalogo((d && (d.projects || d.data)) || []))
      .catch(() => {});
  };
  useEffect(() => { cargarCatalogo(); }, []);

  const abrirEdicion = () => {
    if (!activeCompany) return;
    setBorrador({
      name: activeCompany.name || '',
      legalName: activeCompany.legalName || '',
      discipline: activeCompany.discipline || '',
      kind: activeCompany.kind === 'propia' ? 'propia' : 'colaboradora',
      city: activeCompany.city || '',
      contactEmail: activeCompany.contactEmail || '',
      status: activeCompany.status || 'active',
      description: activeCompany.description || '',
      logoUrl: (activeCompany as any).logoUrl || '',
    });
    setEditando(true);
  };

  const guardarFicha = () => {
    if (!activeCompany) return;
    if (!String(borrador.name || '').trim()) { setFeedback('El nombre no puede quedar vacío.'); return; }
    fetch(`/api/v1/crm/companies/${activeCompany.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(borrador),
    })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.success) { setFeedback('No se guardó: ' + ((d && d.error) || 'error')); return; }
        setFeedback('Ficha de la agrupación guardada ✓');
        setEditando(false);
        loadCompanies();
      })
      .catch(e => setFeedback('No se guardó: ' + e.message));
  };

  const vincularObra = (projectId: string) => {
    if (!activeCompany || !projectId) return;
    fetch(`/api/v1/crm/companies/${activeCompany.id}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.success) { setFeedback('No se vinculó: ' + ((d && d.error) || 'error')); return; }
        setFeedback(`«${d.title || 'Obra'}» quedó como montaje de la agrupación ✓`);
        setObraElegida('');
        loadCompanies();
      })
      .catch(e => setFeedback('No se vinculó: ' + e.message));
  };

  const quitarObra = (projectId: string) => {
    if (!activeCompany) return;
    fetch(`/api/v1/crm/companies/${activeCompany.id}/projects/${projectId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.success) { setFeedback('No se pudo quitar: ' + ((d && d.error) || 'error')); return; }
        setFeedback('Montaje desvinculado (la obra sigue en el catálogo) ✓');
        loadCompanies();
      })
      .catch(e => setFeedback('No se pudo quitar: ' + e.message));
  };

  /* ---------------------------------------------------------------------------
     INTEGRANTES EDITABLES
     Antes cada integrante salía como "cargo • personaje" fijo (en ATHA Kids:
     "Duende Relojero", "Estrella de Belén"…), que son papeles de UN montaje y no
     datos de la persona. Ahora la nómina muestra persona + cargo, y cada integrante
     se edita (nombre, cargo, tipo, correo y —sólo si corresponde— el personaje).
     --------------------------------------------------------------------------- */
  const [editandoPersona, setEditandoPersona] = useState<string | null>(null);
  const [borradorPersona, setBorradorPersona] = useState<any>({});

  const abrirEdicionPersona = (persona: any) => {
    setBorradorPersona({
      fullName: persona.fullName || '',
      roleTitle: persona.roleTitle || '',
      kind: persona.kind || 'elenco',
      email: persona.email || '',
      phone: persona.phone || '',
      characterName: persona.characterName || '',
    });
    setEditandoPersona(persona.id);
  };

  const guardarPersona = () => {
    if (!activeCompany || !editandoPersona) return;
    if (!String(borradorPersona.fullName || '').trim()) { setFeedback('El nombre no puede quedar vacío.'); return; }
    fetch(`/api/v1/crm/companies/${activeCompany.id}/people/${editandoPersona}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(borradorPersona),
    })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.success) { setFeedback('No se guardó: ' + ((d && d.error) || 'error')); return; }
        setFeedback('Integrante actualizado ✓');
        setEditandoPersona(null);
        loadCompanies();
      })
      .catch(e => setFeedback('No se guardó: ' + e.message));
  };

  const campito = `w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
    isLight ? 'bg-white border-stone-300' : 'bg-black/40 border-white/15 text-white'
  }`;

  const listaCompanias = (remoteCompanies && remoteCompanies.length > 0
    ? remoteCompanies.map(mapApiCompany)
    : companies.map(c => ({ ...c, kind: 'colaboradora', obras: [] as CompanyObra[], people: [] as CompanyPerson[] }))) as any[];

  const propias = listaCompanias.filter(c => c.kind === 'propia');
  const colaboradoras = listaCompanias.filter(c => c.kind !== 'propia');
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

  const activeCompany = listaCompanias.find(c => c.id === selectedCompanyId) || listaCompanias[0];

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
    setFeedback('¡Agrupación creada con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !newPerson.name.trim()) return;
    const payload = {
      fullName: newPerson.name.trim(),
      roleTitle: newPerson.role.trim(),
      kind: newPerson.kind
    };
    fetch(`/api/v1/crm/companies/${activeCompany.id}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => (r.ok ? r.json() : null))
      .then(() => {
        setNewPerson({ name: '', role: '', kind: 'socio' });
        setFeedback(`"${payload.fullName}" agregado a la nomina de ${activeCompany.name}.`);
        loadCompanies();
        setTimeout(() => setFeedback(null), 3000);
      })
      .catch(() => setFeedback('No se pudo guardar en el CRM.'));
  };

  const handleRemovePerson = (personId: string) => {
    if (!activeCompany) return;
    fetch(`/api/v1/crm/companies/${activeCompany.id}/people/${personId}`, { method: 'DELETE' })
      .then(() => {
        setFeedback('Integrante quitado de la nomina.');
        loadCompanies();
        setTimeout(() => setFeedback(null), 3000);
      })
      .catch(() => {});
  };

  const handleDeleteCompany = (id: string) => {
    if (companies.length <= 1) {
      alert('Debe existir al menos una compañía en el sistema.');
      return;
    }
    // Antes esto sólo borraba de la lista en pantalla y la agrupación volvía al recargar
    // (no existía endpoint). Ahora se borra de verdad; si el servidor se niega —porque la
    // agrupación presenta obras— se muestra el motivo tal cual.
    fetch(`/api/v1/crm/companies/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-atha-email': leerSesionCrm()?.email || '' },
    })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.success) { setFeedback('No se eliminó: ' + ((d && d.error) || 'error')); return; }
        setFeedback('Agrupación eliminada ✓');
        loadCompanies();
      })
      .catch(e => setFeedback('No se eliminó: ' + e.message));
    const updated = companies.filter(c => c.id !== id);
    onUpdateCompanies(updated);
    setSelectedCompanyId(updated[0].id);
    setTimeout(() => setFeedback(null), 4000);
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
          : 'bg-gradient-to-br from-[var(--bg-surface)] via-[#241513] to-[#170E0D] border-[var(--accent-terracota)]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--accent-terracota)]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)] font-bold">
                Gestión de Compañías & Agrupaciones Escénicas
              </span>
              <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Agrupaciones ({companies.length})
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
              Directorio de Compañías & Colectivos F.A.S.E
            </h1>
            <p className={`text-xs md:text-sm max-w-2xl ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Administra los perfiles artísticos, el elenco, los montajes del catálogo y la documentación de cada agrupación.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold shadow-lg shadow-[var(--accent-terracota)]/20 transition-all cursor-pointer shrink-0"
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
            Compañías & Agrupaciones ({listaCompanias.length})
          </h2>

          {[
            { titulo: 'Compañías propias de ATHA', items: propias },
            { titulo: 'Compañías colaboradoras del catálogo', items: colaboradoras }
          ].map(bloque => (
            <div key={bloque.titulo} className="space-y-2.5">
              <h3 className={`text-[11px] font-mono uppercase tracking-wider px-1 ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                {bloque.titulo} ({bloque.items.length})
              </h3>
              {bloque.items.map((comp: any) => {
                const isSelected = comp.id === activeCompany?.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompanyId(comp.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                      isSelected
                        ? isLight
                          ? 'bg-white border-[var(--accent-terracota)] shadow-md ring-1 ring-[var(--accent-terracota)]'
                          : 'bg-[#261614] border-[var(--accent-terracota)] shadow-lg ring-1 ring-[var(--accent-terracota)]/50'
                        : isLight
                          ? 'bg-white/80 border-stone-200 hover:border-stone-300'
                          : 'bg-[#180F0E]/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {comp.avatar ? (
                      <img
                        src={comp.avatar}
                        alt={comp.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)] flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold truncate">{comp.name}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[var(--accent-terracota)] font-semibold shrink-0">
                          {comp.people.length} en nómina
                        </span>
                      </div>
                      <p className={`text-[11px] truncate ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                        {comp.discipline}
                      </p>
                      <span className="text-[10px] font-mono text-emerald-500 block truncate pt-0.5">
                        {comp.obras.length} obra(s) del catálogo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right Detailed View of Active Company (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeCompany && (
            <div className={`p-6 md:p-8 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-stone-200 text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[var(--border-color)] text-slate-100 shadow-sm'
            }`}>
              
              {/* Company Header Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-stone-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <img
                    src={activeCompany.avatar}
                    alt={activeCompany.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--accent-terracota)] shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)] font-bold">
                        {activeCompany.discipline}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        ID interno: {activeCompany.sqlTag}
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
                  onClick={abrirEdicion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--accent-terracota)]/50 text-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)]/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar ficha</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCompany(activeCompany.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar compañía"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Descripción & Perfil — editable (PUT /api/v1/crm/companies/:id) */}
              {editando ? (
                <div className={`space-y-3 p-3 rounded-2xl border border-[var(--accent-terracota)]/40 ${isLight ? 'bg-[var(--accent-terracota)]/5' : 'bg-black/20'}`}>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--accent-terracota)] font-bold">Editando la ficha</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { campo: 'name', etiqueta: 'Nombre', ph: 'Compañía Teatral ATHA' },
                      { campo: 'legalName', etiqueta: 'Razón social', ph: 'Como figura legalmente' },
                      { campo: 'discipline', etiqueta: 'Disciplina', ph: 'Teatro contemporáneo & género' },
                      { campo: 'city', etiqueta: 'Ciudad', ph: 'Rancagua' },
                      { campo: 'contactEmail', etiqueta: 'Correo de contacto', ph: 'contacto@…' },
                    ].map(({ campo, etiqueta, ph }) => (
                      <label key={campo} className="block text-xs font-medium">
                        <span className="mb-1 block opacity-80">{etiqueta}</span>
                        <input
                          type="text"
                          value={(borrador as any)[campo] || ''}
                          placeholder={ph}
                          onChange={e => setBorrador({ ...borrador, [campo]: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                            isLight ? 'bg-white border-stone-300' : 'bg-black/30 border-white/15 text-white'
                          }`}
                        />
                      </label>
                    ))}
                    <label className="block text-xs font-medium">
                      <span className="mb-1 block opacity-80">Tipo</span>
                      <select
                        value={borrador.kind || 'colaboradora'}
                        onChange={e => setBorrador({ ...borrador, kind: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                          isLight ? 'bg-white border-stone-300' : 'bg-black/30 border-white/15 text-white'
                        }`}
                      >
                        <option value="propia">Propia (del ecosistema)</option>
                        <option value="colaboradora">Colaboradora</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium">
                      <span className="mb-1 block opacity-80">Estado</span>
                      <select
                        value={borrador.status || 'active'}
                        onChange={e => setBorrador({ ...borrador, status: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                          isLight ? 'bg-white border-stone-300' : 'bg-black/30 border-white/15 text-white'
                        }`}
                      >
                        <option value="active">Activa</option>
                        <option value="inactive">Inactiva</option>
                      </select>
                    </label>
                  </div>

                  {/* Logo de la compañía: aparece en la tarjeta de sus obras y en la ficha */}
                  <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/20 border-white/10'}`}>
                    {borrador.logoUrl ? (
                      <img
                        src={borrador.logoUrl}
                        alt="Logo de la agrupación"
                        className="w-12 h-12 rounded-xl object-cover border border-white/15 bg-black/30 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                        sin logo
                      </div>
                    )}
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--accent-terracota)]/50 text-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)]/10 text-[11px] font-semibold cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir logo</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 6 * 1024 * 1024) { setFeedback('El logo pasa de 6 MB.'); return; }
                          const lector = new FileReader();
                          lector.onload = () => {
                            fetch('/api/v1/crm/media', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ imagen: lector.result, nombre: borrador.name || 'logo', carpeta: 'companias' }),
                            })
                              .then(r => r.json())
                              .then(d => {
                                if (!d || !d.ok) { setFeedback('No se pudo subir el logo: ' + ((d && d.error) || 'error')); return; }
                                setBorrador({ ...borrador, logoUrl: d.url });
                                setFeedback('Logo subido — se guarda con «Guardar cambios» ✓');
                              })
                              .catch(err => setFeedback('No se pudo subir el logo: ' + err.message));
                          };
                          lector.readAsDataURL(f);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="o pega la dirección del logo"
                      value={borrador.logoUrl || ''}
                      onChange={e => setBorrador({ ...borrador, logoUrl: e.target.value })}
                      className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                        isLight ? 'bg-white border-stone-300' : 'bg-black/30 border-white/15 text-white'
                      }`}
                    />
                  </div>

                  <label className="block text-xs font-medium">
                    <span className="mb-1 block opacity-80">Descripción</span>
                    <textarea
                      rows={4}
                      value={borrador.description || ''}
                      placeholder="Qué hace la agrupación, su línea de trabajo, su historia…"
                      onChange={e => setBorrador({ ...borrador, description: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                        isLight ? 'bg-white border-stone-300' : 'bg-black/30 border-white/15 text-white'
                      }`}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={guardarFicha}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Guardar cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(false)}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        isLight ? 'border-stone-300 text-stone-700 hover:bg-stone-100' : 'border-white/15 text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--accent-terracota)] font-bold">Descripción & Perfil</h4>
                  <p className={`text-xs md:text-sm leading-relaxed ${isLight ? 'text-stone-700' : 'text-slate-300'}`}>
                    {activeCompany.description || 'Sin descripción todavía: usa «Editar ficha» para escribirla.'}
                  </p>
                </div>
              )}

              {/* Nomina de socios */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--accent-terracota)] font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>Nómina de socios ({activeCompany.people.length})</span>
                </h4>

                {activeCompany.people.length === 0 && (
                  <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                    Aún no hay integrantes registrados en esta compañía.
                  </p>
                )}

                <div className="space-y-2">
                  {activeCompany.people.map((person: any) => (
                    <div
                      key={person.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/30 border-white/10'
                      }`}
                    >
                      {editandoPersona === person.id ? (
                        <div className="w-full space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="block text-[10px] font-medium">
                              <span className="mb-0.5 block opacity-70">Nombre y apellido</span>
                              <input
                                type="text"
                                className={campito}
                                value={borradorPersona.fullName || ''}
                                onChange={e => setBorradorPersona({ ...borradorPersona, fullName: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] font-medium">
                              <span className="mb-0.5 block opacity-70">Cargo / rol</span>
                              <input
                                type="text"
                                className={campito}
                                placeholder="Dirección, producción, elenco…"
                                value={borradorPersona.roleTitle || ''}
                                onChange={e => setBorradorPersona({ ...borradorPersona, roleTitle: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] font-medium">
                              <span className="mb-0.5 block opacity-70">En qué parte</span>
                              <select
                                className={campito}
                                value={borradorPersona.kind || 'elenco'}
                                onChange={e => setBorradorPersona({ ...borradorPersona, kind: e.target.value })}
                              >
                                <option value="elenco">Elenco (artistas)</option>
                                <option value="equipo">Equipo (técnica y producción)</option>
                                <option value="socio">Socio/a</option>
                                <option value="colaborador">Colaborador/a</option>
                              </select>
                            </label>
                            <label className="block text-[10px] font-medium">
                              <span className="mb-0.5 block opacity-70">Correo (opcional)</span>
                              <input
                                type="text"
                                className={campito}
                                placeholder="para vincular su cuenta"
                                value={borradorPersona.email || ''}
                                onChange={e => setBorradorPersona({ ...borradorPersona, email: e.target.value })}
                              />
                            </label>
                          </div>
                          <label className="block text-[10px] font-medium">
                            <span className="mb-0.5 block opacity-70">
                              Personaje (opcional — sólo si es un papel de un montaje)
                            </span>
                            <input
                              type="text"
                              className={campito}
                              placeholder="Se puede dejar vacío"
                              value={borradorPersona.characterName || ''}
                              onChange={e => setBorradorPersona({ ...borradorPersona, characterName: e.target.value })}
                            />
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={guardarPersona}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoPersona(null)}
                              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                                isLight ? 'border-stone-300 text-stone-700 hover:bg-stone-100' : 'border-white/15 text-slate-200 hover:bg-white/5'
                              }`}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block truncate">{person.fullName}</span>
                            <span className={`text-[10px] block truncate ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                              {person.roleTitle || 'Sin cargo'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--accent-terracota)]/15 text-[var(--accent-terracota)]">
                              {person.kind}
                            </span>
                            <button
                              type="button"
                              onClick={() => abrirEdicionPersona(person)}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                isLight ? 'text-stone-500 hover:bg-stone-200' : 'text-slate-300 hover:bg-white/10'
                              }`}
                              title="Editar integrante"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePerson(person.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Quitar de la nómina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddPerson} className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={newPerson.name}
                    onChange={e => setNewPerson({ ...newPerson, name: e.target.value })}
                    placeholder="Nombre y apellido"
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                  <input
                    type="text"
                    value={newPerson.role}
                    onChange={e => setNewPerson({ ...newPerson, role: e.target.value })}
                    placeholder="Cargo (ej: Dirección)"
                    className={`sm:w-40 px-3 py-2 text-xs rounded-xl border outline-none ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                  <select
                    value={newPerson.kind}
                    onChange={e => setNewPerson({ ...newPerson, kind: e.target.value })}
                    className={`sm:w-32 px-3 py-2 text-xs rounded-xl border outline-none ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  >
                    <option value="socio">Socio</option>
                    <option value="elenco">Elenco</option>
                    <option value="equipo">Equipo</option>
                    <option value="colaborador">Colaborador</option>
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </form>
              </div>

              {/* Active Projects / Repertoire */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--accent-terracota)] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Obras del catálogo ({activeCompany.obras.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCompany.obras.map((obra: any) => (
                    <div
                      key={obra.id}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
                        isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/25 border-white/10 text-white'
                      }`}
                    >
                      {obra.image ? (
                        <img src={obra.image} alt={obra.title} className="w-10 h-10 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-[var(--accent-terracota)]" />
                        </div>
                      )}
                      <span className="flex-1 min-w-0 truncate">{obra.title}</span>
                      <span className="text-[10px] font-mono text-[var(--accent-terracota)] bg-[var(--accent-terracota)]/10 px-2 py-0.5 rounded shrink-0">
                        {obra.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarObra(obra.id)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Quitar este montaje de la agrupación (la obra sigue en el catálogo)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {activeCompany.obras.length === 0 && (
                    <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                      Esta compañía todavía no tiene obras vinculadas en el catálogo.
                    </p>
                  )}
                </div>

                {/* Vincular una obra del CATÁLOGO real (no texto libre): queda como montaje */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <select
                    value={obraElegida}
                    onChange={e => setObraElegida(e.target.value)}
                    className={`flex-1 min-w-[220px] px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                      isLight ? 'bg-white border-stone-300' : 'bg-black/30 border-white/15 text-white'
                    }`}
                  >
                    <option value="">Elegir una obra del catálogo…</option>
                    {catalogo
                      .filter((p: any) => !activeCompany.obras.some((o: any) => o.id === p.id))
                      .map((p: any) => (
                        <option key={p.id} value={p.id} disabled={!!p.company_id && p.company_id !== activeCompany.id}>
                          {p.title}{p.company_name ? ` — está en ${p.company_name}` : ''}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => vincularObra(obraElegida)}
                    disabled={!obraElegida}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--accent-terracota)]/50 text-[var(--accent-terracota)] hover:bg-[var(--accent-terracota)]/10 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Vincular obra del catálogo</span>
                  </button>
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
            isLight ? 'bg-white border-stone-200 text-stone-900 shadow-2xl' : 'bg-[#1C1210] border-[var(--border-color)] text-white shadow-2xl'
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
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
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
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
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
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
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
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
                      isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">ID interno (opcional)</label>
                  <input
                    type="text"
                    placeholder="aurora_theatre_sql"
                    value={newComp.sqlTag}
                    onChange={e => setNewComp({ ...newComp, sqlTag: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
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
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracota)] ${
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
                  className="px-5 py-2 rounded-xl bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white text-xs font-semibold shadow-lg shadow-[var(--accent-terracota)]/20 cursor-pointer"
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
