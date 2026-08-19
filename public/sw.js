// Service Worker para Estoque Mobile Multi-Supermercado
// Permite funcionamento 100% offline mesmo ao recarregar a página (F5 ou abrir app sem conexão)

const CACHE_NAME = 'estoque-mobile-pwa-v3';

const ASSETS_PARA_CACHE_INICIAL = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
];

// Instalação do Service Worker: pré-armazena o shell da aplicação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(ASSETS_PARA_CACHE_INICIAL);
      } catch (err) {
        console.warn('Aviso ao pré-carregar assets no cache offline:', err);
      }
      return self.skipWaiting();
    })
  );
});

// Ativação: remove caches antigos e assume controle imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições:
// 1. Requisições de navegação (HTML / recarregamento de página): Network-first com fallback imediato para o cache do index.html
// 2. Scripts, CSS, imagens e fontes: Cache-first / Stale-While-Revalidate
// 3. APIs externas ou Firebase: Pass-through de rede
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar métodos que não sejam GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar chamadas da API local ou Firebase Firestore
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // 1. Requisições de Navegação (Recarregamento F5, PWA abrindo offline ou troca de rota)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Quando estiver OFFLINE, retorna o index.html em cache para carregar a aplicação React!
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const indexResponse = await caches.match('/index.html') || await caches.match('/');
          if (indexResponse) {
            return indexResponse;
          }
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Estoque Mobile</title></head><body><div id="root"></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Recursos Estáticos (JS, CSS, Fontes, Imagens)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Se já está no cache, retorna imediatamente e atualiza em segundo plano (Stale-While-Revalidate)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch((fetchErr) => {
          // Se falhar a rede e tiver em cache, o cachedResponse já resolve
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
