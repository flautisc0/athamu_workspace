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
  UserProfile
} from './types';
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
  defaultUserProfile
} from './data/initialData';
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS
} from './utils/storage';

// Modals
import { Navbar } from './components/Navbar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DossierModal } from './components/DossierModal';
import { EditObraModal } from './components/EditObraModal';
import { EditLeadModal } from './components/EditLeadModal';
import { AuthModal } from './components/AuthModal';
import { NotificationsModal } from './components/NotificationsModal';

// Sections
import { DashboardSection } from './components/sections/DashboardSection';
import { CatalogoObrasSection } from './components/sections/CatalogoObrasSection';
import { ProyectosIDSection } from './components/sections/ProyectosIDSection';
import { CrmLeadsSection } from './components/sections/CrmLeadsSection';
import { CalendarioSection } from './components/sections/CalendarioSection';
import { CalculadoraEstrenosSection } from './components/sections/CalculadoraEstrenosSection';
import { EquipoSection } from './components/sections/EquipoSection';
import { VenuesSection } from './components/sections/VenuesSection';
import { InventarioSection } from './components/sections/InventarioSection';
import { FinanzasSection } from './components/sections/FinanzasSection';
import { DiarioProcesoSection } from './components/sections/DiarioProcesoSection';
import { RidersSection } from './components/sections/RidersSection';
import { AcercaSection } from './components/sections/AcercaSection';

