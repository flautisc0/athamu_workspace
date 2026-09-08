import React from 'react';
import {
  ExternalLink,
  CalendarRange,
  Ticket,
  Search,
  DraftingCompass,
  Wrench,
  ArrowUpRight
} from 'lucide-react';

// URLs canónicas de las herramientas del ecosistema ATHA (Capa 2 - accesibles desde CRM)
const HERRAMIENTAS = [
  {
    id: 'planner',
    name: 'ATHA Planner',
    description: 'Control de Gestión: ruta crítica, disponibilidad de artistas y matriz de cruce para la planificación de ensayos.',
    url: 'https://athamu-producciones-o4pqpocl5q-uc.a.run.app/planner',
    icon: CalendarRange,
    tag: 'Implementada',
    accent: '#6ee7b7',
    status: 'EN LÍNEA',
    statusDot: 'bg-emerald-400'
  },
  {
    id: 'ticketer',
    name: 'Ticketer ATHAP',
    description: 'Sistema integral de gestión de tickets digitales: emisión, Wallet digital con QR y control de acceso.',
    url: 'https://ticketerapp-o4pqpocl5q-uc.a.run.app',
    icon: Ticket,
    tag: 'Implementada',
    accent: '#fbbf24',
    status: 'EN LÍNEA',
    statusDot: 'bg-emerald-400'
  },
  {
    id: 'buscador',
    name: 'Buscador de Fondos',
    description: 'Convocatorias y fondos culturales en Chile: Fondart, CORFO, DIRAC, ANID, ProChile, Start-up Chile y más.',
    url: 'https://buscardor-de-fondos-o4pqpocl5q-uc.a.run.app',
    icon: Search,
    tag: 'Implementada',
    accent: '#38bdf8',
    status: 'EN LÍNEA',
    statusDot: 'bg-emerald-400'
  },
  {
    id: 'arquitecto',
    name: 'Arquitecto de Proyectos',
    description: 'Próxima herramienta del ecosistema. En desarrollo.',
    url: null,
    icon: DraftingCompass,
    tag: 'Próximamente',
    accent: '#a78bfa',
    status: 'EN DESARROLLO',
    statusDot: 'bg-amber-400'
  }
];

export const EcosistemaSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-[#6ee7b7] mb-1">
            <Wrench className="w-3.5 h-3.5" />
            <span>Ecosistema ATHA</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-display tracking-tight">
            Herramientas del Ecosistema
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Aplicaciones de la plataforma ATHA accesibles desde la intranet. La app móvil actúa como cliente de estas herramientas.
          </p>
        </div>
      </div>

      {/* Grid de herramientas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {HERRAMIENTAS.map((tool) => {
          const Icon = tool.icon;
          const card = (
            <>
              <div
                className="p-5 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-4 group"
                style={{ borderColor: `color-mix(in srgb, ${tool.accent} 25%, transparent)` }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${tool.accent} 15%, transparent)`, color: tool.accent }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wide bg-white/5 border border-white/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${tool.statusDot} animate-pulse`} />
                    {tool.status}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white font-display tracking-tight">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide"
                    style={{ backgroundColor: `color-mix(in srgb, ${tool.accent} 15%, transparent)`, color: tool.accent }}
                  >
                    {tool.tag}
                  </span>
                  {tool.url ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6ee7b7] group-hover:gap-2.5 transition-all">
                      Abrir herramienta
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />
                      En desarrollo
                    </span>
                  )}
                </div>
              </div>
            </>
          );

          return tool.url ? (
            <a
              key={tool.id}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block focus:outline-none focus:ring-2 focus:ring-[#6ee7b7]/40 rounded-2xl"
            >
              {card}
            </a>
          ) : (
            <div key={tool.id} className="block cursor-not-allowed opacity-80">
              {card}
            </div>
          );
        })}
      </div>

      {/* Nota de arquitectura */}
      <div className="p-4 rounded-2xl bg-[#12141a] border border-white/10 text-xs text-slate-400 space-y-1.5">
        <div className="font-semibold text-slate-300">Arquitectura en 3 capas</div>
        <div>
          <span className="text-[#6ee7b7] font-mono">Capa 2 (Intranet):</span> estas herramientas son el núcleo de gestión — administradas desde el CRM.
        </div>
        <div>
          <span className="text-[#38bdf8] font-mono">Capa 3 (App móvil):</span> cliente del CRM; accede a estas mismas herramientas.
        </div>
      </div>
    </div>
  );
};

export default EcosistemaSection;