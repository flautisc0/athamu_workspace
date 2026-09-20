import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Sun,
  Flame,
  X,
  ChevronRight,
  MapPin,
  LayoutDashboard,
  Drama,
  FlaskConical,
  Users2,
  CalendarDays,
  Calculator,
  Award,
  Building2,
  PackageCheck,
  ReceiptText,
  BookOpenText,
  FileSpreadsheet,
  Info,
  Workflow,
  Menu,
  Sparkles,
  Database,
  Compass,
  Shield,
  Users,
  Send,
  LogIn,
  UserPlus
} from 'lucide-react';
import { UserProfile, Obra, Lead, Venue } from '../types';
import { FaseLogo } from './FaseLogo';

export interface NavbarCounts {
  obras: number;
  leads: number;
  rd: number;
  events: number;
  inventory: number;
}

export interface NavbarProps {
  currentUser?: UserProfile | null;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onOpenSqlHub?: () => void;
  unreadNotificationsCount?: number;
  isCloudSynced: boolean;
  theme?: 'terracota' | 'dia';
  onToggleTheme?: () => void;
  onOpenDrawer?: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  obras: Obra[];
  leads: Lead[];
  venues: Venue[];
  activeSection: string;
  onNavigateSection: (sectionId: string) => void;
  counts?: NavbarCounts;
  onSelectObra: (obra: Obra) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onOpenNotifications,
  onOpenSqlHub,
  unreadNotificationsCount = 0,
  isCloudSynced,
  theme = 'terracota',
  onToggleTheme,
  onOpenDrawer,
  highContrast = false,
  onToggleHighContrast,
  obras,
  leads,
  venues,
  activeSection,
  onNavigateSection,
  counts = { obras: 0, leads: 0, rd: 0, events: 0, inventory: 0 },
  onSelectObra
}) => {
  const isLight = theme === 'dia';

  // Real-time search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter items in real time for search
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

  // Direct visible navigation items
  const directNavItems = [
    { id: 'inicio', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'perfil', label: 'Perfil & Portafolio', icon: Award },
    { id: 'companias', label: 'Compañías / Agrupaciones', icon: Users },
    { id: 'obras', label: 'Catálogo Obras', icon: Drama, badge: counts.obras },
    { id: 'crm', label: 'CRM Leads', icon: Users2, badge: counts.leads },
    { id: 'calendario', label: 'Planificación', icon: CalendarDays, badge: counts.events },
    { id: 'ventas', label: 'Ventas & Pitching', icon: Send },
    { id: 'id', label: 'Proyectos I+D', icon: FlaskConical, badge: counts.rd },
    { id: 'venues', label: 'Salas & Venues', icon: Building2 },
    { id: 'inventario', label: 'Inventario Backline', icon: PackageCheck, badge: counts.inventory },
    { id: 'finanzas', label: 'Finanzas & Rendiciones', icon: ReceiptText },
    { id: 'riders', label: 'Riders Técnicos', icon: FileSpreadsheet },
    { id: 'diario', label: 'Diario Proceso', icon: BookOpenText },
    { id: 'ecosistema', label: 'Ecosistema ATHA', icon: Workflow },
    { id: 'admin', label: 'Administración', icon: Shield }
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-200 border-b ${
        isLight
          ? 'bg-white/95 border-[#E5DDD8] text-stone-900 shadow-xs'
          : 'bg-[#180F0E]/95 border-[#3E221E] text-slate-100 shadow-lg'
      } backdrop-blur-md`}
    >
      {/* Tier 1: Top Bar (Drawer Button + Logo + Search + Theme Switcher + Sync + Bell + User) */}
      <div className={`h-14 px-3 sm:px-6 flex items-center justify-between gap-2.5 sm:gap-4 border-b ${
        isLight ? 'border-[#EFE9E5]' : 'border-white/5'
      }`}>
        
        {/* Left: Drawer Trigger + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Hamburger Drawer Button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Abrir todos los módulos"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLight
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200 shadow-xs'
                : 'bg-[#241513] hover:bg-[#321D1A] text-[#FDF5F4] border-[#442420] shadow-xs'
            }`}
            title="Abrir menú completo de módulos"
          >
            <Menu className={`w-4 h-4 ${isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'}`} />
            <span className="hidden sm:inline">Módulos</span>
          </button>

          {/* F.A.S.E Brand Logo */}
          <div
            onClick={() => onNavigateSection('inicio')}
            className="flex items-center cursor-pointer select-none transition-transform hover:scale-[1.02]"
            title="Ir al Panel de Control (Dashboard)"
          >
            <FaseLogo
              variant="horizontal"
              size="sm"
              showTagline={false}
              theme={isLight ? 'light' : 'terracota'}
            />
          </div>
        </div>

        {/* Center: Real-time search bar */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-sm hidden md:block">
          <div className="relative">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
              isLight ? 'text-stone-400' : 'text-[#D4B2AD]'
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="Buscar obras, leads, salas..."
              className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl transition-all focus:outline-none ${
                isLight
                  ? 'bg-stone-100 border border-stone-200 text-stone-900 placeholder-stone-400 focus:bg-white focus:border-[#C84835] focus:ring-1 focus:ring-[#C84835]'
                  : 'bg-[#120B0A] border border-[#3E221E] text-white placeholder-stone-400 focus:border-[#E05A47] focus:ring-1 focus:ring-[#E05A47]'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchDropdownOpen && searchTerm.trim() && (
            <div
              className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y animate-fadeIn ${
                isLight
                  ? 'bg-white border border-stone-200 divide-stone-100 text-stone-900'
                  : 'bg-[#1E1311] border border-[#3E221E] divide-[#3E221E]/50 text-white'
              }`}
            >
              <div className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider ${
                isLight ? 'bg-stone-50 text-stone-500' : 'bg-[#150D0C] text-[#D4B2AD]'
              }`}>
                Resultados en tiempo real ({totalResults})
              </div>

              {totalResults === 0 ? (
                <div className={`p-4 text-center text-xs ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                  No se encontraron coincidencias para "{searchTerm}".
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto p-2 space-y-3">
                  {/* Obras */}
                  {filteredObras.length > 0 && (
                    <div>
                      <div className={`px-2 py-1 text-[10px] uppercase font-semibold ${
                        isLight ? 'text-[#C84835]' : 'text-[#FF6B4A]'
                      }`}>
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
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs group transition-colors ${
                            isLight ? 'hover:bg-stone-100' : 'hover:bg-white/5'
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{o.title}</span>
                            <span className={`block text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                              {o.discipline} • {o.status}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leads */}
                  {filteredLeads.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] uppercase font-semibold text-amber-500">
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
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs group transition-colors ${
                            isLight ? 'hover:bg-stone-100' : 'hover:bg-white/5'
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{l.organization}</span>
                            <span className={`block text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                              {l.name} ({l.city})
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                            isLight ? 'bg-stone-100 text-stone-700' : 'bg-white/10 text-slate-300'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Venues */}
                  {filteredVenues.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] uppercase font-semibold text-sky-500">
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
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs group transition-colors ${
                            isLight ? 'hover:bg-stone-100' : 'hover:bg-white/5'
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{v.name}</span>
                            <span className={`block text-[11px] ${isLight ? 'text-stone-500' : 'text-slate-400'}`}>
                              {v.city} • Aforo {v.capacity} pax
                            </span>
                          </div>
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Theme Switcher + Sync + Notifications + User */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* THEME TOGGLE: Terracota (Dark) <-> Día (White) */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={isLight ? 'Cambiar a Modo Oscuro (Terracota)' : 'Cambiar a Modo Día (Blanco)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
              isLight
                ? 'bg-[#E05A47]/10 text-[#C84835] border-[#E05A47]/30 hover:bg-[#E05A47]/20 shadow-xs'
                : 'bg-[#281614] text-[#FF6B4A] border-[#442420] hover:bg-[#341C19] shadow-xs'
            }`}
          >
            {isLight ? (
              <>
                <Flame className="w-3.5 h-3.5 text-[#C84835]" />
                <span className="hidden sm:inline">Modo Terracota</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modo Día</span>
              </>
            )}
          </button>

          {/* Cloud Sync Status */}
          <div
            title={isCloudSynced ? 'Sincronizado con F.A.S.E Cloud' : 'Guardando...'}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono border ${
              isLight
                ? 'bg-stone-50 border-stone-200 text-stone-600'
                : 'bg-[#1E110F] border-[#3E221E] text-[#D4B2AD]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#E05A47] animate-pulse" />
            <span>Cloud F.A.S.E</span>
          </div>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notificaciones"
            className={`relative p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                : 'bg-[#1E110F] border-[#3E221E] text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E05A47]" />
            )}
          </button>

          {/* Login / Registro Button */}
          <button
            type="button"
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              isLight
                ? 'bg-white hover:bg-stone-50 border-[#C84835]/30 text-[#C84835] hover:border-[#C84835]'
                : 'bg-[#1E110F] hover:bg-[#2A1714] border-[#E05A47]/40 text-[#FF6B4A] hover:border-[#E05A47]'
            }`}
            title="Gestión de Login, Registro y Cuentas de Socios"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Login / Registro</span>
            <span className="sm:hidden">Acceso</span>
          </button>

          {/* User Profile Pill */}
          {currentUser && (
            <button
              type="button"
              onClick={onOpenAuth}
              className={`flex items-center gap-2 p-1 sm:pr-2.5 rounded-xl border transition-colors cursor-pointer group text-left ${
                isLight
                  ? 'bg-stone-50 border-stone-200 hover:border-[#C84835]/50'
                  : 'bg-[#1E110F] border-[#3E221E] hover:border-[#E05A47]/50'
              }`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className={`w-7 h-7 rounded-lg object-cover border ${
                  isLight ? 'border-stone-200' : 'border-[#3E221E]'
                }`}
                referrerPolicy="no-referrer"
              />
              <div className="hidden xl:flex flex-col">
                <span className={`text-xs font-semibold leading-tight ${
                  isLight ? 'text-stone-900 group-hover:text-[#C84835]' : 'text-white group-hover:text-[#FF6B4A]'
                } transition-colors`}>
                  {currentUser.name}
                </span>
                <span className={`text-[10px] font-mono leading-tight ${
                  isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                }`}>
                  {currentUser.role || 'Socio'}
                </span>
              </div>
            </button>
          )}

        </div>
      </div>

      {/* Tier 2: Directly Visible Menus Bar (No clipping, completely visible on screen) */}
      <nav
        aria-label="Menús de módulos principales"
        className={`px-3 sm:px-6 py-1.5 overflow-x-auto scrollbar-thin transition-colors ${
          isLight ? 'bg-stone-50/90 border-t border-stone-200/70' : 'bg-[#140B0A]/95 border-t border-[#3E221E]/60'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-max py-0.5">
          {directNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateSection(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
                  isActive
                    ? isLight
                      ? 'bg-[#C84835] text-white font-semibold shadow-xs'
                      : 'bg-[#E05A47] text-white font-semibold shadow-sm ring-1 ring-[#FF6B4A]/40'
                    : isLight
                      ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/70 border border-transparent'
                      : 'text-[#D4B2AD] hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-white' : isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                }`} />
                <span>{item.label}</span>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md leading-none ${
                      isActive
                        ? 'bg-white/25 text-white font-bold'
                        : isLight
                          ? 'bg-stone-200 text-stone-700'
                          : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
