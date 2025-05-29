import {
  generateCommentsListEmptyTemplate,
  generateCommentsListErrorTemplate,
  generateLoaderAbsoluteTemplate,
  generateRemoveReportButtonTemplate,
  generateReportCommentItemTemplate,
  generateReportDetailErrorTemplate,
  generateReportDetailTemplate,
  generateSaveReportButtonTemplate,
} from '../../templates';
import { createCarousel } from '../../utils';
import ReportDetailPresenter from './report-detail-presenter';
import { parseActivePathname } from '../../routes/url-parser';
import Map from '../../utils/map';
import * as CityCareAPI from '../../data/api';
import { getSubscription } from '../../utils/push-notification';

export default class ReportDetailPage {
  #presenter = null;
  #form = null;
  #map = null;

  async render() {
    return `
      <section>
        <div class="report-detail__container">
          <div id="report-detail" class="report-detail"></div>
          <div id="report-detail-loading-container"></div>
        </div>
      </section>
      
      
    `;
  }

  async afterRender() {
    this.#presenter = new ReportDetailPresenter(parseActivePathname().id, {
      view: this,
      apiModel: CityCareAPI,
    });

    this.#setupForm();

    await this.#presenter.showReportDetail();
    // await this.#presenter.getCommentsList();
  }

  async populateReportDetailAndInitialMap(message, report) {
    const reportDetailEl = document.getElementById('report-detail');
    if (reportDetailEl) {
      reportDetailEl.innerHTML = generateReportDetailTemplate({
        title: report.name,
        description: report.description,
        damageLevel: report.damageLevel,
        evidenceImages: report.photoUrl,
        location: report.location,
        reporterName: report.name,
        createdAt: report.createdAt,
      });
    }

    const imagesCarouselEl = document.getElementById('images');
    if (imagesCarouselEl) {
      createCarousel(imagesCarouselEl);
    }

    if (this.#presenter) {
      await this.#presenter.showReportDetailMap();
    }

    if (this.#map) {
      const reportCoordinate = [report.lat, report.lon];
      const markerOptions = { alt: report.title };
      const popupOptions = { content: report.title };

      this.#map.changeCamera(reportCoordinate);

      if (report.lat || report.lon)
        this.#map.addMarker(reportCoordinate, markerOptions, popupOptions);
    }

    this.addNotifyMeEventListener();
    if (this.#presenter) {
      await this.#presenter.showSaveButton();
    }
  }

  addNotifyMeEventListener() {
    const notifyButton = document.getElementById('report-detail-notify-me');
    if (notifyButton) {
      notifyButton.addEventListener('click', async () => {
        const reportId = parseActivePathname().id;
        if (!reportId) {
          alert('ID Laporan tidak ditemukan.');
          return;
        }

        const subscription = await getSubscription();
        if (!subscription) {
          alert(
            'Anda belum berlangganan notifikasi atau izin notifikasi diblokir. Silakan subscribe/cek izin dari menu navigasi atau pengaturan browser.',
          );
          return;
        }

        // Pengecekan VAPID_PUBLIC_KEY secara langsung di sini sudah dihapus.
        // Kita berasumsi jika `subscription` ada, maka VAPID key sudah benar di `push-notification.js`.
        // Jika VAPID key di push-notification.js kosong/salah, `subscribePush` akan gagal dan `getSubscription()` akan null.

        alert('Mencoba mengirim notifikasi untuk laporan ini...');
        // try {
        //   const response = await CityCareAPI.sendReportToMeViaNotification(reportId);
        //   if (response.ok) {
        //     alert('Permintaan notifikasi terkirim! Anda akan menerima notifikasi jika server berhasil memprosesnya.');
        //   } else {
        //     alert(`Gagal mengirim permintaan notifikasi: ${response.message}`);
        //   }
        // } catch (error) {
        //   alert(`Error saat mengirim permintaan notifikasi: ${error.message}`);
        //   console.error('Error sending notify me request:', error);
        // }
      });
    } else {
      console.warn("Tombol 'report-detail-notify-me' tidak ditemukan.");
    }
  }

  populateReportDetailError(message) {
    const reportDetailEl = document.getElementById('report-detail');
    if (reportDetailEl) {
      reportDetailEl.innerHTML = generateReportDetailErrorTemplate(message);
    }
  }

  populateReportDetailComments(message, comments) {
    const listContainer = document.getElementById('report-detail-comments-list');
    if (!listContainer) return;

    if (!comments || comments.length <= 0) {
      this.populateCommentsListEmpty();
      return;
    }

    const html = comments.reduce(
      (accumulator, comment) =>
        accumulator.concat(
          generateReportCommentItemTemplate({
            photoUrlCommenter: comment.commenter.photoUrl,
            nameCommenter: comment.commenter.name,
            body: comment.body,
          }),
        ),
      '',
    );

    listContainer.innerHTML = `<div class="report-detail__comments-list">${html}</div>`;
  }

  populateCommentsListEmpty() {
    const listContainer = document.getElementById('report-detail-comments-list');
    if (listContainer) {
      listContainer.innerHTML = generateCommentsListEmptyTemplate();
    }
  }

  populateCommentsListError(message) {
    const listContainer = document.getElementById('report-detail-comments-list');
    if (listContainer) {
      listContainer.innerHTML = generateCommentsListErrorTemplate(message);
    }
  }

  async initialMap() {
    const mapElement = document.querySelector('#map');
    if (mapElement) {
      this.#map = await Map.build('#map', {
        zoom: 15,
      });
    } else {
      console.warn('Elemen #map untuk peta tidak ditemukan saat initialMap dipanggil.');
    }
  }

  #setupForm() {
    this.#form = document.getElementById('comments-list-form');
    if (this.#form) {
      this.#form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = {
          body: this.#form.elements.namedItem('body').value,
        };
        if (this.#presenter) {
          await this.#presenter.postNewComment(data);
        }
      });
    }
  }

  postNewCommentSuccessfully(message) {
    console.log(message);
    if (this.#presenter) {
      this.#presenter.getCommentsList();
    }
    this.clearForm();
  }

  postNewCommentFailed(message) {
    alert(message);
  }

  clearForm() {
    if (this.#form) {
      this.#form.reset();
    }
  }

  renderSaveButton() {
    const container = document.getElementById('save-actions-container');
    if (container) {
      container.innerHTML = generateSaveReportButtonTemplate();
      const button = document.getElementById('report-detail-save');
      if (button && this.#presenter && typeof this.#presenter.handleSaveReport === 'function') {
        button.addEventListener('click', async () => {
          await this.#presenter.handleSaveReport();
        });
      } else if (button) {
        button.addEventListener('click', () => alert('Fungsi simpan sedang dikembangkan.'));
      }
    }
  }

  renderRemoveButton() {
    const container = document.getElementById('save-actions-container');
    if (container) {
      container.innerHTML = generateRemoveReportButtonTemplate();
      const button = document.getElementById('report-detail-remove');
      if (button && this.#presenter && typeof this.#presenter.handleRemoveReport === 'function') {
        button.addEventListener('click', async () => {
          await this.#presenter.handleRemoveReport();
        });
      } else if (button) {
        button.addEventListener('click', () =>
          alert('Fungsi hapus dari simpanan sedang dikembangkan.'),
        );
      }
    }
  }

  showReportDetailLoading() {
    const el = document.getElementById('report-detail-loading-container');
    if (el) el.innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideReportDetailLoading() {
    const el = document.getElementById('report-detail-loading-container');
    if (el) el.innerHTML = '';
  }

  showMapLoading() {
    const el = document.getElementById('map-loading-container');
    if (el) el.innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    const el = document.getElementById('map-loading-container');
    if (el) el.innerHTML = '';
  }

  showCommentsLoading() {
    const el = document.getElementById('comments-list-loading-container');
    if (el) el.innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideCommentsLoading() {
    const el = document.getElementById('comments-list-loading-container');
    if (el) el.innerHTML = '';
  }

  showSubmitLoadingButton() {
    const el = document.getElementById('submit-button-container');
    if (el)
      el.innerHTML = `
      <button class="btn" type="submit" disabled>
        <i class="fas fa-spinner loader-button"></i> Tanggapi
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    const el = document.getElementById('submit-button-container');
    if (el)
      el.innerHTML = `
      <button class="btn" type="submit">Tanggapi</button>
    `;
  }
}
