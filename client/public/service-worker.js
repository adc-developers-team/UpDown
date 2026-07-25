self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'New message',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'UpDown', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then((clientList) => {
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
