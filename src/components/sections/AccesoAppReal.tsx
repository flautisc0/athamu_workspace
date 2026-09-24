/**
 * ACCESO A LA APP REAL · Planner y Arquitecto
 *
 * Estas dos pestañas del CRM NO son funcionalidad propia: son el acceso a las
 * aplicaciones REALES (repos GitHub `planner-frontend` y `artha-arquitecto`).
 * La sección muestra una tarjeta de acceso; la app real es la fuente de verdad.
 */
import React from 'react';
import { ExternalLink, Layers, CalendarDays } from 'lucide-react';
import { leerSesionCrm } from '../../utils/sesionEcosistema';

const HUB = 'https://atha-crm-web-frontend-897089213264.us-central1.run.app';
const APPS_REALES = 'https://github.com/flautisc0/crm-atha';

interface Props {
  /** 'planner' | 'arquitecto' */
  destino: 'planner' | 'arquitecto';
  theme?: any;
}

const DATOS: Record<string, { nombre: string; descripcion: string; icono: any; puerto: string }> = {
  planner: {
    nombre: 'Planner de Giras',
    descripcion: 'Disponibilidad de elencos, planificación de fechas y tour book.',
    icono: CalendarDays,
    puerto: 'https://planner-frontend-897089213264.us-central1.run.app',
  },
  arquitecto: {
    nombre: 'Arquitecto de Proyectos',
    descripcion: 'Estructura, presupuesto y armado de proyectos escénicos.',
    icono: Layers,
    puerto: 'https://artha-arquitecto-897089213264.us-central1.run.app',
  },
};

export const AccesoAppReal: React.FC<Props> = ({ destino }) => {
  const d = DATOS[destino];
  const Icono = d.icono;
  const sesion = leerSesionCrm() as any;
  const nombre = sesion?.name || sesion?.email || '';

  const abrir = () => {
    // Por el PUENTE del CRM: viaja con la sesión puesta
    window.open(`${HUB}/puente?destino=${destino}`, '_blank');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[var(--surface-card,#161920)] p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-terracota,#E05A47)]/15">
          <Icono className="h-7 w-7 text-[var(--accent-terracota,#E05A47)]" />
        </div>

        <h2 className="text-xl font-bold">{d.nombre}</h2>
        <p className="mt-2 text-sm opacity-70">{d.descripcion}</p>

        <p className="mt-4 text-xs opacity-50">
          Es una <strong>aplicación aparte</strong> del ecosistema (su propio repo). Acá se entra
          con tu sesión ya puesta{nombre ? `, ${nombre}` : ''}.
        </p>

        <button
          onClick={abrir}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-terracota,#E05A47)] px-5 py-3 text-sm font-bold text-white transition-transform active:scale-95"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir {d.nombre}
        </button>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-4 text-[11px] opacity-45">
          <a href={d.puerto} target="_blank" rel="noreferrer" className="underline">
            acceso directo
          </a>
          <span>·</span>
          <a href={APPS_REALES} target="_blank" rel="noreferrer" className="underline">
            código en GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
