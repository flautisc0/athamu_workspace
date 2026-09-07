import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import { formatCLP } from '../../utils/storage';
import {
  PackageCheck,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Tag,
  MapPin,
  DollarSign
} from 'lucide-react';

interface InventarioSectionProps {
  inventory: InventoryItem[];
  onUpdateItemStatus: (itemId: string, newStatus: InventoryItem['status']) => void;
}

export const InventarioSection: React.FC<InventarioSectionProps> = ({
  inventory,
  onUpdateItemStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || item.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalValueCLP = filteredItems.reduce((acc, i) => acc + i.valueCLP, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6ee7b7] uppercase tracking-wider">
            <span>9. Inventario & Backline Propio</span>
            <span>•</span>
            <span>Parque Técnico ATHA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Recursos Técnicos, Audio, Iluminación & Linóleo
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Control y trazabilidad de los equipos propios de ATHA Producciones: consolas digitales, microfonía inalámbrica, iluminación LED Astera, proyectores y piso de danza.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#161920] border border-white/10 text-right whitespace-nowrap">
          <span className="text-[10px] text-slate-400 block font-mono">Valor Total de Activos</span>
          <span className="text-base font-bold text-[#6ee7b7] font-mono">
            {formatCLP(totalValueCLP)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#161920] border border-white/10 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre o ubicación de bodega..."
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-[#6ee7b7]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ee7b7]"
        >
          <option value="all">Todas las Categorías</option>
          <option value="Audio / Backline">Audio / Backline</option>
          <option value="Iluminación">Iluminación</option>
          <option value="Estructura / Escenario">Estructura / Escenario</option>
          <option value="Video / Proyección">Video / Proyección</option>
          <option value="Cables & DMX">Cables & DMX</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-[#0f1115] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ee7b7]"
        >
          <option value="all">Todos los Estados</option>
          <option value="Disponible">Disponible en bodega</option>
          <option value="Asignado en gira">Asignado en gira</option>
          <option value="En bodega central">En bodega central</option>
        </select>
      </div>

      {/* Items list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const statusColor =
            item.status === 'Disponible'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : item.status === 'Asignado en gira'
              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              : 'bg-slate-500/15 text-slate-300 border-slate-500/30';

          const conditionColor =
            item.condition === 'Excelente' ? 'text-emerald-400' :
            item.condition === 'Operativo' ? 'text-sky-300' : 'text-amber-400';

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-white/5 text-[#6ee7b7] border border-white/5">
                    {item.code}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor}`}>
                    {item.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                  {item.name}
                </h3>

                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Categoría:</span>
                    <span className="text-slate-200">{item.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Condición física:</span>
                    <span className={`font-semibold ${conditionColor}`}>
                      {item.condition}
                    </span>
                  </div>
                  {item.assignedToWork && (
                    <div className="flex items-center justify-between pt-1 text-[#fbbf24]">
                      <span>Asignado a:</span>
                      <span className="font-medium truncate">{item.assignedToWork}</span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-[#12141a] border border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
              </div>

              {/* Status Switcher & Value */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-white">
                  {formatCLP(item.valueCLP)}
                </span>

                <div className="flex items-center gap-1">
                  <select
                    value={item.status}
                    onChange={(e) => onUpdateItemStatus(item.id, e.target.value as any)}
                    className="text-[11px] px-2 py-1 bg-[#0f1115] border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-[#6ee7b7] cursor-pointer"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Asignado en gira">En gira</option>
                    <option value="En bodega central">En bodega</option>
                  </select>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
