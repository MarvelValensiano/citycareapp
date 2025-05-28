// CSS imports
import '../styles/styles.css';
import '../styles/responsives.css';
import 'tiny-slider/dist/tiny-slider.css';
import 'leaflet/dist/leaflet.css';

// Components
import App from './pages/app';
import Camera from './utils/camera'; //

// Fungsi untuk registrasi Service Worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Path ke service worker Anda (sw.js akan ada di root direktori 'dist')
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/', // Scope service worker
      });
      if (registration.installing) {
        console.log('Service worker: Installing');
      } else if (registration.waiting) {
        console.log('Service worker: Installed');
      } else if (registration.active) {
        console.log('Service worker: Active');
      }
      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      console.error(`Service Worker registration failed with ${error}`);
    }
  } else {
    console.log('Service Worker is not supported in this browser.');
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.getElementById('main-content'),
    drawerButton: document.getElementById('drawer-button'),
    drawerNavigation: document.getElementById('navigation-drawer'),
    skipLinkButton: document.getElementById('skip-link'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
    Camera.stopAllStreams(); //
  });

  // Daftarkan Service Worker setelah DOMContentLoaded dan render awal selesai
  await registerServiceWorker();
});