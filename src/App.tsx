/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Obra,
  Lead,
  ProjectRD,
  EventSchedule,
  ArtistAvailability,
  InventoryItem,
  FinanceRecord,
  ProcessLog,
  Venue,
  TeamMember,
  TechnicalRider,
  ReminderNotification,
  UserProfile,
  UserSession,
  AboutCompanyInfo,
  CompanyGroup
} from './types';
import {
  CompaniasSection,
  initialCompaniesData
} from './components/sections/CompaniasSection';
import { VentasSection } from './components/sections/VentasSection';
import {
  initialObras,
  initialLeads,
  initialRDProjects,
  initialEvents,
  initialArtists,
  initialInventory,
  initialFinances,
  initialProcessLogs,
  initialVenues,
  initialTeam,
  initialRiders,
  initialReminders,
  initialAboutInfo,
  defaultUserProfile
} from './data/initialData';
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS
} from './utils/storage';

// Modals & Navigation
import { Navbar } from './components/Navbar';
import { DesignPanel } from './components/DesignPanel';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarDrawer } from './components/SidebarDrawer';
import { FaseLogo } from './components/FaseLogo';
import { DossierModal } from './components/DossierModal';
import { EditObraModal } from './components/EditObraModal';
import { EditLeadModal } from './components/EditLeadModal';
import { AuthModal } from './components/AuthModal';
import { guardarSesionCompartida } from './utils/sesionEcosistema';
import { NotificationsModal } from './components/NotificationsModal';
import { SqlDataHubModal } from './components/SqlDataHubModal';
import {
  fetchAllFromSql,
  saveObraToSql,
  deleteObraFromSql,
  saveLeadToSql,
  deleteLeadFromSql,
  saveFinanceToSql,
  saveInventoryToSql
} from './services/apiClient';

// Sections
import { DashboardSection } from './components/sections/DashboardSection';
import { CatalogoObrasSection } from './components/sections/CatalogoObrasSection';
import { CrmLeadsSection } from './components/sections/CrmLeadsSection';
import { EquipoSection } from './components/sections/EquipoSection';
import { VenuesSection } from './components/sections/VenuesSection';
import { InventarioSection } from './components/sections/InventarioSection';
import { FinanzasSection } from './components/sections/FinanzasSection';
import { RidersSection } from './components/sections/RidersSection';
import { EcosistemaSection } from './components/sections/EcosistemaSection';
import { AccesoAppReal } from './components/sections/AccesoAppReal';
import { ArquitectoProyectosSection } from './components/sections/ArquitectoProyectosSection';
import { AdminSection } from './components/sections/AdminSection';
import { UsuariosRolesSection } from './components/sections/UsuariosRolesSection';

export type ThemeMode = 'terracota' | 'dia';

