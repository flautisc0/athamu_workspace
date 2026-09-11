import React, { useState, useEffect } from 'react';
import { ReminderNotification } from '../types';
import { Bell, Check, X, Clock, Calendar, AlertCircle, Sparkles, CheckCheck, Send } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders?: ReminderNotification[];
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
  onTriggerSimulatedPush?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  reminders = [],
  onMarkAsRead,
  onClearAll,
  onTriggerSimulatedPush
}) => {
  if (!isOpen) return null;

  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
        if (perm === 'granted') {
          new Notification('F.A.S.E Producciones — Notificaciones Activas', {
            body: '¡Listo! Recibirás recordatorios diarios de ensayos, llamados de función y alertas técnicas.',
            icon: '/assets/fase/fase-simbolo.svg'
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Recordatorio F.A.S.E: Ensayo General Mañana', {
        body: 'Ensayo con pasada de luces en Centro GAM - Sala A1 (10:00 hrs). Elenco confirmado.',
        icon: '/assets/fase/fase-simbolo.svg'
      });
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 3000);
    } else {
      if (onTriggerSimulatedPush) {
        onTriggerSimulatedPush();
      }
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12141a]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#6ee7b7]" />
            <h2 className="text-base font-semibold text-white">Recordatorios Diarios & Push</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* Push status alert */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 to-[#12141a] border border-[#6ee7b7]/20 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${permissionState === 'granted' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Notificaciones Push Web
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {permissionState === 'granted'
                  ? 'Permisos activos. Recibirás avisos de ensayos y llamados en tu pantalla.'
                  : 'Habilita alertas del navegador o simula una notificación interna de producción.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {permissionState !== 'granted' && (
                <button
                  type="button"
                  onClick={requestPermission}
                  className="px-3 py-1.5 text-xs font-medium text-[#0f1115] bg-[#6ee7b7] hover:bg-[#5eead4] rounded-lg transition-colors shadow whitespace-nowrap cursor-pointer"
                >
                  Permiso Web
                </button>
              )}
              <button
                type="button"
                onClick={sendTestNotification}
                className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors shadow whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                <span>{notificationSent ? '¡Enviada!' : 'Simular Push'}</span>
              </button>
            </div>
          </div>

          {/* Daily Schedule List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#fbbf24]" />
                <span>Bandeja de Recordatorios ({reminders.length})</span>
              </h4>
              {onClearAll && reminders.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-[11px] text-[#6ee7b7] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Marcar todas leídas</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {reminders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#0f1115] rounded-xl border border-white/5">
                  No hay recordatorios pendientes para hoy.
                </div>
              ) : (
                reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                      rem.read
                        ? 'bg-[#0f1115]/60 border-white/5 opacity-70'
                        : 'bg-[#0f1115] border-[#6ee7b7]/30 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rem.read ? 'bg-slate-600' : 'bg-[#6ee7b7]'}`} />
                        <h5 className="text-xs font-semibold text-white">{rem.title}</h5>
                      </div>
                      <p className="text-[11px] text-slate-300">{rem.message}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{rem.date}</span>
                        <span>•</span>
                        <span className="uppercase">{rem.type}</span>
                      </div>
                    </div>

                    {!rem.read && onMarkAsRead && (
                      <button
                        onClick={() => onMarkAsRead(rem.id)}
                        title="Marcar como leída"
                        className="p-1.5 text-slate-400 hover:text-[#6ee7b7] hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Las notificaciones se sincronizan con la agenda general y los horarios de la Calculadora de Estrenos.
          </p>

        </div>

      </div>
    </div>
  );
};

