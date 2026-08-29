// Espera receber a notificação do Vercel
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/logo.png', // Foto que aparece na notificação
      badge: '/logo.png',
      vibrate: [300, 100, 300, 100, 300], // Comando para VIBRAR FORTE (3x)
      requireInteraction: true, // A notificação fica na tela até você puxar
    };

    // Dispara o som e a tela do celular
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Quando você clica na notificação, ele abre o aplicativo
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
