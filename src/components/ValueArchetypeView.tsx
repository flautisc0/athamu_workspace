import React, { useState } from 'react';
import { Project, ArchetypeType, ValueArchetype } from '../types/project';
import { 
  Workflow, 
  RotateCcw, 
  Share2, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Layers, 
  Target, 
  MapPin, 
  BookOpen, 
  Repeat, 
  Users,
  Compass
} from 'lucide-react';

interface ValueArchetypeViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const ValueArchetypeView: React.FC<ValueArchetypeViewProps> = ({
  project,
  onUpdateProject
}) => {
  const [newAxis, setNewAxis] = useState('');
  const [newVenue, setNewVenue] = useState('');

  const archetypesConfig: Record<ArchetypeType, {
    name: string;
    tagline: string;
    icon: any;
    description: string;
    focus: string;
  }> = {
    cadena_lineal: {
      name: 'Cadena de Valor Lineal',
      tagline: 'Creación → Producción → Exhibición → Mediación',
      icon: ArrowRight,
      description: 'Modelo secuencial centrado en la excelencia del producto escénico o musical final. Cada fase agrega valor acumulativo hasta la entrega a las audiencias en sala.',
      focus: 'Ideal para estrenos de gran formato, festivales puntuales con fecha fija y obras con alto estándar técnico de sala.'
    },
    ciclo_circular: {
      name: 'Ciclo Circular & Memoria',
      tagline: 'Reutilización Escénica · Archivo Vivo · Itinerancia Regional',
      icon: RotateCcw,
      description: 'Modelo sostenible que recircula recursos materiales, patrimoniales y humanos. Amortiza ensayos mediante itinerancia interregional (Santiago ↔ Rancagua) y preserva la memoria en archivos vivos.',
      focus: 'Ideal para obras teatrales y dancísticas con diseño modular, dramaturgias territoriales y producciones con perspectiva ecológica.'
    },
    red_ecosistema: {
      name: 'Red & Ecosistema Cultural',
      tagline: 'Plataforma Colaborativa · Descentralización · Creación Comunitaria',
      icon: Share2,
      description: 'El proyecto funciona como un nodo catalizador que conecta artistas, técnicos locales, espacios vecinales, emprendedores y audiencias en una red viva de valor compartido.',
      focus: 'Ideal para festivales autogestionados, residencias barriales, programas de mediación escolar y fomento de la escena musical del Valle Central.'
    }
  };

  const handleSelectArchetype = (type: ArchetypeType) => {
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        type,
        description: archetypesConfig[type].description
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleToggleCircularProp = (prop: 'digitalArchive' | 'regionalTouring' | 'repertoryRevival') => {
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        circularElements: {
          ...project.valueArchetype.circularElements,
          [prop]: !project.valueArchetype.circularElements[prop]
        }
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleSceneryReuseChange = (pct: number) => {
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        circularElements: {
          ...project.valueArchetype.circularElements,
          sceneryReusePct: Math.max(0, Math.min(100, pct))
        }
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddAxis = () => {
    if (!newAxis.trim()) return;
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        strategicAxes: [...project.valueArchetype.strategicAxes, newAxis.trim()]
      },
      updatedAt: new Date().toISOString()
    });
    setNewAxis('');
  };

  const handleDeleteAxis = (index: number) => {
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        strategicAxes: project.valueArchetype.strategicAxes.filter((_, i) => i !== index)
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddVenue = () => {
    if (!newVenue.trim()) return;
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        ecosystemElements: {
          ...project.valueArchetype.ecosystemElements,
          venuesInvolved: [...project.valueArchetype.ecosystemElements.venuesInvolved, newVenue.trim()]
        }
      },
      updatedAt: new Date().toISOString()
    });
    setNewVenue('');
  };

  const handleDeleteVenue = (index: number) => {
    onUpdateProject({
      ...project,
      valueArchetype: {
        ...project.valueArchetype,
        ecosystemElements: {
          ...project.valueArchetype.ecosystemElements,
          venuesInvolved: project.valueArchetype.ecosystemElements.venuesInvolved.filter((_, i) => i !== index)
        }
      },
      updatedAt: new Date().toISOString()
    });
  };

  const currentType = project.valueArchetype.type;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner: Meaning of the Archetype */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            Dimensión 3 del Arquitecto
          </span>
          <h2 className="text-xl font-bold font-display text-stone-900 dark:text-stone-100 mt-2 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-amber-600" />
            Arquetipo de Valor: El "Cómo" se Genera Impacto Cultural
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-3xl mt-1">
            En el Ecosistema ATHA distinguimos <strong>qué hace</strong> el proyecto (obra de teatro, festival, concierto) de <strong>cómo genera valor</strong> duradero para la comunidad, los artistas, la sostenibilidad territorial y los coproductores.
          </p>
        </div>

        {/* 3 Archetype Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {(['cadena_lineal', 'ciclo_circular', 'red_ecosistema'] as ArchetypeType[]).map((type) => {
            const config = archetypesConfig[type];
            const Icon = config.icon;
            const isSelected = currentType === type;

            return (
              <button
                key={type}
                onClick={() => handleSelectArchetype(type)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/80 hover:border-amber-400'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-600 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {config.name}
                    </h4>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium block">
                      {config.tagline}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
                  {config.description}
                </p>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 bg-white/60 dark:bg-stone-900/60 p-2 rounded-lg border border-stone-200/50 dark:border-stone-700/50">
                  📌 {config.focus}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Visual Schema of Current Archetype */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-6">
        
        {/* ARCHETYPE 1 DIAGRAM: CADENA LINEAL */}
        {currentType === 'cadena_lineal' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-amber-600" />
              Flujo de la Cadena de Valor Lineal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <div className="w-8 h-8 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold mb-2">
                  1
                </div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Investigación & Creación</h4>
                <p className="text-[11px] text-stone-500 mt-1">Dramaturgia, composición, partituras, ensayos preliminares.</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <div className="w-8 h-8 mx-auto rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold mb-2">
                  2
                </div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Producción Técnica</h4>
                <p className="text-[11px] text-stone-500 mt-1">Construcción escenográfica, riders de sonido, vestuario y luces.</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <div className="w-8 h-8 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold mb-2">
                  3
                </div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Exhibición & Temporada</h4>
                <p className="text-[11px] text-stone-500 mt-1">Estreno oficial, taquilla, cobertura de prensa y funciones en sala.</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <div className="w-8 h-8 mx-auto rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold mb-2">
                  4
                </div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Mediación & Cierre</h4>
                <p className="text-[11px] text-stone-500 mt-1">Conversatorios con públicos, informes de impacto y rendición final.</p>
              </div>
            </div>
          </div>
        )}

        {/* ARCHETYPE 2 DIAGRAM: CICLO CIRCULAR */}
        {currentType === 'ciclo_circular' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Mecanismos de Sostenibilidad Circular y Retorno
            </h3>

            {/* Circular Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Scenery Reuse Slider */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-amber-600" />
                    Tasa de Reutilización Escenográfica & Materiales
                  </span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                    {project.valueArchetype.circularElements.sceneryReusePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={project.valueArchetype.circularElements.sceneryReusePct}
                  onChange={(e) => handleSceneryReuseChange(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <p className="text-[11px] text-stone-500">
                  Porcentaje de madera, fierro, luminarias o vestuario diseñado para ser reacondicionado en futuros montajes de ATHA o itinerancias regionales.
                </p>
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2.5">
                <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-2">
                  Ejes Circulares Activos en este Proyecto:
                </div>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 cursor-pointer text-xs">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Archivo Vivo Digital (Depósito Patrimonial CEDOC)
                  </span>
                  <input
                    type="checkbox"
                    checked={project.valueArchetype.circularElements.digitalArchive}
                    onChange={() => handleToggleCircularProp('digitalArchive')}
                    className="rounded text-amber-600"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 cursor-pointer text-xs">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Itinerancia Interregional (Santiago ↔ Rancagua / O'Higgins)
                  </span>
                  <input
                    type="checkbox"
                    checked={project.valueArchetype.circularElements.regionalTouring}
                    onChange={() => handleToggleCircularProp('regionalTouring')}
                    className="rounded text-amber-600"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 cursor-pointer text-xs">
                  <span className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-amber-500" />
                    Repertorio Vivo (Segunda y Tercera Temporada Planificada)
                  </span>
                  <input
                    type="checkbox"
                    checked={project.valueArchetype.circularElements.repertoryRevival}
                    onChange={() => handleToggleCircularProp('repertoryRevival')}
                    className="rounded text-amber-600"
                  />
                </label>
              </div>

            </div>
          </div>
        )}

        {/* ARCHETYPE 3 DIAGRAM: RED ECOSISTEMA */}
        {currentType === 'red_ecosistema' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-amber-600" />
              Articulación del Ecosistema Territorial (Santiago - Rancagua)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Venues involved */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Espacios Culturales & Salas Articuladas ({project.valueArchetype.ecosystemElements.venuesInvolved.length})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {project.valueArchetype.ecosystemElements.venuesInvolved.map((venue, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-900 text-xs border border-stone-200 dark:border-stone-700"
                    >
                      <span className="font-medium text-stone-900 dark:text-stone-100">{venue}</span>
                      <button
                        onClick={() => handleDeleteVenue(idx)}
                        className="text-stone-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nuevo espacio (ej. Centro Cultural Baquedano)..."
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    className="flex-1 text-xs p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700"
                  />
                  <button
                    onClick={handleAddVenue}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Territory & Audience impact */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Alianzas Comunitarias & Capital Social
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Impacto Territorial:</span>
                  <p className="text-stone-800 dark:text-stone-200">
                    {project.valueArchetype.ecosystemElements.territoryImpact}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Audiencias Objetivo Priorizadas:</span>
                  <p className="text-stone-800 dark:text-stone-200">
                    {project.valueArchetype.ecosystemElements.audiencesTarget}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Strategic Axes List (Shared for all Archetypes) */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-600" />
              Ejes Estratégicos del Proyecto
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {project.valueArchetype.strategicAxes.map((axis, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-stone-800 dark:text-stone-200 font-medium">{axis}</span>
                </div>
                <button
                  onClick={() => handleDeleteAxis(idx)}
                  className="text-stone-400 hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Axis input */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Añadir nuevo eje estratégico (ej. Formación de técnicos locales)..."
              value={newAxis}
              onChange={(e) => setNewAxis(e.target.value)}
              className="flex-1 text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            />
            <button
              onClick={handleAddAxis}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Añadir Eje
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
