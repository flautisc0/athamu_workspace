import React, { useState } from 'react';
import { AboutCompanyInfo, UserSession } from '../../types';
import { AcercaSection } from './AcercaSection';
import {
  Database,
  FileCode,
  Shield,
  Palette,
  Server,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Download,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';

interface AdminSectionProps {
  aboutInfo: AboutCompanyInfo;
  onSaveAboutInfo: (info: AboutCompanyInfo) => void;
  onOpenSqlHub: () => void;
  currentUser: UserSession;
  onOpenAuth: () => void;
  theme?: 'terracota' | 'dia';
  counts?: {
    obras: number;
    leads: number;
    venues: number;
    events: number;
    finances: number;
    inventory: number;
  };
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  aboutInfo,
  onSaveAboutInfo,
  onOpenSqlHub,
  currentUser,
  onOpenAuth,
  theme = 'dia',
  counts = { obras: 0, leads: 0, venues: 0, events: 0, finances: 0, inventory: 0 }
}) => {
  const isLight = theme === 'dia';
  const [activeTab, setActiveTab] = useState<'sql' | 'identidad' | 'servidor'>('sql');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border transition-all ${
        isLight
          ? 'bg-white border-[#E5DDD8] text-stone-900 shadow-xs'
          : 'bg-[#1C110F] border-[#3E221E] text-white shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#E05A47]">
              <Shield className="w-3.5 h-3.5" />
              <span>Consola de Administración del Sitio</span>
              <span>•</span>
              <span>F.A.S.E Backoffice</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-display mt-1 ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}>
              Administración & Infraestructura F.A.S.E
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
              isLight ? 'text-stone-600' : 'text-slate-300'
            }`}>
              Gestión de base de datos relacional Cloud SQL, entorno de archivos PHP, manual corporativo de Identidad F.A.S.E y controles de seguridad.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
            }`}>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-[#E05A47]"
              />
              <div>
                <span className="font-bold block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-stone-400 block font-mono">Sesión Administrador</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-stone-100 dark:border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeTab === 'sql'
                ? 'bg-[#E05A47] text-white border-[#E05A47] shadow-xs'
                : isLight
                ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                : 'bg-[#150D0C] border-[#3E221E] text-slate-300 hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Base de Datos SQL & Archivos PHP</span>
          </button>

          <button
            onClick={() => setActiveTab('identidad')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeTab === 'identidad'
                ? 'bg-[#E05A47] text-white border-[#E05A47] shadow-xs'
                : isLight
                ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                : 'bg-[#150D0C] border-[#3E221E] text-slate-300 hover:bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Identidad F.A.S.E (Manual Corporativo)</span>
          </button>

          <button
            onClick={() => setActiveTab('servidor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeTab === 'servidor'
                ? 'bg-[#E05A47] text-white border-[#E05A47] shadow-xs'
                : isLight
                ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                : 'bg-[#150D0C] border-[#3E221E] text-slate-300 hover:bg-white/5'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Servidor & Respaldos</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Base de Datos & SQL */}
      {activeTab === 'sql' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SQL Hub Launch Card */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#1C110F] border-[#3E221E] shadow-md'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                    Gestor Cloud SQL (PostgreSQL)
                  </h3>
                  <p className="text-xs text-stone-500">Base de datos relacional dedicada para el CRM y catálogo</p>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                Visualiza, inserta y modifica registros en tiempo real en las tablas estructuradas del sistema escénico. Incluye consola de comandos SQL y soporte de exportación en CSV, JSON y SQL dump.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenSqlHub}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>Abrir Gestor SQL & Tablas en Vivo</span>
                </button>
              </div>
            </div>

            {/* PHP Web Studio Card */}
            <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
              isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#1C110F] border-[#3E221E] shadow-md'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                    Entorno PHP Web Studio (/php)
                  </h3>
                  <p className="text-xs text-stone-500">Servidor y scripts de automatización backend</p>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
                Entorno web independiente alojado bajo la ruta <code className="font-mono text-sky-500 font-semibold">/php</code> para procesar endpoints de importación masiva, scripts cron y conectividad con servicios externos.
              </p>

              <div className="pt-2">
                <a
                  href="/php"
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isLight
                      ? 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  <span>Abrir Web Studio /php en Nueva Pestaña</span>
                </a>
              </div>
            </div>

          </div>

          {/* Database Tables Summary */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#1C110F] border-[#3E221E] shadow-md'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <Layers className="w-4 h-4 text-[#E05A47]" />
              <span>Esquema de Tablas Relacionales en PostgreSQL</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className={`p-3 rounded-xl border text-center ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Tabla</span>
                <span className="text-xs font-bold font-mono text-[#E05A47] block mt-0.5">obras</span>
                <span className="text-[11px] text-stone-500 block mt-1">{counts.obras} filas</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Tabla</span>
                <span className="text-xs font-bold font-mono text-amber-500 block mt-0.5">leads_crm</span>
                <span className="text-[11px] text-stone-500 block mt-1">{counts.leads} salas</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Tabla</span>
                <span className="text-xs font-bold font-mono text-sky-500 block mt-0.5">venues</span>
                <span className="text-[11px] text-stone-500 block mt-1">{counts.venues} teatros</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Tabla</span>
                <span className="text-xs font-bold font-mono text-purple-500 block mt-0.5">events</span>
                <span className="text-[11px] text-stone-500 block mt-1">{counts.events} funciones</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Tabla</span>
                <span className="text-xs font-bold font-mono text-emerald-500 block mt-0.5">finances</span>
                <span className="text-[11px] text-stone-500 block mt-1">{counts.finances} balances</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Tabla</span>
                <span className="text-xs font-bold font-mono text-cyan-500 block mt-0.5">inventory</span>
                <span className="text-[11px] text-stone-500 block mt-1">{counts.inventory} equipos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Identidad F.A.S.E (Moved from Public Page) */}
      {activeTab === 'identidad' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${
            isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
          }`}>
            <p className="text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Sección de Uso Privado:</strong> La Identidad Corporativa F.A.S.E, códigos de color y manual de marca ahora se gestionan internamente en este panel de administración y no aparecen en la navegación pública.
              </span>
            </p>
          </div>

          <AcercaSection info={aboutInfo} onSaveInfo={onSaveAboutInfo} />
        </div>
      )}

      {/* Tab 3: Servidor & Respaldos */}
      {activeTab === 'servidor' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-[#E5DDD8] shadow-xs' : 'bg-[#1C110F] border-[#3E221E] shadow-md'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-stone-900' : 'text-white'}`}>
              <Server className="w-4 h-4 text-emerald-500" />
              <span>Estado de Servicios & Sincronización</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className={`p-4 rounded-xl border space-y-1.5 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Cloud SQL PostgreSQL</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    OPERATIVO
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Host: 127.0.0.1:5432 / DB: defaultdb</p>
              </div>

              <div className={`p-4 rounded-xl border space-y-1.5 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Autenticación Corporativa</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    ACTIVO
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Google Workspace & Apple ID para socios</p>
              </div>

              <div className={`p-4 rounded-xl border space-y-1.5 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#150D0C] border-[#3E221E]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Persistencia Local</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    SINCRONIZADO
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Cache local cifrado en navegador</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
