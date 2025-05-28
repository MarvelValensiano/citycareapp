// src/sw-push-logic.js

// Event listener untuk push notification yang diterima
self.addEventListener('push', (event) => {
    console.log('[Service Worker - Push Logic] Push Received.');
    let notificationTitle = 'CityCare App';
    let notificationOptions = {
      body: 'Ada notifikasi baru!',
      icon: 'images/logo-192x192.png', // Pastikan path ini benar relatif terhadap root domain
      badge: 'images/logo-72x72.png',  // Buat ikon badge ini jika belum ada
      data: {
        url: '/', // URL default jika tidak ada data spesifik dari push
      },
    };
  
    if (event.data) {
      try {
        const payload = event.data.json();
        notificationTitle = payload.title || notificationTitle;
        notificationOptions.body = payload.body || notificationOptions.body;
        if (payload.icon) notificationOptions.icon = payload.icon; // API bisa mengirim path ikon
        if (payload.badge) notificationOptions.badge = payload.badge;
        if (payload.data && payload.data.url) notificationOptions.data.url = payload.data.url;
        // Anda bisa menambahkan actions, vibrate, dll. di sini dari payload
        // notificationOptions.actions = payload.actions || [];
        console.log('[Service Worker - Push Logic] Push data: ', payload);
      } catch (e) {
        console.error('[Service Worker - Push Logic] Error parsing push data json:', e);
        notificationOptions.body = event.data.text(); // Fallback ke teks biasa jika bukan JSON
      }
    }
  
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  });
  
  // Event listener untuk klik pada notifikasi
  self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker - Push Logic] Notification click Received.');
    event.notification.close();
  
    const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
    console.log('[Service Worker - Push Logic] Attempting to open URL:', urlToOpen);
  
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Cek apakah ada tab yang sudah terbuka dengan URL target
        // Perlu penyesuaian jika URL di client ada # hash
        const targetFullUrl = new URL(urlToOpen, self.location.origin).href;
  
        for (const client of clientList) {
          if (client.url === targetFullUrl && 'focus' in client) {
            return client.focus();
          }
          // Handle jika URL aplikasi menggunakan hash routing
          if (new URL(client.url).pathname === '/' && new URL(client.url).hash === `#${urlToOpen}` && 'focus' in client) {
              return client.focus();
          }
        }
        // Jika tidak ada, buka window baru
        if (clients.openWindow) {
          // Jika urlToOpen adalah path relatif (misal '#/reports/id'),
          // kita perlu menggabungkannya dengan origin.
          // Jika sudah absolut, tidak masalah.
          let absoluteUrlToOpen = urlToOpen;
          if (urlToOpen.startsWith('/#')) { // Khas untuk hash routing dari root
              absoluteUrlToOpen = new URL(urlToOpen.substring(1), self.location.origin).href;
          } else if (!urlToOpen.startsWith('http')) {
              absoluteUrlToOpen = new URL(urlToOpen, self.location.origin).href;
          }
          return clients.openWindow(absoluteUrlToOpen);
        }
      })
    );
  });