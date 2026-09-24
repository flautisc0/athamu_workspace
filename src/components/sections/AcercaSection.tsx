import React, { useState } from 'react';
import { AboutCompanyInfo } from '../../types';
import { FaseLogo } from '../FaseLogo';
import {
  Sparkles,
  Award,
  Globe,
  Mail,
  MapPin,
  HeartHandshake,
  CheckCircle2,
  Edit2,
  Save,
  X,
  FileText,
  Phone,
  Building2,
  Calendar,
  Download,
  Copy,
  Check,
  Palette,
  Layers,
  Component,
  ExternalLink
} from 'lucide-react';

interface AcercaSectionProps {
  info: AboutCompanyInfo;
  onSaveInfo: (newInfo: AboutCompanyInfo) => void;
}

export const AcercaSection: React.FC<AcercaSectionProps> = ({ info, onSaveInfo }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<AboutCompanyInfo>(info);
  const [valuesInput, setValuesInput] = useState<string>(info.values ? info.values.join('\n') : '');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedSvg, setCopiedSvg] = useState<string | null>(null);
  const [activeBrandTab, setActiveBrandTab] = useState<'kit' | 'institucional'>('kit');

  const handleOpenEdit = () => {
    setFormData({ ...info });
    setValuesInput(info.values ? info.values.join('\n') : '');
    setIsEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValues = valuesInput
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean);

    onSaveInfo({
      ...formData,
      values: parsedValues.length > 0 ? parsedValues : info.values
    });
    setIsEditModalOpen(false);
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleCopySvg = (name: string, svgContent: string) => {
    navigator.clipboard.writeText(svgContent);
    setCopiedSvg(name);
    setTimeout(() => setCopiedSvg(null), 2000);
  };

  const downloadSvgFile = (filename: string, path: string) => {
    const link = document.createElement('a');
    link.href = path;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const brandColors = [
    { name: 'Terracota F.A.S.E', hex: 'var(--accent-terracota)', role: 'Color primario de marca, acentos de acción y energía escénica' },
    { name: 'Coral Acento', hex: 'var(--accent-glow)', role: 'Hover, gradientes luminosos e indicadores activos' },
    { name: 'Azul Escénico Profundo', hex: '#1E293B', role: 'Superficies técnicas, contraste y soporte escenográfico' },
    { name: 'Azul Eléctrico / Cyan', hex: '#38BDF8', role: 'Riders técnicos, audio, I+D y conectividad digital' },
    { name: 'Negro Carbón / Caja Negra', hex: '#0F1218', role: 'Fondo de escenario, contraste lumínico teatral' },
    { name: 'Ámbar Halógeno', hex: '#F59E0B', role: 'Focos halógenos, hitos de calendario y distinciones' },
    { name: 'Blanco Puro', hex: '#FFFFFF', role: 'Tipografía de alto impacto y legibilidad' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12151C] via-[#1A1F2B] to-[#15121A] border border-[var(--accent-terracota)]/30 p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--accent-terracota)]/15 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent-glow)] uppercase tracking-widest">
            <span>13. Identidad & Recursos Gráficos</span>
            <span>•</span>
            <span>F.A.S.E Producción</span>
          </div>

          <div className="flex items-center gap-4">
            <FaseLogo variant="symbol" size="lg" theme="terracota" />
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight font-display">
                {info.name}
              </h1>
              <p className="text-xs text-[var(--accent-glow)] font-mono mt-0.5">
                Plataforma de Gestión Escénica & Producción Artística
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {info.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[var(--accent-glow)]" />
              {info.legalName}
            </span>
            <span>•</span>
            <span>RUT: {info.rut}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#fbbf24]" />
              {info.founded}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] text-white font-semibold text-xs rounded-xl shadow-lg shadow-[var(--accent-terracota)]/20 transition-all cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar Datos de F.A.S.E</span>
          </button>
        </div>
      </div>

      {/* Navigation Switch between Kit de Marca & Visión Institucional */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveBrandTab('kit')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeBrandTab === 'kit'
              ? 'bg-[var(--accent-terracota)] text-white shadow'
              : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Kit de Recursos Gráficos & Logos</span>
        </button>

        <button
          onClick={() => setActiveBrandTab('institucional')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeBrandTab === 'institucional'
              ? 'bg-[var(--accent-terracota)] text-white shadow'
              : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Misión, Visión & Métricas</span>
        </button>
      </div>

      {activeBrandTab === 'kit' ? (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Logo Showcase Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Component className="w-4 h-4 text-[var(--accent-glow)]" />
                  Variantes Oficiales del Logo F.A.S.E
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recursos vectoriales oficiales para afiches, carpetas de postulación a fondos, dossiers de giras y firmas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Variant 1: Horizontal Full Logo */}
              <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[var(--accent-glow)] uppercase font-semibold">FASE_horizontal</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-[11px]">SVG Vectorial</span>
                </div>

                <div className="py-8 px-6 bg-[#0E1117] rounded-xl flex items-center justify-center border border-white/5 min-h-[140px]">
                  <FaseLogo variant="horizontal" size="lg" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-400">Logotipo + Descriptor oficial</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadSvgFile('fase-horizontal.svg', '/assets/fase/fase-horizontal.svg')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      title="Descargar SVG"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--accent-glow)]" />
                      <span>Descargar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant 2: Symbol / Isotype */}
              <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[var(--accent-glow)] uppercase font-semibold">FASE_simbolo</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-[11px]">Isotipo / Icono</span>
                </div>

                <div className="py-8 px-6 bg-[#0E1117] rounded-xl flex items-center justify-center border border-white/5 min-h-[140px]">
                  <FaseLogo variant="symbol" size="xl" theme="terracota" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-400">Isotipo en trazo continuo F</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadSvgFile('fase-simbolo.svg', '/assets/fase/fase-simbolo.svg')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      title="Descargar SVG"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--accent-glow)]" />
                      <span>Descargar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant 3: Fondo Terracota Badge */}
              <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[var(--accent-glow)] uppercase font-semibold">FASE_fondo_terracota</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-[11px]">Badge de Campaña</span>
                </div>

                <div className="py-6 px-6 bg-gradient-to-br from-[var(--accent-terracota)] to-[var(--accent-terracota)] rounded-xl flex items-center justify-center border border-white/10 min-h-[140px] shadow-lg">
                  <FaseLogo variant="badge" size="md" theme="terracota" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-400">Variante fondo cálido escénico</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyHex('var(--accent-terracota)')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      {copiedColor === 'var(--accent-terracota)' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Copiar Color</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant 4: Fondo Azul Profundo Badge */}
              <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-sky-400 uppercase font-semibold">FASE_fondo_azul</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-[11px]">Badge Técnico</span>
                </div>

                <div className="py-6 px-6 bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-xl flex items-center justify-center border border-sky-500/20 min-h-[140px] shadow-lg">
                  <FaseLogo variant="badge" size="md" theme="azul" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-400">Variante técnica para riders y sonido</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyHex('#1E293B')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      {copiedColor === '#1E293B' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Copiar Color</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Color Palette Grid */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[var(--accent-glow)]" />
                  Paleta Cromática Oficial F.A.S.E
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Haz clic en cualquier muestra para copiar su código HEX al portapapeles.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {brandColors.map((color) => (
                <div
                  key={color.hex}
                  onClick={() => handleCopyHex(color.hex)}
                  className="p-3.5 rounded-xl bg-[#0E1117] border border-white/5 hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg shadow-inner border border-white/20 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block leading-tight">
                        {color.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {color.hex}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    {color.role}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{copiedColor === color.hex ? '¡Copiado!' : 'Click para copiar'}</span>
                    {copiedColor === color.hex ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Phases Methodology Section */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent-glow)]" />
                Arquitectura Metodológica de las 4 Fases
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Origen del nombre F.A.S.E y estructura del flujo de trabajo teatral y dancístico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#0E1117] border border-[var(--accent-terracota)]/30 space-y-2">
                <span className="text-xs font-mono font-bold text-[var(--accent-glow)] uppercase">
                  Fase 1: Formulación & I+D
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dramaturgia, investigación de lenguajes escénicos, postulación a fondos de cultura (Fondart, Iberescena) y conceptualización.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1117] border border-sky-500/30 space-y-2">
                <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                  Fase 2: Articulación & Montaje
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Casting, calendario de ensayos, fichas técnicas, riders de iluminación y sonido, diseño de escenografía y vestuario.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1117] border border-amber-500/30 space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                  Fase 3: Circulación & Giras
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  CRM con programadores, convenios de salas teatrales, giras regionales por Chile, venta de funciones y taquilla.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1117] border border-emerald-500/30 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                  Fase 4: Evaluación & Rendición
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Rendición financiera de fondos públicos, métricas de público, impacto territorial y archivo patrimonial de repertorio.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Numerical Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 text-center">
              <div className="text-2xl font-bold text-[var(--accent-glow)] font-mono">{info.stats.totalObras}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Obras Producidas</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 text-center">
              <div className="text-2xl font-bold text-[#fbbf24] font-mono">{info.stats.funcionesRealizadas}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Funciones en Vivo</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 text-center">
              <div className="text-2xl font-bold text-[#38bdf8] font-mono">{info.stats.espectadoresHistoricos.toLocaleString('es-CL')}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Espectadores</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 text-center">
              <div className="text-2xl font-bold text-[#a78bfa] font-mono">{info.stats.regionesVisitadas}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Regiones de Chile</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-bold text-amber-400 font-mono">{info.stats.premiosNacionales}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Premios y Fondos</div>
            </div>
          </div>

          {/* 2 Pillars: Misión & Visión */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-terracota)]/15 text-[var(--accent-glow)] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Nuestra Misión</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {info.mission}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/15 text-[#fbbf24] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Nuestra Visión</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {info.vision}
              </p>
            </div>
          </div>

          {/* Institutional Values & Principles */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#38bdf8]" />
              <h3 className="text-base font-bold text-white">Valores y Principios Operativos</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {info.values && info.values.map((val, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--accent-glow)] shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-medium leading-snug">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Contact & Legal Info */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-slate-400">
            <div>
              <span className="text-white font-semibold block text-sm">{info.name} ({info.legalName})</span>
              <span>RUT: {info.rut} • {info.contact.address}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[var(--accent-glow)]" />
                <a href={`mailto:${info.contact.email}`} className="hover:text-white">
                  {info.contact.email}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#fbbf24]" />
                <span>{info.contact.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#38bdf8]" />
                <span>{info.contact.web}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Edit Institutional Info Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[var(--bg-surface)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--accent-glow)]" />
                <h3 className="text-base font-semibold text-white">
                  Editar Información Institucional de F.A.S.E
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Nombre Fantasía *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={e => setFormData(prev => ({ ...prev, legalName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    RUT Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.rut}
                    onChange={e => setFormData(prev => ({ ...prev, rut: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Fundación / Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.founded}
                    onChange={e => setFormData(prev => ({ ...prev, founded: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Bajada / Eslogan Institucional
                </label>
                <textarea
                  rows={2}
                  value={formData.tagline}
                  onChange={e => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Misión Institucional
                </label>
                <textarea
                  rows={3}
                  value={formData.mission}
                  onChange={e => setFormData(prev => ({ ...prev, mission: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Visión Estratégica
                </label>
                <textarea
                  rows={3}
                  value={formData.vision}
                  onChange={e => setFormData(prev => ({ ...prev, vision: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Valores y Principios Operativos (un valor por línea)
                </label>
                <textarea
                  rows={4}
                  value={valuesInput}
                  onChange={e => setValuesInput(e.target.value)}
                  placeholder="Rigor Técnico&#10;Investigación Creativa&#10;Descentralización Territorial"
                  className="w-full px-3 py-2 bg-[var(--bg-base)] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-glow)] font-mono text-xs"
                />
              </div>

              {/* Stats Inputs */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Métricas y Estadísticas
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block">Total Obras</label>
                    <input
                      type="number"
                      value={formData.stats.totalObras}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        stats: { ...prev.stats, totalObras: Number(e.target.value) || 0 }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Funciones</label>
                    <input
                      type="number"
                      value={formData.stats.funcionesRealizadas}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        stats: { ...prev.stats, funcionesRealizadas: Number(e.target.value) || 0 }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Espectadores</label>
                    <input
                      type="number"
                      value={formData.stats.espectadoresHistoricos}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        stats: { ...prev.stats, espectadoresHistoricos: Number(e.target.value) || 0 }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Regiones</label>
                    <input
                      type="number"
                      value={formData.stats.regionesVisitadas}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        stats: { ...prev.stats, regionesVisitadas: Number(e.target.value) || 0 }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Premios</label>
                    <input
                      type="number"
                      value={formData.stats.premiosNacionales}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        stats: { ...prev.stats, premiosNacionales: Number(e.target.value) || 0 }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Contacto Oficial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block">Dirección / Sedes</label>
                    <input
                      type="text"
                      value={formData.contact.address}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        contact: { ...prev.contact, address: e.target.value }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Email</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        contact: { ...prev.contact, email: e.target.value }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Teléfono</label>
                    <input
                      type="text"
                      value={formData.contact.phone}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        contact: { ...prev.contact, phone: e.target.value }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Sitio Web</label>
                    <input
                      type="text"
                      value={formData.contact.web}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        contact: { ...prev.contact, web: e.target.value }
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-base)] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--accent-terracota)] hover:bg-[var(--accent-glow)] rounded-lg shadow cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
