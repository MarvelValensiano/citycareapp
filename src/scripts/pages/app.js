import { getActiveRoute } from '../routes/url-parser';
import {
  generateAuthenticatedNavigationListTemplate,
  generateMainNavigationListTemplate,
  generateUnauthenticatedNavigationListTemplate,
} from '../templates';
import { setupSkipToContent, transitionHelper } from '../utils';
import { getAccessToken, getLogout } from '../utils/auth';
import { routes } from '../routes/routes';
import { setupPushNotificationButton } from '../utils/push-notification';

export default class App {
  #content;
  #drawerButton;
  #drawerNavigation;
  #skipLinkButton;

  constructor({ content, drawerNavigation, drawerButton, skipLinkButton }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#drawerNavigation = drawerNavigation;
    this.#skipLinkButton = skipLinkButton;

    this.#init();
  }

  #init() {
    setupSkipToContent(this.#skipLinkButton, this.#content);
    this.#setupDrawer();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#drawerNavigation.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      const isTargetInsideDrawer = this.#drawerNavigation.contains(event.target);
      const isTargetInsideButton = this.#drawerButton.contains(event.target);

      if (!(isTargetInsideDrawer || isTargetInsideButton)) {
        this.#drawerNavigation.classList.remove('open');
      }

      this.#drawerNavigation.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#drawerNavigation.classList.remove('open');
        }
      });
    });
  }

  async #setupNavigationList() {
    const isLogin = !!getAccessToken();
    const navListMain = this.#drawerNavigation.children.namedItem('navlist-main');
    const navList = this.#drawerNavigation.children.namedItem('navlist');

    // User not log in
    if (!isLogin) {
      navListMain.innerHTML = '';
      navList.innerHTML = generateUnauthenticatedNavigationListTemplate();
      // Pastikan kontainer tombol push notification dikosongkan jika tidak login
      const pushToolsContainer = document.getElementById('push-notification-tools');
      if (pushToolsContainer) {
        pushToolsContainer.innerHTML = '';
      }
      return;
    }

    navListMain.innerHTML = generateMainNavigationListTemplate();
    navList.innerHTML = generateAuthenticatedNavigationListTemplate();

    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', (event) => {
      event.preventDefault();

      if (confirm('Apakah Anda yakin ingin keluar?')) {
        getLogout();

        // Redirect
        location.hash = '/login';
      }
    });
    await setupPushNotificationButton();
  }

  async renderPage() {
    const url = getActiveRoute();
    const route = routes[url];
    const page = route ? route() : null; // Handle jika rute tidak ditemukan

    if (!page && url !== '/') { // Kriteria Opsional 3: Halaman Not Found
                               // Juga cek apakah bukan root, karena root mungkin halaman valid
        console.log(`No route found for ${url}. Rendering Not Found page.`);
        this.#content.innerHTML = `
          <section class="container" style="text-align: center; padding-top: 50px; min-height: 60vh;">
            <h1>404 - Halaman Tidak Ditemukan</h1>
            <p>Maaf, halaman yang Anda cari tidak ada.</p>
            <a href="#/" class="btn" style="margin-top: 20px;">Kembali ke Beranda</a>
          </section>
        `;
        await this.#setupNavigationList();
        return;
    }
    // Jika page null tapi url adalah '/' dan HomePage tidak terender karena auth-check,
    // itu akan di-redirect oleh checkAuthenticatedRoute.

    const transition = transitionHelper({
      updateDOM: async () => {
        if (page) { // Hanya render jika page ada
            this.#content.innerHTML = await page.render();
            if (page.afterRender) {
                await page.afterRender();
            }
        } else if (url === '/' && !getAccessToken()) {
            // Kasus khusus: jika halaman root dan tidak login, akan di-redirect oleh checkAuthenticatedRoute.
            // Biarkan checkAuthenticatedRoute yang menangani redirect ke /login.
            // Tidak perlu render apa-apa di sini karena akan ada redirect.
        } else if (page === null && url !=='/') {
            // Ini sudah ditangani oleh blok Not Found di atas.
        }
      },
    });

    transition.ready.catch(console.error);
    transition.updateCallbackDone.then(async () => {
      scrollTo({ top: 0, behavior: 'instant' });
      await this.#setupNavigationList();
    });
  }
}
