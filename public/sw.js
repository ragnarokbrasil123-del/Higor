// ============================================================
//  Service Worker do Clube Olimpo
//  1. Notificação push (o que já existia, intacto)
//  2. Cache para o app abrir com internet ruim na beira da piscina
// ============================================================

/**
 * SUBA ESTE NÚMERO sempre que trocar um arquivo de /public que mantém o
 * nome — logo, ícones, manifest. O `activate` apaga todo cache com nome
 * diferente deste, e é isso que descongela quem já tinha a versão antiga
 * guardada no aparelho.
 */
const CACHE = 'olimpo-v4';

// Casca mínima: o que precisa estar guardado para a tela não vir vazia.
const ESSENCIAL = ['/', '/manifest.json', '/logo.png', '/icon-192x192.png'];

// ---------------------------------------------------------------- push

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icon-192x192.png', // Foto que aparece na notificação
      badge: '/icon-192x192.png',
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

// ---------------------------------------------------------------- ciclo de vida

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ESSENCIAL))
      .catch(() => { /* sem rede na primeira visita: segue sem cache */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------- fetch

/**
 * REGRA DE OURO: o HTML nunca vem do cache primeiro.
 *
 * Guardar HTML e servir do cache é o que faz o navegador abrir uma página
 * antiga apontando para chunks de JavaScript que não existem mais depois
 * de um deploy — a tela branca com HTML 200 e JS 404. Por isso a navegação
 * é sempre rede primeiro, e o cache só entra quando a rede falha.
 *
 * O resto se divide em dois: arquivo com hash no nome pode vir do cache
 * sem medo; arquivo que mantém o nome (logo, ícones) precisa buscar a
 * versão nova em paralelo, senão congela na primeira que foi guardada.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POST/PUT/DELETE nunca passam por cache
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Só mexe no que é do próprio site. Supabase e outros domínios passam direto.
  if (url.origin !== self.location.origin) return;

  // Nada de API: os dados do aluno têm que ser sempre os de agora.
  if (url.pathname.startsWith('/api/')) return;

  // --- HTML: rede primeiro, cache como rede de segurança ---
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('/', copia)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  const guardavel = (resp) => resp && resp.status === 200 && resp.type === 'basic';
  const guardar = (chave, resp) => {
    const copia = resp.clone();
    caches.open(CACHE).then((c) => c.put(chave, copia)).catch(() => {});
  };

  // --- /_next/static/: cache primeiro, sem medo ---
  // O nome tem hash do conteúdo, então arquivo novo nunca reusa nome antigo.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then((emCache) => {
        if (emCache) return emCache;
        return fetch(req).then((resp) => {
          if (guardavel(resp)) guardar(req, resp);
          return resp;
        });
      })
    );
    return;
  }

  /**
   * --- Logo, ícones, manifest: serve do cache, mas busca a versão nova ---
   *
   * Estes MANTÊM o nome quando o conteúdo muda. Com cache-primeiro puro
   * ficavam congelados para sempre: trocamos a logo e o navegador seguiu
   * mostrando a antiga. Aqui a resposta sai do cache na hora (rápido) e
   * uma cópia fresca é baixada em paralelo, valendo na próxima abertura.
   */
  const midia = /\.(png|jpg|jpeg|svg|webp|ico|woff2?|json)$/i.test(url.pathname);

  if (midia) {
    event.respondWith(
      caches.match(req).then((emCache) => {
        const daRede = fetch(req)
          .then((resp) => {
            if (guardavel(resp)) guardar(req, resp);
            return resp;
          })
          .catch(() => emCache);
        return emCache || daRede;
      })
    );
  }
});
