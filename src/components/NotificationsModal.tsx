import React, { useState, useEffect } from 'react';
import { ReminderNotification } from '../types';
import {
  Bell,
  Check,
  X,
  Calendar,
  AlertCircle,
  CheckCheck,
  Send,
  Plus,
  Trash2,
  Filter,
  Sparkles,
  Info,
  Clock,
  Radio
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders?: ReminderNotification[];
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
  onDeleteReminder?: (id: string) => void;
  onAddReminder?: (newReminder: ReminderNotification) => void;
  onTriggerSimulatedPush?: () => void;
  theme?: 'terracota' | 'dia';
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  reminders = [],
  onMarkAsRead,
  onClearAll,
  onDeleteReminder,
  onAddReminder,
  onTriggerSimulatedPush,
  theme = 'terracota'
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [notificationSent, setNotificationSent] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'ensayo' | 'tecnica' | 'ventas' | 'finanzas'>('all');
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);

  // Form state for creating a new reminder
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<string>('ensayo');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const isLight = theme === 'dia';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  if (!isOpen) return null;

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
        if (perm === 'granted') {
          new Notification('F.A.S.E Producciones — Alertas Activas', {
            body: '¡Listo! Recibirás avisos en tiempo real de ensayos, llamados técnicos y fechas críticas.',
            icon: '/assets/fase/fase-simbolo.svg'
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const handleSendPush = () => {
    const alertTitle = 'Recordatorio F.A.S.E: Ensayo General';
    const alertBody = 'Pasada técnica completa en GAM Sala A1 a las 10:00 hrs. Elenco y dirección confirmados.';

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(alertTitle, {
          body: alertBody,
          icon: '/assets/fase/fase-simbolo.svg'
        });
      } catch (e) {
        console.warn('Native notification error:', e);
      }
    }

    if (onTriggerSimulatedPush) {
      onTriggerSimulatedPush();
    }

    setNotificationSent(true);
    setTimeout(() => setNotificationSent(false), 3000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newReminder: ReminderNotification = {
      id: `rem-${Date.now()}`,
      title: newTitle.trim(),
      message: newMessage.trim() || 'Sin observaciones adicionales.',
      type: newType,
      date: newDate || new Date().toISOString().split('T')[0],
      read: false
    };

    if (onAddReminder) {
      onAddReminder(newReminder);
    }

    setNewTitle('');
    setNewMessage('');
    setIsCreatingReminder(false);
  };

  const unreadCount = reminders.filter(r => !r.read).length;

  const filteredReminders = reminders.filter(r => {
    if (activeFilter === 'unread') return !r.read;
    if (activeFilter === 'ensayo') return r.type === 'ensayo';
    if (activeFilter === 'tecnica') return r.type === 'tecnica';
    if (activeFilter === 'ventas') return r.type === 'ventas';
    if (activeFilter === 'finanzas') return r.type === 'finanzas';
    return true;
  });

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ensayo':
        return {
          label: 'Ensayo',
          style: isLight
            ? 'bg-[#C84835]/10 text-[#C84835] border-[#C84835]/30'
            : 'bg-[#E05A47]/15 text-[#FF6B4A] border-[#E05A47]/30'
        };
      case 'finanzas':
        return {
          label: 'Finanzas / FONDART',
          style: isLight
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
        };
      case 'tecnica':
        return {
          label: 'Técnica / Rider',
          style: isLight
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
        };
      case 'ventas':
        return {
          label: 'Ventas / Giras',
          style: isLight
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
        };
      default:
        return {
          label: type,
          style: isLight
            ? 'bg-stone-100 text-stone-700 border-stone-200'
            : 'bg-stone-800/40 text-stone-300 border-stone-700/40'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border transition-colors flex flex-col max-h-[88vh] ${
          isLight
            ? 'bg-[#FAF8F6] border-stone-200 text-stone-900 shadow-stone-300/40'
            : 'bg-[#160E0D] border-[#3E221E] text-[#FDF5F4] shadow-black/80'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
            isLight
              ? 'bg-white border-stone-200'
              : 'bg-[#1A100F] border-[#3E221E]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isLight
                  ? 'bg-[#C84835]/10 border-[#C84835]/20 text-[#C84835]'
                  : 'bg-[#E05A47]/15 border-[#E05A47]/30 text-[#FF6B4A]'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-none">Centro de Alertas & Notificaciones</h2>
                {unreadCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                      isLight
                        ? 'bg-[#C84835] text-white'
                        : 'bg-[#E05A47] text-white'
                    }`}
                  >
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-1 ${
                  isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                }`}
              >
                Sincronización en vivo con CRM, agenda de ensayos y llamados F.A.S.E
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">

          {/* Web Push Banner with exact matching palette */}
          <div
            className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isLight
                ? 'bg-white border-stone-200'
                : 'bg-[#1E1210] border-[#3E221E]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    permissionState === 'granted'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-[#E05A47]'
                  }`}
                />
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isLight ? 'text-stone-700' : 'text-[#D4B2AD]'
                  }`}
                >
                  Alertas de Navegador Web
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    permissionState === 'granted'
                      ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'
                      : isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-950/50 text-amber-400 border border-amber-800/50'
                  }`}
                >
                  {permissionState === 'granted' ? 'Permiso Concedido' : 'Pendiente'}
                </span>
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  isLight ? 'text-stone-500' : 'text-[#D4B2AD]'
                }`}
              >
                {permissionState === 'granted'
                  ? 'Recibirás recordatorios automáticos de llamados técnicos y funciones.'
                  : 'Habilita notificaciones en tu navegador para recibir alertas en tiempo real.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {permissionState !== 'granted' && (
                <button
                  type="button"
                  onClick={requestPermission}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-[#C84835] hover:bg-[#A33827] text-white shadow-sm'
                      : 'bg-[#E05A47] hover:bg-[#FF6B4A] text-white shadow-sm'
                  }`}
                >
                  Activar Web Push
                </button>
              )}
              <button
                type="button"
                onClick={handleSendPush}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-stone-300 hover:bg-stone-100 text-stone-700'
                    : 'border-[#3E221E] hover:bg-white/5 text-stone-200'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-[#E05A47]" />
                <span>{notificationSent ? '¡Push Enviado!' : 'Probar Alerta'}</span>
              </button>
            </div>
          </div>

          {/* Action Bar: Create Reminder Toggle & Filters */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `Todas (${reminders.length})` },
                    { id: 'unread', label: `No leídas (${unreadCount})` },
                    { id: 'ensayo', label: 'Ensayos' },
                    { id: 'tecnica', label: 'Técnica' },
                    { id: 'ventas', label: 'Ventas' },
                    { id: 'finanzas', label: 'Finanzas' }
                  ] as const
                ).map(tab => {
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? isLight
                            ? 'bg-[#C84835] text-white'
                            : 'bg-[#E05A47] text-white'
                          : isLight
                          ? 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                          : 'bg-[#1E1210] border border-[#3E221E] text-stone-300 hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingReminder(prev => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    isCreatingReminder
                      ? isLight
                        ? 'bg-stone-200 border-stone-300 text-stone-800'
                        : 'bg-white/10 border-white/20 text-white'
                      : isLight
                      ? 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                      : 'bg-[#1E1210] border-[#3E221E] hover:bg-white/5 text-stone-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingReminder ? 'Cancelar' : 'Nueva Alerta'}</span>
                </button>

                {onClearAll && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      isLight
                        ? 'text-[#C84835] hover:bg-[#C84835]/10'
                        : 'text-[#FF6B4A] hover:bg-[#E05A47]/10'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Marcar leídas</span>
                  </button>
                )}
              </div>
            </div>

            {/* In-modal New Reminder Creator Form */}
            {isCreatingReminder && (
              <form
                onSubmit={handleCreateSubmit}
                className={`p-4 rounded-xl border space-y-3 animate-in fade-in duration-150 ${
                  isLight
                    ? 'bg-white border-[#C84835]/30 shadow-sm'
                    : 'bg-[#1C100F] border-[#E05A47]/40 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#E05A47] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Recordatorio o Alerta de Producción</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                      Título del Aviso *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Ej: Montaje luces GAM"
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none transition-colors ${
                        isLight
                          ? 'bg-[#FAF8F6] border-stone-300 focus:border-[#C84835] text-stone-900'
                          : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                        Categoría
                      </label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border outline-none transition-colors ${
                          isLight
                            ? 'bg-[#FAF8F6] border-stone-300 focus:border-[#C84835] text-stone-900'
                            : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                        }`}
                      >
                        <option value="ensayo">Ensayo</option>
                        <option value="tecnica">Técnica</option>
                        <option value="ventas">Ventas / Gira</option>
                        <option value="finanzas">Finanzas / Fondart</option>
                        <option value="inventario">Inventario</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border outline-none transition-colors ${
                          isLight
                            ? 'bg-[#FAF8F6] border-stone-300 focus:border-[#C84835] text-stone-900'
                            : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Detalles / Observaciones
                  </label>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Instrucciones para el equipo, sala o requerimientos técnicos..."
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none transition-colors ${
                      isLight
                        ? 'bg-[#FAF8F6] border-stone-300 focus:border-[#C84835] text-stone-900'
                        : 'bg-[#120B0A] border-[#3E221E] focus:border-[#E05A47] text-white'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingReminder(false)}
                    className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-3 py-1 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer ${
                      isLight ? 'bg-[#C84835] hover:bg-[#A33827]' : 'bg-[#E05A47] hover:bg-[#FF6B4A]'
                    }`}
                  >
                    Guardar Notificación
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Reminders List */}
          <div className="space-y-2.5">
            {filteredReminders.length === 0 ? (
              <div
                className={`p-8 text-center rounded-xl border ${
                  isLight
                    ? 'bg-white border-stone-200 text-stone-400'
                    : 'bg-[#1A100F] border-[#3E221E] text-stone-500'
                }`}
              >
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#E05A47]" />
                <p className="text-xs font-semibold">No hay alertas en esta categoría</p>
                <p className="text-[11px] mt-0.5">Puedes crear una nueva alerta con el botón superior.</p>
              </div>
            ) : (
              filteredReminders.map(rem => {
                const badge = getTypeBadge(rem.type);
                return (
                  <div
                    key={rem.id}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      rem.read
                        ? isLight
                          ? 'bg-white/60 border-stone-200 opacity-60'
                          : 'bg-[#160E0D]/60 border-[#3E221E]/60 opacity-60'
                        : isLight
                        ? 'bg-white border-[#C84835]/30 shadow-sm'
                        : 'bg-[#1E110F] border-[#E05A47]/40 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            rem.read ? 'bg-stone-400' : 'bg-[#E05A47]'
                          }`}
                        />
                        <h4
                          className={`text-xs font-bold truncate ${
                            isLight ? 'text-stone-900' : 'text-white'
                          }`}
                        >
                          {rem.title}
                        </h4>
                        <span
                          className={`text-[10px] font-semibold font-mono uppercase px-2 py-0.5 rounded-full border ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <p
                        className={`text-xs leading-relaxed ${
                          isLight ? 'text-stone-600' : 'text-stone-300'
                        }`}
                      >
                        {rem.message}
                      </p>

                      <div
                        className={`flex items-center gap-3 text-[10px] font-mono ${
                          isLight ? 'text-stone-400' : 'text-[#D4B2AD]'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{rem.date}</span>
                        </span>
                        <span>•</span>
                        <span>{rem.read ? 'Leída' : 'Pendiente de atención'}</span>
                      </div>
                    </div>

                    {/* Actions: Mark read and Delete */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {!rem.read && onMarkAsRead && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(rem.id)}
                          title="Marcar como leída"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isLight
                              ? 'text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 border-stone-200'
                              : 'text-stone-400 hover:text-emerald-400 hover:bg-emerald-950/30 border-[#3E221E]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteReminder && (
                        <button
                          type="button"
                          onClick={() => onDeleteReminder(rem.id)}
                          title="Eliminar notificación"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isLight
                              ? 'text-stone-400 hover:text-rose-600 hover:bg-rose-50 border-stone-200'
                              : 'text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 border-[#3E221E]'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2 ${
              isLight
                ? 'bg-stone-50 border-stone-200 text-stone-500'
                : 'bg-[#1A100F] border-[#3E221E] text-[#D4B2AD]'
            }`}
          >
            <Info className="w-4 h-4 text-[#E05A47] shrink-0" />
            <span>
              Las alertas se sincronizan automáticamente con las fechas de la Calculadora de Estrenos y el CRM de obras teatrales.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
