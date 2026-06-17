self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Fica ouvindo o sinal chegar da nuvem
self.addEventListener('push', function(e) {
  const data = e.data ? e.data.json() : { title: 'Olimpo', body: 'Nova Notificação' };
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Faz o celular vibrar forte!
  };
  
  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Se a pessoa clicar na notificação, abre o app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
