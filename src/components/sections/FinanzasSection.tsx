import React, { useState } from 'react';
import { FinanceRecord, Obra, ProjectRD } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  ReceiptText,
  Plus,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  Filter,
  FileText
} from 'lucide-react';

interface FinanzasSectionProps {
  finances: FinanceRecord[];
  obras: Obra[];
  rdProjects: ProjectRD[];
  onAddFinanceRecord: (record: FinanceRecord) => void;
}

export const FinanzasSection: React.FC<FinanzasSectionProps> = ({
  finances,
  obras,
  rdProjects,
  onAddFinanceRecord
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Record State
  const [newRecord, setNewRecord] = useState<Partial<FinanceRecord>>({
    projectId: obras[0]?.id || '',
    projectName: obras[0]?.title || '',
    type: 'Gasto',
    category: 'Honorarios',
    amountCLP: 500000,
    date: new Date().toLocaleDateString('es-CL'),
    status: 'Pendiente',
    invoiceRef: 'Boleta de honorarios',
    responsible: 'Francisco Pérez'
  });

  const filteredFinances = finances.filter((f) => {
    const matchesType = filterType === 'all' || f.type === filterType;
    const matchesCategory = filterCategory === 'all' || f.category === filterCategory;
    return matchesType && matchesCategory;
  });

  const totalIngresos = finances
    .filter(f => f.type === 'Ingreso')
    .reduce((sum, f) => sum + f.amountCLP, 0);

  const totalGastos = finances
    .filter(f => f.type === 'Gasto')
    .reduce((sum, f) => sum + f.amountCLP, 0);

  const saldo = totalIngresos - totalGastos;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.amountCLP) return;

    const allProjects = [...obras, ...rdProjects];
    const match = allProjects.find(p => p.id === newRecord.projectId);

    const record: FinanceRecord = {
      id: `fin-${Date.now()}`,
      projectId: newRecord.projectId || 'obra-01',
      projectName: match?.title || 'Producción General',
      type: (newRecord.type as any) || 'Gasto',
      category: (newRecord.category as any) || 'Honorarios',
      amountCLP: Number(newRecord.amountCLP) || 0,
      date: newRecord.date || new Date().toLocaleDateString('es-CL'),
      status: (newRecord.status as any) || 'Pendiente',
      invoiceRef: newRecord.invoiceRef || 'Boleta/Factura',
      responsible: newRecord.responsible || 'Francisco Pérez'
    };

    onAddFinanceRecord(record);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#fbbf24] uppercase tracking-wider">
            <span>10. Rendiciones & Finanzas</span>
            <span>•</span>
            <span>Contabilidad Escénica</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Presupuestos, Facturas & Rendiciones de Fondos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Seguimiento de gastos por proyecto (FONDART, convenios de salas y venta de funciones), honorarios de elenco, arriendos y rendición de cuentas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f1115] text-xs font-semibold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Ingresar Boleta / Gasto</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#161920] border border-white/5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Ingresos & Cachés Percibidos</span>
          </span>
          <p className="text-2xl font-bold text-white font-mono">{formatCLP(totalIngresos)}</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161920] border border-white/5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span>Gastos & Honorarios Rendidos</span>
          </span>
          <p className="text-2xl font-bold text-white font-mono">{formatCLP(totalGastos)}</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161920] border border-white/5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#6ee7b7]" />
            <span>Saldo Operativo ATHA</span>
          </span>
          <p className={`text-2xl font-bold font-mono ${saldo >= 0 ? 'text-[#6ee7b7]' : 'text-red-400'}`}>
            {formatCLP(saldo)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#161920] border border-white/10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tipo:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="all">Ingresos y Gastos</option>
            <option value="Ingreso">Solo Ingresos</option>
            <option value="Gasto">Solo Gastos</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Categoría:</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#fbbf24]"
          >
            <option value="all">Todas las Categorías</option>
            <option value="Honorarios">Honorarios Elenco/Equipo</option>
            <option value="Traslados/Viáticos">Traslados & Viáticos</option>
            <option value="Técnica & Arriendo">Técnica & Arriendos</option>
            <option value="Escenografía & Vestuario">Escenografía & Vestuario</option>
            <option value="Difusión & Prensa">Difusión & Prensa</option>
          </select>
        </div>
      </div>

      {/* Table of Records */}
      <div className="rounded-2xl bg-[#161920] border border-white/10 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#12141a] text-slate-400 border-b border-white/10 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Proyecto</th>
                <th className="py-3 px-4">Categoría / Glosa</th>
                <th className="py-3 px-4">Referencia Comprobante</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-right">Monto CLP</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredFinances.map((f) => (
                <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-400">{f.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{f.projectName}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">
                      {f.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{f.invoiceRef}</td>
                  <td className="py-3.5 px-4">{f.responsible}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                    <span className={f.type === 'Ingreso' ? 'text-[#6ee7b7]' : 'text-slate-200'}>
                      {f.type === 'Ingreso' ? '+ ' : '- '}{formatCLP(f.amountCLP)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      f.status === 'Aprobado' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      f.status === 'Rendido' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' :
                      'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Finance */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[#12141a] flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Registrar Movimiento Financiero</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo</label>
                  <select
                    value={newRecord.type}
                    onChange={e => setNewRecord({ ...newRecord, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                  >
                    <option value="Gasto">Gasto / Egreso</option>
                    <option value="Ingreso">Ingreso / Caché</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                  <select
                    value={newRecord.category}
                    onChange={e => setNewRecord({ ...newRecord, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                  >
                    <option value="Honorarios">Honorarios</option>
                    <option value="Traslados/Viáticos">Traslados/Viáticos</option>
                    <option value="Técnica & Arriendo">Técnica & Arriendo</option>
                    <option value="Escenografía & Vestuario">Escenografía & Vestuario</option>
                    <option value="Difusión & Prensa">Difusión & Prensa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Proyecto</label>
                <select
                  value={newRecord.projectId}
                  onChange={e => setNewRecord({ ...newRecord, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                >
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                  {rdProjects.map(rd => (
                    <option key={rd.id} value={rd.id}>{rd.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Monto CLP *</label>
                  <input
                    type="number"
                    required
                    value={newRecord.amountCLP}
                    onChange={e => setNewRecord({ ...newRecord, amountCLP: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-[#fbbf24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estado</label>
                  <select
                    value={newRecord.status}
                    onChange={e => setNewRecord({ ...newRecord, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Rendido">Rendido</option>
                    <option value="Aprobado">Aprobado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Comprobante / Glosa</label>
                <input
                  type="text"
                  value={newRecord.invoiceRef}
                  onChange={e => setNewRecord({ ...newRecord, invoiceRef: e.target.value })}
                  placeholder="Ej. Boleta de honorarios #4491 o Factura 110"
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Responsable en ATHA</label>
                <input
                  type="text"
                  value={newRecord.responsible}
                  onChange={e => setNewRecord({ ...newRecord, responsible: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-[#0f1115] bg-[#fbbf24] hover:bg-[#f59e0b] rounded-lg shadow cursor-pointer"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
