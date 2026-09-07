import React from 'react';
import { Obra } from '../types';
import { formatCLP } from '../utils/storage';
import { X, Download, Printer, Award, Calendar, Users, Sliders, DollarSign, Clock, Layers } from 'lucide-react';

interface DossierModalProps {
  obra: Obra;
  onClose: () => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({ obra, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#161920] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 my-auto">
        
        {/* Modal Top Bar */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12141a]">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md bg-[#6ee7b7]/15 text-[#6ee7b7] border border-[#6ee7b7]/30">
              Dossier Oficial ATHA
            </span>
            <span className="text-xs text-slate-400">PDF / Formato Impresión A4</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-lg transition-colors shadow-sm cursor-pointer"
              title="Imprimir o Guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div className="p-6 md:p-10 overflow-y-auto space-y-8 bg-[#161920]">
          
          {/* Header Section */}
          <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#fbbf24] text-xs uppercase tracking-widest font-mono font-medium mb-1">
                <span>ATHA Producciones</span>
                <span>•</span>
                <span>Chile</span>
                <span>•</span>
                <span>Catálogo Escénico</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-display">
                {obra.title}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {obra.discipline} — {obra.format} | Duración: {obra.duration} | {obra.targetAudience}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                obra.status === 'En gira' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                obra.status === 'Estreno' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                obra.status === 'En repertorio' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {obra.status}
              </span>
              <p className="text-xs text-slate-400 mt-1">Estreno: {obra.premiereDate}</p>
            </div>
          </div>

          {/* Hero Banner & Synopsis */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 rounded-xl overflow-hidden border border-white/10 aspect-[4/3] md:aspect-auto">
              <img
                src={obra.image}
                alt={obra.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="md:col-span-7 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sinopsis de la Obra</h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {obra.synopsis}
                </p>
              </div>

              {obra.dossierHighlights && obra.dossierHighlights.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#fbbf24] uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>Hitos & Reconocimientos</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {obra.dossierHighlights.map((hl, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#6ee7b7]">•</span>
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Ficha Artística y Técnica en 2 Columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
            {/* Ficha Artística */}
            <div className="p-5 rounded-xl bg-[#12141a] border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#6ee7b7]">
                <Users className="w-4 h-4" />
                <span>Equipo Artístico & Elenco</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Dirección General:</span>
                  <span className="text-white font-medium">{obra.castTeam.direction}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Música & Diseño Sonoro:</span>
                  <span className="text-white font-medium">{obra.castTeam.music}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Técnica & Iluminación:</span>
                  <span className="text-white font-medium">{obra.castTeam.technical}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Elenco / Intérpretes:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {obra.castTeam.cast.map((actor, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-slate-200 border border-white/5">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Rider & Especificaciones Técnicas */}
            <div className="p-5 rounded-xl bg-[#12141a] border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#38bdf8]">
                <Sliders className="w-4 h-4" />
                <span>Requerimientos Técnicos Básicos</span>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/5">
                  <div>
                    <span className="text-slate-400 block">Dimensiones mínimas:</span>
                    <span className="text-white font-medium">{obra.technicalRider.minStageWidthMeters}m ancho x {obra.technicalRider.minStageDepthMeters}m fondo</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tiempo de montaje:</span>
                    <span className="text-white font-medium">{obra.technicalRider.loadInHours} horas previas</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Iluminación:</span>
                  <p className="text-slate-300 text-xs mt-0.5">{obra.technicalRider.lighting}</p>
                </div>
                <div>
                  <span className="text-slate-400 block">Audio & Microfonía:</span>
                  <p className="text-slate-300 text-xs mt-0.5">{obra.technicalRider.sound}</p>
                </div>
                <div>
                  <span className="text-slate-400 block">Equipo en gira:</span>
                  <span className="text-white font-medium">{obra.technicalRider.crewRequired} técnicos + elenco</span>
                </div>
              </div>
            </div>
          </div>

          {/* Economía y Condiciones de Contratación */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-[#6ee7b7]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#fbbf24]">
                <DollarSign className="w-4 h-4" />
                <span>Condiciones Económicas de Contratación (Referencial)</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Caché base para función única en Región Metropolitana. Para giras regionales o temporadas se calculan viáticos, traslados y convenios bajo Ley de Donaciones Culturales o FONDART.
              </p>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="text-xs text-slate-400 block">Caché función única:</span>
              <span className="text-xl font-bold text-[#6ee7b7] font-mono">
                {formatCLP(obra.economics.feeCLP)} + IVA
              </span>
            </div>
          </div>

          {/* Footer Contacto ATHA */}
          <div className="pt-6 border-t border-white/10 text-center text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">ATHA PRODUCCIONES — Santiago & Valparaíso, Chile</p>
            <p>Contacto de Programación y Distribución: Francisco Pérez | contacto@athaproducciones.cl | +56 9 8452 1190</p>
            <p className="text-slate-400 text-[11px]">Documento generado automáticamente desde la Intranet de ATHA Producciones.</p>
          </div>

        </div>
      </div>
    </div>
  );
};
