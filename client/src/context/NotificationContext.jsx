import { createContext, useContext, useEffect, useState } from 'react';

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const showNotification = (title, body, url = '/') => {
    if (!('Notification' in window)) return;

    // If permission not granted, try again
    if (Notification.permission !== 'granted') {
      requestPermission().then((newPerm) => {
        if (newPerm === 'granted') {
          createNotification(title, body, url);
        }
      });
    } else {
      createNotification(title, body, url);
    }
  };

  const createNotification = (title, body, url) => {
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
    // Ask permission on first user interaction (click anywhere)
    const handleClick = () => {
      if (Notification.permission === 'default') {
        requestPermission();
      }
      document.removeEventListener('click', handleClick);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
