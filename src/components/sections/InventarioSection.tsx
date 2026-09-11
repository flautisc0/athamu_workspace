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
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Wrench
} from 'lucide-react';

interface InventarioSectionProps {
  inventory: InventoryItem[];
  onUpdateItemStatus: (itemId: string, newStatus: InventoryItem['status']) => void;
  onSaveItem?: (item: InventoryItem) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const InventarioSection: React.FC<InventarioSectionProps> = ({
  inventory,
  onUpdateItemStatus,
  onSaveItem,
  onDeleteItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    code: '',
    name: '',
    category: 'Audio / Backline',
    status: 'Disponible',
    condition: 'Excelente',
    location: 'Bodega Central Bellavista, Santiago',
    valueCLP: 500000,
    assignedToWork: ''
  });

  const handleOpenNew = () => {
    setEditingItem(null);
    setFormData({
      id: `inv-${Date.now()}`,
      code: `ATHA-EQ-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'Audio / Backline',
      status: 'Disponible',
      condition: 'Excelente',
      location: 'Bodega Central Bellavista, Santiago',
      valueCLP: 650000,
      assignedToWork: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    const finalItem: InventoryItem = {
      id: editingItem ? editingItem.id : formData.id || `inv-${Date.now()}`,
      code: formData.code || 'ATHA-EQ-000',
      name: formData.name || '',
      category: formData.category || 'Audio / Backline',
      status: (formData.status as InventoryItem['status']) || 'Disponible',
      condition: (formData.condition as InventoryItem['condition']) || 'Operativo',
      location: formData.location || 'Bodega Central',
      valueCLP: Number(formData.valueCLP) || 0,
      assignedToWork: formData.assignedToWork || undefined
    };

    if (onSaveItem) {
      onSaveItem(finalItem);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Confirmas eliminar del inventario el equipo "${name}"?`)) {
      if (onDeleteItem) {
        onDeleteItem(id);
      }
    }
  };

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

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="p-3 rounded-xl bg-[#161920] border border-white/10 text-right whitespace-nowrap">
            <span className="text-[10px] text-slate-400 block font-mono">Valor Total en Filtro</span>
            <span className="text-base font-bold text-[#6ee7b7] font-mono">
              {formatCLP(totalValueCLP)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-4 py-3 bg-[#6ee7b7] hover:bg-[#5eead4] text-[#0f1115] font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Equipo</span>
          </button>
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
              className="p-5 rounded-2xl bg-[#161920] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 shadow-lg group relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-white/5 text-[#6ee7b7] border border-white/5">
                    {item.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor}`}>
                      {item.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Editar equipo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar equipo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Modal Agregar / Editar Equipo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 bg-[#12141a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#6ee7b7]" />
                <h3 className="text-base font-semibold text-white">
                  {editingItem ? 'Editar Equipo de Inventario' : 'Registrar Nuevo Equipo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Código de Activo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7] font-mono"
                    placeholder="ATHA-EQ-101"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Categoría
                  </label>
                  <select
                    value={formData.category || 'Audio / Backline'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7]"
                  >
                    <option value="Audio / Backline">Audio / Backline</option>
                    <option value="Iluminación">Iluminación</option>
                    <option value="Estructura / Escenario">Estructura / Escenario</option>
                    <option value="Video / Proyección">Video / Proyección</option>
                    <option value="Cables & DMX">Cables & DMX</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Nombre del Equipo / Especificación Técnica *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Consola Digital Behringer X32 Compact + Flightcase"
                  className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Estado Operativo
                  </label>
                  <select
                    value={formData.status || 'Disponible'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7]"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Asignado en gira">Asignado en gira</option>
                    <option value="En bodega central">En bodega central</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Condición Física
                  </label>
                  <select
                    value={formData.condition || 'Excelente'}
                    onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7]"
                  >
                    <option value="Excelente">Excelente (como nuevo)</option>
                    <option value="Operativo">Operativo (uso regular)</option>
                    <option value="Mantención">Requiere Mantención</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Valor Comercial / Seguro (CLP)
                  </label>
                  <input
                    type="number"
                    value={formData.valueCLP || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, valueCLP: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Asignado a Obra (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.assignedToWork || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedToWork: e.target.value }))}
                    placeholder="Ej: Fuego Ancestral"
                    className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Ubicación Física Actual / Bodega
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ej: Bodega Central Bellavista, Rack A2"
                  className="w-full px-3 py-2 bg-[#0f1115] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#6ee7b7]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-lg shadow cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingItem ? 'Guardar Cambios' : 'Registrar Equipo'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
