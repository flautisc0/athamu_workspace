import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Cloud, CloudCheck, User, Moon, Sun, Sparkles, X, ChevronRight, Layers, MapPin, CheckCircle2 } from 'lucide-react';
import { UserSession, Obra, Lead, Venue } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentUser: UserSession;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  isCloudSynced: boolean;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  obras: Obra[];
  leads: Lead[];
  venues: Venue[];
  onSelectObra: (obra: Obra) => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  currentUser,
  onOpenAuth,
  onOpenNotifications,
  isCloudSynced,
  highContrast,
  onToggleHighContrast,
  obras,
  leads,
  venues,
  onSelectObra,
  onNavigateSection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items in real time
  const filteredObras = searchTerm.trim()
    ? obras.filter(o =>
        o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.synopsis.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 4)
    : [];

  const filteredLeads = searchTerm.trim()
    ? leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.city.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 4)
    : [];

  const filteredVenues = searchTerm.trim()
    ? venues.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.city.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 3)
    : [];

  const totalResults = filteredObras.length + filteredLeads.length + filteredVenues.length;

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#161920]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-6 flex items-center justify-between gap-4">
      
      {/* Left side: Hamburger ☰ + Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Abrir menú de navegación"
          className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6ee7b7]/50"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div
          onClick={() => onNavigateSection('inicio')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0f1115] via-[#1a231f] to-[#6ee7b7]/30 border border-[#6ee7b7]/40 flex items-center justify-center shadow-sm group-hover:border-[#6ee7b7] transition-colors">
            <span className="font-display font-extrabold text-sm tracking-tighter text-[#6ee7b7]">
              A
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-base text-white tracking-wide">
                ATHA
              </span>
              <span className="text-[10px] tracking-widest uppercase font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                PRODUCCIONES
              </span>
            </div>
            <span className="text-[10px] text-[#6ee7b7] font-medium hidden sm:inline-block">
              Intranet de Gestión Escénica
            </span>
          </div>
        </div>
      </div>

      {/* Center: Real-time search bar */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            onFocus={() => setIsSearchDropdownOpen(true)}
            placeholder="Buscador en tiempo real (obras, leads, salas, tareas)..."
            className="w-full pl-9.5 pr-8 py-2 text-xs md:text-sm bg-[#0f1115] border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-[#6ee7b7] focus:ring-1 focus:ring-[#6ee7b7] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setIsSearchDropdownOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Real-time search dropdown results */}
        {isSearchDropdownOpen && searchTerm.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5">
            <div className="px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#12141a]">
              Resultados en tiempo real ({totalResults})
            </div>

            {totalResults === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No se encontraron coincidencias para "{searchTerm}".
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto p-2 space-y-3">
                {/* Obras matching */}
                {filteredObras.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] uppercase font-semibold text-[#6ee7b7]">
                      Obras & Montajes
                    </div>
                    {filteredObras.map(o => (
                      <div
                        key={o.id}
                        onClick={() => {
                          onSelectObra(o);
                          setIsSearchDropdownOpen(false);
                          setSearchTerm('');
                        }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs group"
                      >
                        <div>
                          <span className="font-semibold text-white group-hover:text-[#6ee7b7] transition-colors">{o.title}</span>
                          <span className="text-slate-400 block text-[11px]">{o.discipline} • {o.status}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Leads matching */}
                {filteredLeads.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] uppercase font-semibold text-[#fbbf24]">
                      Contactos & Leads CRM
                    </div>
                    {filteredLeads.map(l => (
                      <div
                        key={l.id}
                        onClick={() => {
                          onNavigateSection('crm');
                          setIsSearchDropdownOpen(false);
                          setSearchTerm('');
                        }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs group"
                      >
                        <div>
                          <span className="font-semibold text-white group-hover:text-[#fbbf24] transition-colors">{l.organization}</span>
                          <span className="text-slate-400 block text-[11px]">{l.name} ({l.city})</span>
                        </div>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Venues matching */}
                {filteredVenues.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] uppercase font-semibold text-[#38bdf8]">
                      Salas & Teatros
                    </div>
                    {filteredVenues.map(v => (
                      <div
                        key={v.id}
                        onClick={() => {
                          onNavigateSection('venues');
                          setIsSearchDropdownOpen(false);
                          setSearchTerm('');
                        }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs group"
                      >
                        <div>
                          <span className="font-semibold text-white group-hover:text-[#38bdf8] transition-colors">{v.name}</span>
                          <span className="text-slate-400 block text-[11px]">{v.city} • Aforo {v.capacity} pax</span>
                        </div>
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 md:gap-3">
        
        {/* High contrast / Night mode toggle */}
        <button
          onClick={onToggleHighContrast}
          title={highContrast ? 'Modo Normal Oscuro' : 'Modo Noche Alto Contraste'}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            highContrast
              ? 'bg-[#6ee7b7]/15 border-[#6ee7b7]/40 text-[#6ee7b7]'
              : 'bg-[#0f1115] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {highContrast ? <Sparkles className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Cloud Sync Status Indicator */}
        <div
          title={isCloudSynced ? 'Datos sincronizados en la nube de ATHA y respaldados localmente' : 'Guardando cambios...'}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f1115] border border-white/10 text-[11px] text-slate-300 font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cloud ATHA</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          aria-label="Notificaciones y Recordatorios"
          className="relative p-2 rounded-xl bg-[#0f1115] border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#fbbf24]" />
        </button>

        {/* User Profile Pill (Triggers AuthModal) */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 p-1 md:pr-3 rounded-xl bg-[#0f1115] border border-white/10 hover:border-[#6ee7b7]/40 transition-colors cursor-pointer group text-left"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-7 h-7 rounded-lg object-cover border border-white/10 group-hover:border-[#6ee7b7]"
            referrerPolicy="no-referrer"
          />
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-semibold text-white group-hover:text-[#6ee7b7] transition-colors leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight">
              Socio Fundador
            </span>
          </div>
        </button>

      </div>

    </header>
  );
};
