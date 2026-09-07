import React, { useState } from 'react';
import { TechnicalRider } from '../../types';
import {
  FileSpreadsheet,
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  Sliders,
  ShieldAlert
} from 'lucide-react';

interface RidersSectionProps {
  riders: TechnicalRider[];
}

export const RidersSection: React.FC<RidersSectionProps> = ({ riders }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (rider: TechnicalRider) => {
    const text = `
=== ATHA PRODUCCIONES - RIDER TÉCNICO OFICIAL ===
${rider.title.toUpperCase()} (${rider.category})
Versión: ${rider.version} | Archivo: ${rider.pdfFileTitle}
Dirección Técnica: ${rider.technicalDirector}

DESCRIPCIÓN:
${rider.description}

ESPECIFICACIONES TÉCNICAS CLAVE:
${rider.keySpecs.map(e => `• ${e}`).join('\n')}

Contacto Técnico ATHA: contacto@athaproducciones.cl | +56 9 8456 1120
==================================================
`;
    navigator.clipboard.writeText(text);
    setCopiedId(rider.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#a78bfa] uppercase tracking-wider">
            <span>12. Riders Estándar</span>
            <span>•</span>
            <span>Plantillas Técnicas de Gira</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Fichas Técnicas & Protocolos Homologados
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Requerimientos técnicos estándar de ATHA listos para anexar a contratos con teatros, festivales y municipalidades de todo Chile.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-xl border border-white/10 transition-all cursor-pointer whitespace-nowrap"
        >
          <Printer className="w-4 h-4 text-slate-400" />
          <span>Imprimir Riders</span>
        </button>
      </div>

      {/* Grid of Riders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {riders.map((rider) => (
          <div
            key={rider.id}
            className="p-6 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-lg"
          >
            <div className="space-y-4">
              
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30 font-bold">
                    {rider.category}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-1.5">
                    {rider.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    Versión {rider.version} • {rider.pdfFileTitle}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {rider.description}
              </p>

              {/* Key Specs list */}
              <div className="p-3.5 rounded-xl bg-[#12141a] border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-[#6ee7b7] block font-mono">
                  Especificaciones Técnicas Clave:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {rider.keySpecs.map((spec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Responsable técnico */}
              <div className="pt-1 text-xs text-slate-400 flex items-center justify-between">
                <span>Responsable de Ficha:</span>
                <span className="text-white font-mono font-medium">{rider.technicalDirector}</span>
              </div>

            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">ATHA Technical Dept.</span>

              <button
                onClick={() => handleCopy(rider)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#a78bfa]/15 hover:bg-[#a78bfa]/25 text-[#a78bfa] border border-[#a78bfa]/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {copiedId === rider.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Ficha de Rider</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
