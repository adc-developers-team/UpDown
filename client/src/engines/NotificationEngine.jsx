import { useEffect, useRef } from 'react';
import { FiBell, FiInfo, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const icons = { info: FiInfo, warning: FiAlertCircle, success: FiCheckCircle, bell: FiBell };

const NotificationEngine = ({ notifications = [], onDismiss }) => {
  const audioRef = useRef(new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAC...'));

  useEffect(() => {
    if (notifications.length > 0) {
      audioRef.current.play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }, [notifications.length]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {notifications.map((notif, i) => {
        const Icon = icons[notif.type] || FiBell;
        return (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl shadow-lg border ${notif.type === 'success' ? 'bg-green-600/20 border-green-600 text-green-400' : notif.type === 'warning' ? 'bg-yellow-600/20 border-yellow-600 text-yellow-400' : 'bg-primary-dark/20 border-blue-600 text-primary'} animate-fade-in`}>
            <Icon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{notif.title}</p>
              {notif.body && <p className="text-xs opacity-80">{notif.body}</p>}
            </div>
            {onDismiss && <button onClick={() => onDismiss(notif.id)} className="opacity-60 hover:opacity-100">✕</button>}
          </div>
        );
      })}
    </div>
  );
};

export default NotificationEngine;
