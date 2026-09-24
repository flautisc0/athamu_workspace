import React, { useState } from 'react';
import { Obra, Lead, Venue } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  Send,
  FileText,
  DollarSign,
  Calculator,
  Download,
  Upload,
  Check,
  Paperclip,
  Building2,
  Sparkles,
  RefreshCw,
  Mail,
  Users,
  Filter,
  CheckSquare,
  Square,
  Plus,
  Trash2
} from 'lucide-react';

interface RecipientGroup {
  id: string;
  name: string;
  description: string;
  emails: string[];
}

interface VentasSectionProps {
  obras: Obra[];
  leads: Lead[];
  venues?: Venue[];
  theme?: 'terracota' | 'dia';
}

export const VentasSection: React.FC<VentasSectionProps> = ({
  obras,
  leads,
  venues = [],
  theme = 'terracota'
}) => {
  const isLight = theme === 'dia';

  // Selected work for pitching / sales
  const [selectedObraId, setSelectedObraId] = useState<string>(obras[0]?.id || '');
  const activeObra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Pre-populated recipient groups
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([
    {
      id: 'g-1',
      name: 'Programadores de Salas Principales',
      description: 'Directores de programación de teatros corporativos y salas de la Región Metropolitana.',
      emails: leads.filter(l => l.type === 'sala').map(l => l.email)
    },
    {
      id: 'g-2',
      name: 'Festivales Nacionales & Internacionales',
      description: 'Curadores de festivales de artes escénicas en Chile y Latinoamérica.',
      emails: leads.filter(l => l.type === 'festival').map(l => l.email)
    },
    {
      id: 'g-3',
      name: 'Red de Casas de Cultura & Regiones',
      description: 'Corporaciones culturales municipales y espacios descentralizados.',
      emails: leads.map(l => l.email).slice(0, 5)
    }
  ]);

  // Selected recipient emails state
  const [selectedEmails, setSelectedEmails] = useState<string[]>([leads[0]?.email || 'programacion@gam.cl']);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [recipientFilterType, setRecipientFilterType] = useState<string>('all');
  const [recipientSearch, setRecipientSearch] = useState<string>('');

  // New recipient group modal state
  const [showNewGroupModal, setShowNewGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupEmailsStr, setNewGroupEmailsStr] = useState<string>('');

  // Email draft state
  const [emailSubject, setEmailSubject] = useState<string>(`Propuesta de Gira y Dossier Artístico: ${activeObra?.title || 'Obra FASE'}`);
  const [emailBody, setEmailBody] = useState<string>(
    `Estimado/a Programador/a,\n\nJunto con saludar cordialmente, nos ponemos en contacto desde F.A.S.E Producciones para presentarles nuestra obra "${activeObra?.title || ''}", seleccionada dentro de nuestro repertorio contemporáneo.\n\nAdjuntamos a este correo el dossier artístico completo, rider técnico y desglose presupuestario con punto de equilibrio para su evaluación en programación.\n\nQuedamos atentos a sus comentarios.\n\nAtentamente,\nEquipo de Producción F.A.S.E`
  );

  // Budget Calculator variables
  const [cacheFee, setCacheFee] = useState<number>(activeObra?.economics.feeCLP || 1200000);
  const [productionCost, setProductionCost] = useState<number>(activeObra?.economics.productionCostCLP || 450000);
  const [ticketPrice, setTicketPrice] = useState<number>(8000);
  const [hallCapacity, setHallCapacity] = useState<number>(250);
  const [occupancyRate, setOccupancyRate] = useState<number>(75); // %

  const [feedback, setFeedback] = useState<string | null>(null);

  // Calculated economics
  const totalRevenueEstimated = Math.round((hallCapacity * (occupancyRate / 100)) * ticketPrice);
  const breakEvenTicketsCount = Math.ceil(productionCost / ticketPrice);
  const profitMargin = totalRevenueEstimated - productionCost;

  // Filter leads/contacts
  const filteredLeads = leads.filter(l => {
    if (recipientFilterType !== 'all' && l.type !== recipientFilterType) return false;
    if (recipientSearch.trim() && !l.name.toLowerCase().includes(recipientSearch.toLowerCase()) && !l.organization.toLowerCase().includes(recipientSearch.toLowerCase()) && !l.email.toLowerCase().includes(recipientSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleToggleEmail = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter(e => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (groupId === 'all') {
      setSelectedEmails(leads.map(l => l.email));
    } else {
      const foundGroup = recipientGroups.find(g => g.id === groupId);
      if (foundGroup) {
        setSelectedEmails(foundGroup.emails);
      }
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const emailsArr = newGroupEmailsStr.split(',').map(s => s.trim()).filter(Boolean);
    const newGroup: RecipientGroup = {
      id: `g-${Date.now()}`,
      name: newGroupName,
      description: newGroupDesc || 'Grupo personalizado de destinatarios F.A.S.E.',
      emails: emailsArr.length > 0 ? emailsArr : selectedEmails
    };

    setRecipientGroups([...recipientGroups, newGroup]);
    setShowNewGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupEmailsStr('');
    setFeedback(`¡Grupo de destinatarios "${newGroupName}" creado con éxito!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteGroup = (groupId: string) => {
    setRecipientGroups(recipientGroups.filter(g => g.id !== groupId));
    setFeedback('Grupo de destinatarios eliminado.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSendMassiveMailing = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmails.length === 0) {
      alert('Debe seleccionar al menos un destinatario.');
      return;
    }
    setFeedback(`¡Mailing masivo enviado exitosamente a ${selectedEmails.length} destinatarios con los dossiers adjuntos!`);
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleExportXLS = () => {
    const csvContent = [
      `Presupuesto y Punto de Equilibrio - ${activeObra?.title || 'F.A.S.E'}`,
      `Caché Referencial (CLP),${cacheFee}`,
      `Costo de Producción (CLP),${productionCost}`,
      `Precio Entrada (CLP),${ticketPrice}`,
      `Capacidad Sala,${hallCapacity}`,
      `Ocupación Estimada (%),${occupancyRate}`,
      `Ingresos Estimados (CLP),${totalRevenueEstimated}`,
      `Punto de Equilibrio (Entradas),${breakEvenTicketsCount}`,
      `Margen Neto Estimado (CLP),${profitMargin}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Presupuesto_${activeObra?.title || 'Obra'}_FASE.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedback('¡Presupuesto exportado en formato de hoja de cálculo (.csv/.xls) con éxito!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImportXLS = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const lines = text.split('\n');
          if (lines.length > 2) {
            const parsedCache = parseFloat(lines[1]?.split(',')[1]) || cacheFee;
            const parsedCost = parseFloat(lines[2]?.split(',')[1]) || productionCost;
            setCacheFee(parsedCache);
            setProductionCost(parsedCost);
          }
          setFeedback('¡Hoja de cálculo importada y variables actualizadas correctamente!');
          setTimeout(() => setFeedback(null), 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${
        isLight
          ? 'bg-gradient-to-br from-white via-[#FAF6F4] to-[#F5ECE8] border-[#E8DDD7] text-stone-900 shadow-xs'
          : 'bg-gradient-to-br from-[#1E110F] via-[#241513] to-[#170E0D] border-[#E05A47]/30 text-white shadow-xl'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#E05A47]/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[#E05A47]/15 text-[#E05A47] font-bold">
                Módulo de Ventas, Mailing Masivo & Presupuestos
              </span>
              <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Base de Datos CRM & Grupos SQL Sincronizada
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
              Mailing Masivo, Selección de Destinatarios & Calculadora Financiera
            </h1>
            <p className={`text-xs md:text-sm max-w-2xl ${isLight ? 'text-stone-600' : 'text-slate-300'}`}>
              Envía propuestas comerciales y dossiers técnicos a múltiples destinatarios filtrados por base de datos o agrupaciones personalizadas.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Select Obra Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-[#180F0E] border-[#3E221E]'
      }`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Sparkles className="w-4 h-4 text-[#E05A47]" />
          <span className="text-xs font-bold uppercase tracking-wider">Seleccionar Obra a Ofertar:</span>
          <select
            value={selectedObraId}
            onChange={e => {
              setSelectedObraId(e.target.value);
              const found = obras.find(o => o.id === e.target.value);
              if (found) {
                setCacheFee(found.economics.feeCLP);
                setProductionCost(found.economics.productionCostCLP);
                setEmailSubject(`Propuesta de Gira y Dossier Artístico: ${found.title}`);
              }
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
              isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
            }`}
          >
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.title} ({o.discipline} - {formatCLP(o.economics.feeCLP)})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Formatos: {activeObra?.format}</span>
          <span>•</span>
          <span>Duración: {activeObra?.duration}</span>
        </div>
      </div>

      {/* Grid: Recipient Management & Massive Email Draft (7 cols) + Budget Calculator (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Mailing List, Group Management & Email Draft (7 cols) */}
        <div className={`lg:col-span-7 p-6 md:p-8 rounded-2xl border space-y-6 ${
          isLight ? 'bg-white border-stone-200 text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100'
        }`}>
          <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-white/10">
            <h3 className="text-sm font-bold font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E05A47]" />
              <span>Gestión de Grupos & Destinatarios ({selectedEmails.length} seleccionados)</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowNewGroupModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E05A47]/15 hover:bg-[#E05A47]/25 text-[#E05A47] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Grupo Destinatarios</span>
            </button>
          </div>

          {/* Groups Selector Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider opacity-80 font-bold">Seleccionar Grupo Predeterminado:</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSelectGroup('all')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  selectedGroupId === 'all'
                    ? 'bg-[#E05A47] text-white border-[#E05A47]'
                    : isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-black/30 border-white/10 text-white'
                }`}
              >
                Todos los Leads ({leads.length})
              </button>
              {recipientGroups.map(g => (
                <div key={g.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(g.id)}
                    className={`px-3 py-1.5 rounded-l-xl border text-xs font-medium transition-all cursor-pointer ${
                      selectedGroupId === g.id
                        ? 'bg-[#E05A47] text-white border-[#E05A47]'
                        : isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  >
                    {g.name} ({g.emails.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(g.id)}
                    className={`px-2 py-1.5 rounded-r-xl border-t border-b border-r text-xs text-red-400 hover:bg-red-500/10 cursor-pointer ${
                      isLight ? 'border-stone-200 bg-stone-50' : 'border-white/10 bg-black/30'
                    }`}
                    title="Eliminar grupo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recipient Filter & Search Database */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-[#E05A47]" />
                <select
                  value={recipientFilterType}
                  onChange={e => setRecipientFilterType(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">Filtrar por Tipo (Todos)</option>
                  <option value="sala">Salas & Teatros</option>
                  <option value="festival">Festivales</option>
                  <option value="programador">Programadores</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Buscar contacto o email..."
                value={recipientSearch}
                onChange={e => setRecipientSearch(e.target.value)}
                className={`w-full sm:w-56 px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                  isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>

            {/* Scrollable multi-select list */}
            <div className={`max-h-48 overflow-y-auto rounded-xl border p-2 space-y-1.5 ${
              isLight ? 'bg-stone-50/50 border-stone-200' : 'bg-black/20 border-white/10'
            }`}>
              {filteredLeads.map(l => {
                const isSelected = selectedEmails.includes(l.email);
                return (
                  <div
                    key={l.id}
                    onClick={() => handleToggleEmail(l.email)}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#E05A47]/15 border-[#E05A47]/40 text-[#E05A47]'
                        : isLight ? 'bg-white border-stone-200 text-stone-800 hover:bg-stone-100' : 'bg-[#180F0E] border-white/10 text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-[#E05A47] shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                      <div className="min-w-0">
                        <span className="text-xs font-bold truncate block">{l.name} ({l.organization})</span>
                        <span className="text-[10px] font-mono opacity-70 truncate block">{l.email} • {l.city}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 shrink-0">
                      {l.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email Draft Form */}
          <form onSubmit={handleSendMassiveMailing} className="space-y-4 pt-4 border-t border-stone-200 dark:border-white/10 text-xs">
            <div>
              <label className="block font-medium mb-1 opacity-80">Asunto del Mailing</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                  isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                }`}
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1 opacity-80">Cuerpo del Mensaje Masivo</label>
              <textarea
                rows={5}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                  isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                }`}
                required
              />
            </div>

            {/* Attached Documents */}
            <div className="space-y-2">
              <label className="block font-medium opacity-80 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#E05A47]" />
                <span>Documentos Adjuntos Automáticos (Dossiers & Riders)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/25 border-white/10'}`}>
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] truncate">Dossier_{activeObra?.title?.replace(/\s+/g, '_')}_Oficial.pdf</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/25 border-white/10'}`}>
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] truncate">Rider_Tecnico_{activeObra?.discipline}.pdf</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-stone-200 dark:border-white/10">
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                Destinatarios seleccionados: {selectedEmails.length}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-semibold shadow-lg shadow-[#E05A47]/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Mailing Masivo</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Budget Calculator & Break-Even Modeler (5 cols) */}
        <div className={`lg:col-span-5 p-6 md:p-8 rounded-2xl border space-y-6 ${
          isLight ? 'bg-white border-stone-200 text-stone-900 shadow-xs' : 'bg-[#180F0E] border-[#3E221E] text-slate-100'
        }`}>
          <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-white/10">
            <h3 className="text-sm font-bold font-display flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-500" />
              <span>Calculadora Presupuesto & Punto de Equilibrio</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportXLS}
                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Exportar hoja de cálculo .xls/.csv"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[10px]">Exportar XLS</span>
              </button>
              <label className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-xs font-semibold flex items-center gap-1 cursor-pointer" title="Importar hoja de cálculo">
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[10px]">Importar</span>
                <input type="file" accept=".csv,.txt,.xls" onChange={handleImportXLS} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium mb-1 opacity-80">Caché Referencial / Venta (CLP)</label>
              <input
                type="number"
                value={cacheFee}
                onChange={e => setCacheFee(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block font-medium mb-1 opacity-80">Costo de Producción / Montaje (CLP)</label>
              <input
                type="number"
                value={productionCost}
                onChange={e => setProductionCost(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1 opacity-80">Precio Entrada (CLP)</label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={e => setTicketPrice(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1 opacity-80">Capacidad Sala</label>
                <input
                  type="number"
                  value={hallCapacity}
                  onChange={e => setHallCapacity(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1 opacity-80">Ocupación Estimada: {occupancyRate}%</label>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={occupancyRate}
                onChange={e => setOccupancyRate(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Results Box */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/30 border-white/10'
            }`}>
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-80">Ingresos Taquilla Est.:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatCLP(totalRevenueEstimated)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-80">Punto de Equilibrio:</span>
                <span className="font-bold text-amber-400 font-mono">{breakEvenTicketsCount} entradas vendidas</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                <span className="font-bold">Margen Operativo Estimado:</span>
                <span className="font-bold text-[#E05A47] font-mono">{formatCLP(profitMargin)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* New Recipient Group Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 md:p-8 rounded-3xl border space-y-6 ${
            isLight ? 'bg-white border-stone-200 text-stone-900 shadow-2xl' : 'bg-[#1C1210] border-[#3E221E] text-white shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-white/10">
              <h3 className="text-lg font-bold font-display">Crear Grupo de Destinatarios</h3>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Nombre del Grupo</label>
                <input
                  type="text"
                  placeholder="Ej: Festivales del Sur de Chile"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Descripción del segmento..."
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Correos Electrónicos (separados por coma)</label>
                <textarea
                  rows={3}
                  placeholder="prog1@teatro.cl, prog2@festival.cl"
                  value={newGroupEmailsStr}
                  onChange={e => setNewGroupEmailsStr(e.target.value)}
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#E05A47] ${
                    isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    isLight ? 'border-stone-200 text-stone-700 hover:bg-stone-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E05A47] hover:bg-[#FF6B4A] text-white text-xs font-semibold shadow-lg shadow-[#E05A47]/20 cursor-pointer"
                >
                  Guardar Grupo & Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
