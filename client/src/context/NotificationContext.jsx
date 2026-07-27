import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext({
  notification: null,
  showNotification: () => {},   // ডিফল্ট ফাংশন, যাতে ডিস্ট্রাকচারিং ক্র্যাশ না করে
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return (
    <NotificationContext.Provider value={{ notification, showNotification }}>
      {children}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          notification.type === 'error' ? 'bg-red-500' : notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        }`}>
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  );
};