export default function App() {
  // Navigation
  const [activeSection, setActiveSection] = useState<string>('inicio');

  // ── ACCESOS DESDE LA APP MÓVIL ──────────────────────────────────────────────
  // ?ir=<seccion> abre directo esa sección y ?email= adopta la identidad del
  // explorador, así se entra al CRM ya logueado (un solo login en el ecosistema).
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const ir = String(q.get('ir') || '').trim();
      const seccionesValidas = ['inicio', 'companias', 'obras', 'crm', 'ventas',
        'venues', 'inventario', 'finanzas', 'riders', 'equipo',
        'planner', 'arquitecto', 'ecosistema', 'admin'];
      if (ir && seccionesValidas.includes(ir)) setActiveSection(ir);
      const email = String(q.get('email') || '').trim();
      if (email.includes('@')) {
        const actual = loadFromStorage<any>(STORAGE_KEYS.USER_PROFILE, null);
        if (!actual || String(actual.email || '').toLowerCase() !== email.toLowerCase()) {
          const usuario = {
            id: String(q.get('id') || ''),
            email: email.toLowerCase(),
            name: String(q.get('nombre') || email.split('@')[0]),
            role: String(q.get('rol') || 'cliente'),
            role_title: String(q.get('cargo') || ''),
            avatar: String(q.get('foto') || ''),
            provider: 'google' as const,
          };
          saveToStorage(STORAGE_KEYS.USER_PROFILE, usuario);
          guardarSesionCompartida(usuario);
        }
      }
      if (ir || email) window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.warn('No se pudo aplicar el acceso directo:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Theme: Terracota (dark) vs Día (white) - Default: Día (Light)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fase_theme');
      if (saved === 'dia' || saved === 'terracota') return saved;
    }
    return 'dia';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dia') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    }
    try {
      localStorage.setItem('fase_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'terracota' ? 'dia' : 'terracota'));
  };

  // Authentication & Settings
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    loadFromStorage<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null)
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(`atha_${STORAGE_KEYS.USER_PROFILE}`);
      localStorage.removeItem('user_session');
      window.dispatchEvent(new Event('user_session_updated'));
    } catch {}
    setIsAuthModalOpen(false);
  };



  const handleUpdateUserAvatar = (avatarUrl: string) => {
    if (currentUser) {
      const updated = { ...currentUser, avatar: avatarUrl };
      setCurrentUser(updated);
      saveToStorage(STORAGE_KEYS.USER_PROFILE, updated);
      guardarSesionCompartida(updated);
    }
  };

  const handleUpdateUser = (updatedUser: UserSession) => {
    setCurrentUser(updatedUser);
    saveToStorage(STORAGE_KEYS.USER_PROFILE, updatedUser);
    guardarSesionCompartida(updatedUser);
  };

  // Core Data Collections with LocalStorage Persistence
  const [obras, setObras] = useState<Obra[]>(() =>
    loadFromStorage<Obra[]>(STORAGE_KEYS.OBRAS, initialObras)
  );
  const [leads, setLeads] = useState<Lead[]>(() =>
    loadFromStorage<Lead[]>(STORAGE_KEYS.LEADS, initialLeads)
  );
  const [rdProjects, setRdProjects] = useState<ProjectRD[]>(() =>
    loadFromStorage<ProjectRD[]>(STORAGE_KEYS.RD_PROJECTS, initialRDProjects)
  );
  const [events, setEvents] = useState<EventSchedule[]>(() =>
    loadFromStorage<EventSchedule[]>(STORAGE_KEYS.EVENTS, initialEvents)
  );
  const [artists, setArtists] = useState<ArtistAvailability[]>(() =>
    loadFromStorage<ArtistAvailability[]>(STORAGE_KEYS.ARTISTS, initialArtists)
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    loadFromStorage<InventoryItem[]>(STORAGE_KEYS.INVENTORY, initialInventory)
  );
  const [finances, setFinances] = useState<FinanceRecord[]>(() =>
    loadFromStorage<FinanceRecord[]>(STORAGE_KEYS.FINANCES, initialFinances)
  );
  const [processLogs, setProcessLogs] = useState<ProcessLog[]>(() =>
    loadFromStorage<ProcessLog[]>(STORAGE_KEYS.PROCESS_LOGS, initialProcessLogs)
  );
  const [reminders, setReminders] = useState<ReminderNotification[]>(() =>
    loadFromStorage<ReminderNotification[]>(STORAGE_KEYS.REMINDERS, initialReminders)
  );

  // Entities with full CRUD and LocalStorage persistence
  const [venues, setVenues] = useState<Venue[]>(() =>
    loadFromStorage<Venue[]>(STORAGE_KEYS.VENUES, initialVenues)
  );
  const [team, setTeam] = useState<TeamMember[]>(() => {
    const stored = loadFromStorage<TeamMember[]>(STORAGE_KEYS.TEAM, initialTeam);
    // Refresca las fotos reales del equipo: si el navegador tenia cacheada una
    // imagen generada (unsplash) y ya existe la foto real, se usa la real.
    return (stored || []).map((m) => {
      const real = initialTeam.find((t) => t.name === m.name);
      if (real && real.image && (!m.image || m.image.includes('unsplash.com'))) {
        return { ...m, image: real.image };
      }
      return m;
    });
  });
  const [riders, setRiders] = useState<TechnicalRider[]>(() =>
    loadFromStorage<TechnicalRider[]>(STORAGE_KEYS.RIDERS, initialRiders)
  );
  const [aboutInfo, setAboutInfo] = useState<AboutCompanyInfo>(() =>
    loadFromStorage<AboutCompanyInfo>(STORAGE_KEYS.ABOUT_INFO, initialAboutInfo)
  );
  const [companies, setCompanies] = useState<CompanyGroup[]>(() =>
    loadFromStorage<CompanyGroup[]>('companies', initialCompaniesData)
  );

  const handleUpdateCompanies = (updated: CompanyGroup[]) => {
    setCompanies(updated);
    saveToStorage('companies', updated);
  };

  // Modals state
  const [dossierObra, setDossierObra] = useState<Obra | null>(null);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [isNewObraOpen, setIsNewObraOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState<boolean>(false);
  const [isSqlHubOpen, setIsSqlHubOpen] = useState<boolean>(false);

  // Synchronize with Cloud SQL (PostgreSQL) on mount
  useEffect(() => {
    fetchAllFromSql().then(res => {
      if (res && res.success) {
        setObras(res.obras || []);          // lo real manda, aunque venga vacío
        setLeads(res.leads || []);
        setFinances(res.finances || []);
        setInventory(res.inventory || []);
        setVenues(res.venues || []);
        setEvents(res.events || []);
      }
    }).catch(err => {
      console.warn('Initial SQL fetch skipped:', err);
    });
  }, []);

  // Persist state updates to localStorage
  useEffect(() => {
    // Check for user_session saved by the backend login
    try {
      const rawSession = localStorage.getItem('user_session');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session && (session.display_name || session.email)) {
          setCurrentUser(prev => ({
            id: session.user_id || session.id || prev?.id || 'usr_fase_1',
            name: session.display_name || session.name || prev?.name || 'ATHA',
            email: session.email || prev?.email || '',
            role: session.role_title || session.role || session.title || prev?.role || 'Productor',
            avatar: session.avatar_url || session.avatar || session.picture || prev?.avatar || '',
            provider: session.provider || prev?.provider || 'google',
            initials: (session.display_name || session.name || 'AT').substring(0, 2).toUpperCase()
          }));
        }
      }
    } catch {
      // Fallback: usar datos locales si hay error parsing
    }
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OBRAS, obras);
  }, [obras]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LEADS, leads);
  }, [leads]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RD_PROJECTS, rdProjects);
  }, [rdProjects]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EVENTS, events);
  }, [events]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ARTISTS, artists);
  }, [artists]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.INVENTORY, inventory);
  }, [inventory]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FINANCES, finances);
  }, [finances]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROCESS_LOGS, processLogs);
  }, [processLogs]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REMINDERS, reminders);
  }, [reminders]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USER_PROFILE, currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VENUES, venues);
  }, [venues]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TEAM, team);
  }, [team]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RIDERS, riders);
  }, [riders]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ABOUT_INFO, aboutInfo);
  }, [aboutInfo]);

  // Handlers for Obra CRUD
  const handleSaveObra = (savedObra: Obra) => {
    saveObraToSql(savedObra);
    setObras(prev => {
      const exists = prev.some(o => o.id === savedObra.id);
      if (exists) {
        return prev.map(o => (o.id === savedObra.id ? savedObra : o));
      }
      return [savedObra, ...prev];
    });
    setEditingObra(null);
    setIsNewObraOpen(false);
  };

  const handleDeleteObra = (obraId: string) => {
    deleteObraFromSql(obraId);
    setObras(prev => prev.filter(o => o.id !== obraId));
  };

  // Handlers for Lead CRUD
  const handleSaveLead = (savedLead: Lead) => {
    saveLeadToSql(savedLead);
    setLeads(prev => {
      const exists = prev.some(l => l.id === savedLead.id);
      if (exists) {
        return prev.map(l => (l.id === savedLead.id ? savedLead : l));
      }
      return [savedLead, ...prev];
    });
    setEditingLead(null);
    setIsNewLeadOpen(false);
  };

  const handleDeleteLead = (leadId: string) => {
    deleteLeadFromSql(leadId);
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  // Handler for R&D Projects CRUD
  const handleUpdateProjectProgress = (projectId: string, newProgress: number) => {
    setRdProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, progress: newProgress, updatedAt: 'Recién' } : p))
    );
  };

  const handleSaveRdProject = (savedProject: ProjectRD) => {
    setRdProjects(prev => {
      const exists = prev.some(p => p.id === savedProject.id);
      if (exists) {
        return prev.map(p => (p.id === savedProject.id ? savedProject : p));
      }
      return [savedProject, ...prev];
    });
  };

  const handleDeleteRdProject = (projectId: string) => {
    setRdProjects(prev => prev.filter(p => p.id !== projectId));
  };

  // Handler for Calendar Events CRUD
  const handleAddEvent = (newEvent: EventSchedule) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  const handleSaveEvent = (savedEvent: EventSchedule) => {
    setEvents(prev => {
      const exists = prev.some(e => e.id === savedEvent.id);
      if (exists) {
        return prev.map(e => (e.id === savedEvent.id ? savedEvent : e));
      }
      return [savedEvent, ...prev];
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  // Handlers for Artists CRUD
  const handleUpdateArtistAvailability = (updatedArtist: ArtistAvailability) => {
    setArtists(prev =>
      prev.map(a => (a.id === updatedArtist.id ? updatedArtist : a))
    );
  };

  const handleAddArtist = (newArtist: ArtistAvailability) => {
    setArtists(prev => [newArtist, ...prev]);
  };

  const handleDeleteArtist = (artistId: string) => {
    setArtists(prev => prev.filter(a => a.id !== artistId));
  };

  // Handlers for Inventory CRUD
  const handleUpdateItemStatus = (itemId: string, newStatus: InventoryItem['status']) => {
    setInventory(prev =>
      prev.map(item => (item.id === itemId ? { ...item, status: newStatus } : item))
    );
  };

  const handleSaveInventoryItem = (savedItem: InventoryItem) => {
    saveInventoryToSql(savedItem);
    setInventory(prev => {
      const exists = prev.some(i => i.id === savedItem.id);
      if (exists) {
        return prev.map(i => (i.id === savedItem.id ? savedItem : i));
      }
      return [savedItem, ...prev];
    });
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    setInventory(prev => prev.filter(i => i.id !== itemId));
  };

  // Handlers for Finance records CRUD
  const handleAddFinanceRecord = (newRecord: FinanceRecord) => {
    saveFinanceToSql(newRecord);
    setFinances(prev => [newRecord, ...prev]);
  };

  const handleSaveFinanceRecord = (savedRecord: FinanceRecord) => {
    saveFinanceToSql(savedRecord);
    setFinances(prev => {
      const exists = prev.some(f => f.id === savedRecord.id);
      if (exists) {
        return prev.map(f => (f.id === savedRecord.id ? savedRecord : f));
      }
      return [savedRecord, ...prev];
    });
  };

  const handleDeleteFinanceRecord = (recordId: string) => {
    setFinances(prev => prev.filter(f => f.id !== recordId));
  };

  // Handlers for Process Logs CRUD
  const handleAddProcessLog = (newLog: ProcessLog) => {
    setProcessLogs(prev => [newLog, ...prev]);
  };

  const handleSaveProcessLog = (savedLog: ProcessLog) => {
    setProcessLogs(prev => {
      const exists = prev.some(l => l.id === savedLog.id);
      if (exists) {
        return prev.map(l => (l.id === savedLog.id ? savedLog : l));
      }
      return [savedLog, ...prev];
    });
  };

  const handleDeleteProcessLog = (logId: string) => {
    setProcessLogs(prev => prev.filter(l => l.id !== logId));
  };

  // Handlers for Venues CRUD
  const handleSaveVenue = (savedVenue: Venue) => {
    setVenues(prev => {
      const exists = prev.some(v => v.id === savedVenue.id);
      if (exists) {
        return prev.map(v => (v.id === savedVenue.id ? savedVenue : v));
      }
      return [savedVenue, ...prev];
    });
  };

  const handleDeleteVenue = (venueId: string) => {
    setVenues(prev => prev.filter(v => v.id !== venueId));
  };

  // Handlers for Team Members CRUD
  const handleSaveTeamMember = (savedMember: TeamMember) => {
    setTeam(prev => {
      const exists = prev.some(m => m.id === savedMember.id);
      if (exists) {
        return prev.map(m => (m.id === savedMember.id ? savedMember : m));
      }
      return [savedMember, ...prev];
    });
  };

  const handleDeleteTeamMember = (memberId: string) => {
    setTeam(prev => prev.filter(m => m.id !== memberId));
  };

  // Handlers for Technical Riders CRUD
  const handleSaveRider = (savedRider: TechnicalRider) => {
    setRiders(prev => {
      const exists = prev.some(r => r.id === savedRider.id);
      if (exists) {
        return prev.map(r => (r.id === savedRider.id ? savedRider : r));
      }
      return [savedRider, ...prev];
    });
  };

  const handleDeleteRider = (riderId: string) => {
    setRiders(prev => prev.filter(r => r.id !== riderId));
  };

  // Handler for About Institutional Info
  const handleSaveAboutInfo = (newInfo: AboutCompanyInfo) => {
    setAboutInfo(newInfo);
  };

  // Reminders / Push Notifications handlers
  const handleMarkAsRead = (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, read: true } : r))
    );
  };

  const handleClearAllReminders = () => {
    setReminders(prev => prev.map(r => ({ ...r, read: true })));
  };

  const handleTriggerSimulatedPush = () => {
    const newPush: ReminderNotification = {
      id: `push-${Date.now()}`,
      title: '¡Alerta de Gira en Vivo!',
      message: 'Teatro Biobío confirmó la fecha técnica de montaje para "La Memoria del Agua".',
      type: 'reminder',
      date: new Date().toLocaleDateString('es-CL'),
      read: false
    };
    setReminders(prev => [newPush, ...prev]);
  };

  // Navigation from search or internal links
  const handleNavigateSection = (sectionId: string) => {
    if (sectionId === 'sql-hub') {
      setIsSqlHubOpen(true);
      return;
    }
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectObraFromDashboard = (obra: Obra) => {
    setDossierObra(obra);
  };

  const [isDesignPanelOpen, setIsDesignPanelOpen] = useState(false);
  const unreadRemindersCount = reminders.filter(r => !r.read).length;

  const contenidoApp = !currentUser ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <AuthModal
        isOpen={true}
        currentUser={null}
        onSelectUser={(profile) => {
          setCurrentUser(profile);
          saveToStorage(STORAGE_KEYS.USER_PROFILE, profile);
        }}
        theme={theme}
      />
    </div>
  ) : (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      theme === 'dia'
        ? 'bg-[#F8F6F4] text-stone-900 selection:bg-[var(--accent-terracota)]/20 selection:text-[var(--accent-terracota)]'
        : 'bg-[#140D0C] text-[#FDF5F4] selection:bg-[var(--accent-terracota)]/20 selection:text-[var(--accent-glow)]'
    } ${highContrast ? 'contrast-125' : ''}`}>
      
      {/* Top Navigation Bar with Direct Visible Menus */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onOpenSqlHub={() => setIsSqlHubOpen(true)}
        unreadNotificationsCount={unreadRemindersCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(prev => !prev)}
        obras={obras}
        leads={leads}
        venues={venues}
        activeSection={activeSection}
        onNavigateSection={handleNavigateSection}
        counts={{
          obras: obras.length,
          leads: leads.length,
          rd: rdProjects.length,
          events: events.length,
          inventory: inventory.length
        }}
        onSelectObra={(obra) => setDossierObra(obra)}
        onOpenDesignPanel={() => setIsDesignPanelOpen(true)}
      />

      {/* Slide-out Sidebar Drawer for Complete Categorized Overview */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeSection={activeSection}
        onSelectSection={handleNavigateSection}
        counts={{
          obras: obras.length,
          leads: leads.length,
          rd: rdProjects.length,
          events: events.length,
          inventory: inventory.length
        }}
        theme={theme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeSection === 'inicio' && (
          <DashboardSection
            obras={obras}
            leads={leads}
            rdProjects={rdProjects}
            events={events}
            finances={finances}
            currentUser={currentUser}
            onUpdateUserAvatar={handleUpdateUserAvatar}
            onNavigateSection={handleNavigateSection}
            onSelectObra={handleSelectObraFromDashboard}
            theme={theme}
          />
        )}

        {activeSection === 'companias' && (
          <CompaniasSection
            companies={companies}
            onUpdateCompanies={handleUpdateCompanies}
            theme={theme}
          />
        )}

        {activeSection === 'ventas' && (
          <VentasSection
            obras={obras}
            leads={leads}
            theme={theme}
          />
        )}

        {activeSection === 'planner' && (<AccesoAppReal destino="planner" theme={theme} />)}

        {activeSection === 'arquitecto' && (<AccesoAppReal destino="arquitecto" theme={theme} />)}

        {/* Usuarios, roles y nóminas: sólo owner y dirección (el hub lo valida) */}
        {activeSection === 'admin' && <UsuariosRolesSection theme={theme} />}

        {activeSection === 'admin' && (
          <AdminSection
            aboutInfo={aboutInfo}
            onSaveAboutInfo={handleSaveAboutInfo}
            onOpenSqlHub={() => setIsSqlHubOpen(true)}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            theme={theme}
            counts={{
              obras: obras.length,
              leads: leads.length,
              venues: venues.length,
              events: events.length,
              finances: finances.length,
              inventory: inventory.length
            }}
          />
        )}

        {activeSection === 'obras' && (
          <CatalogoObrasSection
            obras={obras}
            onOpenDossier={(obra) => setDossierObra(obra)}
            onEditObra={(obra) => setEditingObra(obra)}
            onNewObra={() => setIsNewObraOpen(true)}
            theme={theme}
          />
        )}

        {activeSection === 'crm' && (
          <CrmLeadsSection
            leads={leads}
            onOpenNewLead={() => setIsNewLeadOpen(true)}
            onEditLead={(lead) => setEditingLead(lead)}
            onDeleteLead={handleDeleteLead}
            theme={theme}
          />
        )}

        {activeSection === 'equipo' && (
          <EquipoSection
            team={team}
            onSaveMember={handleSaveTeamMember}
            onDeleteMember={handleDeleteTeamMember}
          />
        )}

        {activeSection === 'venues' && (
          <VenuesSection
            venues={venues}
            onSaveVenue={handleSaveVenue}
            onDeleteVenue={handleDeleteVenue}
            theme={theme}
          />
        )}

        {activeSection === 'inventario' && (
          // Sección autocontenida: lee y escribe en el hub del CRM por su cuenta
          // (/api/v1/crm/inventario). Antes recibía datos demo y no el tema, por
          // eso quedaba con letras blancas sobre fondo claro.
          <InventarioSection theme={theme} />
        )}

        {activeSection === 'finanzas' && (
          <FinanzasSection
            finances={finances}
            obras={obras}
            rdProjects={rdProjects}
            onAddFinanceRecord={handleAddFinanceRecord}
            onSaveRecord={handleSaveFinanceRecord}
            onDeleteRecord={handleDeleteFinanceRecord}
          />
        )}

        {activeSection === 'riders' && (
          <RidersSection
            riders={riders}
            obras={obras}
            onSaveRider={handleSaveRider}
            onDeleteRider={handleDeleteRider}
          />
        )}

        {activeSection === 'ecosistema' && (
          <EcosistemaSection />
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t py-6 px-4 sm:px-6 lg:px-8 text-xs transition-colors backdrop-blur-md ${
        theme === 'dia'
          ? 'bg-white/95 border-[var(--border-color)] text-stone-600'
          : 'bg-[#140B0A]/95 border-[var(--border-color)] text-slate-400'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FaseLogo variant="horizontal" size="xs" showTagline={false} theme={theme === 'dia' ? 'light' : 'terracota'} />
            <span className={theme === 'dia' ? 'text-stone-300' : 'text-white/20'}>•</span>
            <span className={`text-[11px] ${theme === 'dia' ? 'text-stone-500' : 'text-slate-400'}`}>
              Plataforma de Gestión Escénica v3.0
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button onClick={() => handleNavigateSection('inicio')} className={`cursor-pointer transition-colors ${
              theme === 'dia' ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-[var(--accent-glow)]'
            }`}>
              Panel de Control
            </button>
            <button onClick={() => handleNavigateSection('planner')} className={`cursor-pointer transition-colors ${
              theme === 'dia' ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-[var(--accent-glow)]'
            }`}>
              Planner Escénico
            </button>
            <button onClick={() => handleNavigateSection('arquitecto')} className={`cursor-pointer transition-colors ${
              theme === 'dia' ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-[var(--accent-glow)]'
            }`}>
              Arquitecto Proyectos
            </button>
            <button onClick={() => handleNavigateSection('obras')} className={`cursor-pointer transition-colors ${
              theme === 'dia' ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-[var(--accent-glow)]'
            }`}>
              Catálogo Obras
            </button>
            <button onClick={() => handleNavigateSection('crm')} className={`cursor-pointer transition-colors ${
              theme === 'dia' ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-[var(--accent-glow)]'
            }`}>
              CRM Salas
            </button>
            <button onClick={() => handleNavigateSection('admin')} className={`cursor-pointer transition-colors ${
              theme === 'dia' ? 'hover:text-[var(--accent-terracota)]' : 'hover:text-[var(--accent-glow)]'
            }`}>
              Administración
            </button>
          </div>

          <div className={`text-[11px] font-mono ${theme === 'dia' ? 'text-stone-500' : 'text-slate-400'}`}>
            Chile • 2025 • F.A.S.E Producciones
          </div>
        </div>
      </footer>

      {/* MODALS */}
      
      {/* 1. Dossier Modal */}
      {dossierObra && (
        <DossierModal
          obra={dossierObra}
          isOpen={!!dossierObra}
          onClose={() => setDossierObra(null)}
        />
      )}

      {/* 2. Edit / Create Obra Modal */}
      {(editingObra || isNewObraOpen) && (
        <EditObraModal
          obra={editingObra}
          isOpen={!!editingObra || isNewObraOpen}
          onClose={() => {
            setEditingObra(null);
            setIsNewObraOpen(false);
          }}
          onSave={handleSaveObra}
          onDelete={handleDeleteObra}
        />
      )}

      {/* 3. Edit / Create Lead Modal */}
      {(editingLead || isNewLeadOpen) && (
        <EditLeadModal
          lead={editingLead}
          isOpen={!!editingLead || isNewLeadOpen}
          onClose={() => {
            setEditingLead(null);
            setIsNewLeadOpen(false);
          }}
          onSave={handleSaveLead}
        />
      )}

      {/* 4. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(profile) => setCurrentUser(profile)}
        onLogout={handleLogout}
        theme={theme}
      />

      {/* 5. Notifications / Push Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        reminders={reminders}
        onMarkAsRead={handleMarkAsRead}
        onClearAll={handleClearAllReminders}
        onDeleteReminder={(id) => setReminders(prev => prev.filter(r => r.id !== id))}
        onAddReminder={(newRem) => setReminders(prev => [newRem, ...prev])}
        onTriggerSimulatedPush={handleTriggerSimulatedPush}
        theme={theme}
      />

      {/* 6. Cloud SQL Database & File Import/Export Modal */}
      <SqlDataHubModal
        isOpen={isSqlHubOpen}
        onClose={() => setIsSqlHubOpen(false)}
        onDataRefreshed={() => {
          fetchAllFromSql().then(res => {
            if (res && res.success) {
              if (res.obras) setObras(res.obras);
              if (res.leads) setLeads(res.leads);
              if (res.finances) setFinances(res.finances);
              if (res.inventory) setInventory(res.inventory);
              if (res.venues) setVenues(res.venues);
              if (res.events) setEvents(res.events);
            }
          });
        }}
      />

      {/* Panel de personalización modular de la interfaz */}
      <DesignPanel theme={theme} />

    </div>
  );

  // El módulo de gestión modular necesita el ThemeProvider envolviendo la app
  // (panel de diseño, tema en vivo y barra de navegación editable).
  return (
    <ThemeProvider userId={currentUser?.email || currentUser?.id || 'invitado'}>
      {contenidoApp}
    </ThemeProvider>
  );
}
