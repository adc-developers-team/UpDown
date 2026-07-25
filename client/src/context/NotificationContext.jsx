import { createContext, useContext, useEffect, useState } from 'react';

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const showNotification = (title, body, url = '/') => {
    if (permission !== 'granted') return;
    const notif = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      data: { url },
    });
    notif.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  };

  useEffect(() => {
    if (Notification.permission === 'default') {
      // ask on first load after a short delay
      const timer = setTimeout(() => requestPermission(), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