export default function App() {
  // Navigation & Drawer
  const [activeSection, setActiveSection] = useState<string>('inicio');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Authentication & Settings
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    loadFromStorage<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, defaultUserProfile)
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncCloud = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsCloudSynced(true);
    }, 1200);
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

  // Static reference data
  const venues = initialVenues;
  const team = initialTeam;
  const riders = initialRiders;

  // Modals state
  const [dossierObra, setDossierObra] = useState<Obra | null>(null);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [isNewObraOpen, setIsNewObraOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState<boolean>(false);

  // Persist state updates to localStorage
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

  // Handlers for Obra CRUD
  const handleSaveObra = (savedObra: Obra) => {
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
    setObras(prev => prev.filter(o => o.id !== obraId));
  };

  // Handlers for Lead CRUD
  const handleSaveLead = (savedLead: Lead) => {
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
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  // Handler for R&D Progress
  const handleUpdateProjectProgress = (projectId: string, newProgress: number) => {
    setRdProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, progress: newProgress, updatedAt: 'Recién' } : p))
    );
  };

  // Handler for Calendar Event Add
  const handleAddEvent = (newEvent: EventSchedule) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  // Handler for Artist Availability update
  const handleUpdateArtistAvailability = (updatedArtist: ArtistAvailability) => {
    setArtists(prev =>
      prev.map(a => (a.id === updatedArtist.id ? updatedArtist : a))
    );
  };

  // Handler for Inventory status change
  const handleUpdateItemStatus = (itemId: string, newStatus: InventoryItem['status']) => {
    setInventory(prev =>
      prev.map(item => (item.id === itemId ? { ...item, status: newStatus } : item))
    );
  };

  // Handler for Finance record addition
  const handleAddFinanceRecord = (newRecord: FinanceRecord) => {
    setFinances(prev => [newRecord, ...prev]);
  };

  // Handler for Process Log addition
  const handleAddProcessLog = (newLog: ProcessLog) => {
    setProcessLogs(prev => [newLog, ...prev]);
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
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectObraFromDashboard = (obra: Obra) => {
    setDossierObra(obra);
  };

  const unreadRemindersCount = reminders.filter(r => !r.read).length;

  return (
    <div className={`min-h-screen flex flex-col bg-[#0f1115] text-slate-100 font-sans transition-colors duration-300 ${highContrast ? 'contrast-125' : ''}`}>
      
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setIsDrawerOpen(prev => !prev)}
        isSidebarOpen={isDrawerOpen}
        currentUser={currentUser || defaultUserProfile}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        isCloudSynced={isCloudSynced}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(prev => !prev)}
        obras={obras}
        leads={leads}
        venues={venues}
        onSelectObra={(obra) => setDossierObra(obra)}
        onNavigateSection={handleNavigateSection}
      />

      {/* Hamburger Sidebar Drawer */}
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
            onNavigateSection={handleNavigateSection}
            onSelectObra={handleSelectObraFromDashboard}
          />
        )}

        {activeSection === 'obras' && (
          <CatalogoObrasSection
            obras={obras}
            onOpenDossier={(obra) => setDossierObra(obra)}
            onEditObra={(obra) => setEditingObra(obra)}
            onNewObra={() => setIsNewObraOpen(true)}
          />
        )}

        {activeSection === 'id' && (
          <ProyectosIDSection
            projects={rdProjects}
            onUpdateProjectProgress={handleUpdateProjectProgress}
          />
        )}

        {activeSection === 'crm' && (
          <CrmLeadsSection
            leads={leads}
            onOpenNewLead={() => setIsNewLeadOpen(true)}
            onEditLead={(lead) => setEditingLead(lead)}
            onDeleteLead={handleDeleteLead}
          />
        )}

        {activeSection === 'calendario' && (
          <CalendarioSection
            events={events}
            obras={obras}
            onAddEvent={handleAddEvent}
          />
        )}

        {activeSection === 'calculadora' && (
          <CalculadoraEstrenosSection
            obras={obras}
            artists={artists}
            onUpdateArtistAvailability={handleUpdateArtistAvailability}
          />
        )}

        {activeSection === 'equipo' && (
          <EquipoSection team={team} />
        )}

        {activeSection === 'venues' && (
          <VenuesSection venues={venues} />
        )}

        {activeSection === 'inventario' && (
          <InventarioSection
            inventory={inventory}
            onUpdateItemStatus={handleUpdateItemStatus}
          />
        )}

        {activeSection === 'finanzas' && (
          <FinanzasSection
            finances={finances}
            obras={obras}
            rdProjects={rdProjects}
            onAddFinanceRecord={handleAddFinanceRecord}
          />
        )}

        {activeSection === 'diario' && (
          <DiarioProcesoSection
            logs={processLogs}
            obras={obras}
            onAddLog={handleAddProcessLog}
          />
        )}

        {activeSection === 'riders' && (
          <RidersSection riders={riders} />
        )}

        {activeSection === 'acerca' && (
          <AcercaSection />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#12141a]/90 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-display tracking-wide">ATHA PRODUCCIONES</span>
            <span>•</span>
            <span>Intranet de Gestión Escénica v2.5</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button onClick={() => handleNavigateSection('inicio')} className="hover:text-[#6ee7b7] cursor-pointer">
              Diagrama
            </button>
            <button onClick={() => handleNavigateSection('obras')} className="hover:text-[#6ee7b7] cursor-pointer">
              Catálogo Obras
            </button>
            <button onClick={() => handleNavigateSection('crm')} className="hover:text-[#6ee7b7] cursor-pointer">
              CRM Salas
            </button>
            <button onClick={() => handleNavigateSection('calculadora')} className="hover:text-[#6ee7b7] cursor-pointer">
              Calculadora
            </button>
            <button onClick={() => handleNavigateSection('riders')} className="hover:text-[#6ee7b7] cursor-pointer">
              Riders
            </button>
            <button onClick={() => handleNavigateSection('acerca')} className="hover:text-[#6ee7b7] cursor-pointer">
              Acerca de ATHA
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Santiago & Valparaíso, Chile • 2025
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
        currentUser={currentUser || defaultUserProfile}
        onSelectUser={(profile) => setCurrentUser(profile)}
        onSyncCloud={handleSyncCloud}
        isSyncing={isSyncing}
      />

      {/* 5. Notifications / Push Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        reminders={reminders}
        onMarkAsRead={handleMarkAsRead}
        onClearAll={handleClearAllReminders}
        onTriggerSimulatedPush={handleTriggerSimulatedPush}
      />

    </div>
  );
}

